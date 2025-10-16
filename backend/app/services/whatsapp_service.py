from typing import List, Dict, Any, Optional
from uuid import UUID
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation import Message
from app.repositories.whatsapp import WhatsAppNumberRepository
from app.schemas.whatsapp import WhatsAppNumberCreate, WhatsAppNumberUpdate, ConnectionType
from app.core.exceptions import ConflictException, NotFoundException
from app.integrations.evolution_api import EvolutionAPIClient, generate_instance_name, EvolutionAPIError
from app.utils.node_availability import NodeAvailability

logger = logging.getLogger(__name__)

class WhatsAppService:
    """Service for WhatsApp number management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WhatsAppNumberRepository(db)

    def _enrich_number_with_node_info(
        self,
        number: WhatsAppNumber
    ) -> WhatsAppNumber:
        """
        Enrich WhatsApp number with available node types and metadata.

        Args:
            number: WhatsAppNumber model instance

        Returns:
            WhatsAppNumber with available_node_types and node_metadata fields populated
        """
        connection_type = number.connection_type.value if hasattr(number.connection_type, 'value') else str(number.connection_type)

        # Get available nodes for this connection type
        available_nodes = NodeAvailability.get_available_nodes(connection_type)
        node_metadata = NodeAvailability.get_node_metadata(connection_type)

        # Add to model (these fields are in the schema)
        number.available_node_types = available_nodes
        number.node_metadata = node_metadata

        return number

    async def _trigger_chatbot(self, conversation, new_message):
        """
        Executa o fluxo do chatbot, processando node atual e avançando automaticamente.
        """
        from app.services.chatbot_service import ChatbotService
        from app.repositories.conversation import ConversationRepository
        from app.models.chatbot import Node
        from sqlalchemy import select

        if not conversation.active_chatbot_id:
            logger.warning("Nenhum chatbot ativo para a conversa.")
            return

        chatbot_service = ChatbotService(self.db)
        organization_id = conversation.organization_id
        chatbot_id = conversation.active_chatbot_id
        conv_repo = ConversationRepository(self.db)

        # Se não tem flow ativo, iniciar com main flow
        if not conversation.active_flow_id:
            main_flow = await chatbot_service.flow_repo.get_main_flow(chatbot_id, organization_id)
            if not main_flow:
                logger.warning(f"Nenhum fluxo principal encontrado para chatbot {chatbot_id}")
                return

            # Buscar start node
            start_node = await chatbot_service.node_repo.get_start_node(main_flow.id, organization_id)
            if not start_node:
                logger.warning(f"Nenhum nó inicial encontrado para o fluxo principal {main_flow.id}")
                return

            # Encontrar primeiro node com conteúdo seguindo edge
            canvas_data = main_flow.canvas_data or {}
            edges = canvas_data.get("edges", [])
            start_node_canvas_id = start_node.node_id
            next_node_canvas_id = None

            for edge in edges:
                if edge.get("source") == start_node_canvas_id:
                    next_node_canvas_id = edge.get("target")
                    break

            if not next_node_canvas_id:
                logger.warning(f"Nenhuma edge encontrada saindo do start node")
                return

            # Buscar próximo node
            stmt = select(Node).where(
                Node.flow_id == main_flow.id,
                Node.node_id == next_node_canvas_id,
                Node.organization_id == organization_id
            )
            result = await self.db.execute(stmt)
            first_node = result.scalar_one_or_none()

            if not first_node:
                logger.warning(f"Node {next_node_canvas_id} não encontrado no banco")
                return

            # Configurar flow e node inicial
            await conv_repo.update(conversation.id, {
                "active_flow_id": main_flow.id,
                "current_node_id": first_node.id
            })
            await self.db.commit()

            logger.info(f"🚀 Iniciando fluxo {main_flow.name} no node {first_node.node_type}")

            # Executar primeiro node
            await self._execute_node(conversation, first_node, main_flow, new_message)
        else:
            # Continuar fluxo - processar resposta do usuário e avançar
            if not conversation.current_node_id:
                logger.warning("Conversa tem flow ativo mas sem current_node_id")
                return

            # Buscar node atual
            current_node = await chatbot_service.node_repo.get(conversation.current_node_id)
            if not current_node:
                logger.warning(f"Node atual {conversation.current_node_id} não encontrado")
                return

            # Buscar flow
            flow = await chatbot_service.flow_repo.get(conversation.active_flow_id)
            if not flow:
                logger.warning(f"Flow {conversation.active_flow_id} não encontrado")
                return

            # Processar resposta do usuário e avançar
            await self._process_user_response_and_advance(conversation, current_node, flow, new_message)

    async def _execute_node(self, conversation, node, flow, incoming_message):
        """
        Executa um node do fluxo e envia mensagem via WhatsApp.

        Args:
            conversation: Instância da conversa
            node: Node a ser executado
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
        """
        from app.repositories.conversation import ConversationRepository
        import re

        logger.info(f"🎬 Executando node {node.node_type}: {node.label}")

        # Validar compatibilidade do node com o tipo de conexão WhatsApp
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)
        if whatsapp_number:
            connection_type = whatsapp_number.connection_type.value if hasattr(whatsapp_number.connection_type, 'value') else str(whatsapp_number.connection_type)
            is_available = NodeAvailability.is_node_available(node.node_type, connection_type)

            if not is_available:
                logger.error(
                    f"❌ Node '{node.node_type}' não está disponível para conexão '{connection_type}'. "
                    f"Este node requer Meta Cloud API (official)."
                )
                # Transferir para agente humano
                await self._execute_handoff(
                    conversation,
                    {
                        "transferMessage": (
                            "Desculpe, esta funcionalidade não está disponível "
                            "no momento. Vou transferir você para um agente humano."
                        ),
                        "sendTransferMessage": True,
                        "priority": "high"
                    }
                )
                return

            # Log warning for experimental nodes
            warning = NodeAvailability.get_node_warning(node.node_type, connection_type)
            if warning:
                logger.warning(f"⚠️ {warning}")

        # Extrair conteúdo baseado no tipo do node
        node_data = node.data or {}

        # CONDITION NODE: Avaliar condições e decidir próximo node
        if node.node_type == "condition":
            logger.info(f"🔀 Avaliando condições do Condition Node")
            result = await self._evaluate_conditions(conversation, node_data)
            # Avançar passando o resultado da condição (true/false)
            await self._advance_to_next_node(conversation, node, flow, incoming_message, condition_result=result)
            return

        # HANDOFF NODE: Transferir para agente humano
        if node.node_type == "handoff":
            logger.info(f"👤 Transferindo conversa para agente humano")
            await self._execute_handoff(conversation, node_data)
            return

        # DELAY NODE: Aguardar X segundos antes de avançar
        if node.node_type == "delay":
            logger.info(f"⏰ Executando Delay Node")
            await self._execute_delay(conversation, node, flow, incoming_message, node_data)
            return

        # JUMP NODE: Pular para outro node/flow
        if node.node_type == "jump":
            logger.info(f"🔀 Executando Jump Node")
            await self._execute_jump(conversation, node_data, incoming_message)
            return

        # ACTION NODE: Executar ações (webhook, salvar contato, atualizar variável)
        if node.node_type == "action":
            logger.info(f"⚡ Executando Action Node")
            await self._execute_action(conversation, node, flow, incoming_message, node_data)
            return

        # API CALL NODE: Fazer chamada HTTP e salvar resposta
        if node.node_type == "api_call":
            logger.info(f"🌐 Executando API Call Node")
            await self._execute_api_call(conversation, node, flow, incoming_message, node_data)
            return

        # AI PROMPT NODE: Interagir com modelos de IA
        if node.node_type == "ai_prompt":
            logger.info(f"🤖 Executando AI Prompt Node")
            await self._execute_ai_prompt(conversation, node, flow, incoming_message, node_data)
            return

        # DATABASE QUERY NODE: Consultar bancos de dados
        if node.node_type == "database_query":
            logger.info(f"💾 Executando Database Query Node")
            await self._execute_database_query(conversation, node, flow, incoming_message, node_data)
            return

        # SCRIPT NODE: Executar código Python customizado
        if node.node_type == "script":
            logger.info(f"📜 Executando Script Node")
            await self._execute_script(conversation, node, flow, incoming_message, node_data)
            return

        # SET VARIABLE NODE: Definir/atualizar variáveis do contexto
        if node.node_type == "set_variable":
            logger.info(f"🔧 Executando Set Variable Node")
            await self._execute_set_variable(conversation, node, flow, incoming_message, node_data)
            return

        # RANDOM NODE: Seleção aleatória de caminhos (A/B Testing)
        if node.node_type == "random":
            logger.info(f"🎲 Executando Random/A-B Testing Node")
            await self._execute_random(conversation, node, flow, incoming_message, node_data)
            return

        # DATE/TIME NODE: Manipulação de datas e horários
        if node.node_type == "datetime":
            logger.info(f"📅 Executando Date/Time Node")
            await self._execute_datetime(conversation, node, flow, incoming_message, node_data)
            return

        # WHATSAPP TEMPLATE NODE: Enviar template oficial do WhatsApp
        if node.node_type == "whatsapp_template":
            logger.info(f"📋 Executando WhatsApp Template Node")
            await self._execute_whatsapp_template(conversation, node, flow, incoming_message, node_data)
            return

        # INTERACTIVE BUTTONS NODE: Enviar botões interativos
        if node.node_type == "interactive_buttons":
            logger.info(f"🔘 Executando Interactive Buttons Node")
            await self._execute_interactive_buttons(conversation, node, flow, incoming_message, node_data)
            return

        # INTERACTIVE LIST NODE: Enviar lista/menu interativo
        if node.node_type == "interactive_list":
            logger.info(f"📝 Executando Interactive List Node")
            await self._execute_interactive_list(conversation, node, flow, incoming_message, node_data)
            return

        content_text = None

        if node.node_type == "question":
            content_text = node_data.get("questionText", "")
        elif node.node_type == "message":
            # Verificar se é mensagem de mídia
            media_type = node_data.get("mediaType")
            if media_type in ["image", "video", "document", "audio"]:
                logger.info(f"📎 Enviando mensagem de mídia: {media_type}")
                await self._send_media_message(conversation, node_data, media_type)
                # Avançar para próximo node após enviar mídia
                await self._advance_to_next_node(conversation, node, flow, incoming_message)
                return
            else:
                content_text = node_data.get("messageText", "")
        elif node.node_type == "end":
            content_text = node_data.get("farewellMessage", "")
        else:
            logger.warning(f"Node type {node.node_type} não suportado para envio de mensagem")
            return

        if not content_text:
            logger.warning(f"Node {node.node_id} não tem conteúdo para enviar")
            # Avançar para próximo node mesmo sem conteúdo
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Substituir variáveis no texto usando context_variables
        context_vars = conversation.context_variables or {}
        final_text = content_text

        # Encontrar todas as variáveis no formato {{variable_name}}
        variables = re.findall(r'\{\{(\w+)\}\}', content_text)
        for var_name in variables:
            if var_name in context_vars:
                var_value = context_vars[var_name]
                final_text = final_text.replace(f"{{{{{var_name}}}}}", str(var_value))
            else:
                logger.warning(f"Variável {{{{var_name}}}} não encontrada em context_variables")
                # Manter placeholder original se variável não existir

        logger.info(f"📤 Enviando mensagem: {final_text[:50]}...")

        # Enviar mensagem via WhatsApp
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

        if whatsapp_number.connection_type == "official":
            # Meta Cloud API
            from app.integrations.meta_api import MetaCloudAPI

            meta_api = MetaCloudAPI(
                phone_number_id=whatsapp_number.phone_number_id,
                access_token=whatsapp_number.access_token
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            # 🛡️ PROTEÇÃO: Retry automático de envio (até 3 tentativas)
            max_retries = 3
            retry_count = 0
            last_error = None

            while retry_count < max_retries:
                try:
                    response = await meta_api.send_text_message(
                        to=contact_whatsapp_id,
                        text=final_text
                    )

                    whatsapp_message_id = response.get("messages", [{}])[0].get("id")
                    logger.info(f"✅ Mensagem enviada via Meta API. ID: {whatsapp_message_id}")
                    break  # Sucesso - sair do loop

                except Exception as e:
                    retry_count += 1
                    last_error = e
                    logger.warning(f"⚠️ Erro ao enviar mensagem (tentativa {retry_count}/{max_retries}): {e}")

                    if retry_count < max_retries:
                        # Aguardar antes de tentar novamente (exponential backoff)
                        import asyncio
                        wait_time = 2 ** retry_count  # 2s, 4s, 8s
                        logger.info(f"⏳ Aguardando {wait_time}s antes de tentar novamente...")
                        await asyncio.sleep(wait_time)
                    else:
                        # Máximo de tentativas atingido
                        logger.error(f"❌ Falha após {max_retries} tentativas: {last_error}")
                        return

        elif whatsapp_number.connection_type == "qrcode":
            # Evolution API
            from app.integrations.evolution_api import EvolutionAPIClient

            evolution = EvolutionAPIClient(
                api_url=whatsapp_number.evolution_api_url,
                api_key=whatsapp_number.evolution_api_key
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            # 🛡️ PROTEÇÃO: Retry automático de envio (até 3 tentativas)
            max_retries = 3
            retry_count = 0
            last_error = None

            while retry_count < max_retries:
                try:
                    response = await evolution.send_text_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        text=final_text
                    )
                    logger.info(f"✅ Mensagem enviada via Evolution API")
                    break  # Sucesso - sair do loop

                except Exception as e:
                    retry_count += 1
                    last_error = e
                    logger.warning(f"⚠️ Erro ao enviar mensagem (tentativa {retry_count}/{max_retries}): {e}")

                    if retry_count < max_retries:
                        # Aguardar antes de tentar novamente (exponential backoff)
                        import asyncio
                        wait_time = 2 ** retry_count  # 2s, 4s, 8s
                        logger.info(f"⏳ Aguardando {wait_time}s antes de tentar novamente...")
                        await asyncio.sleep(wait_time)
                    else:
                        # Máximo de tentativas atingido
                        logger.error(f"❌ Falha após {max_retries} tentativas: {last_error}")
                        return

        # Salvar mensagem no banco
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        message_repo = MessageRepository(self.db)
        message_data = {
            "organization_id": conversation.organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "outbound",
            "sender_type": "bot",
            "message_type": "text",
            "content": {"text": final_text},
            "status": "sent",
            "sent_at": datetime.utcnow(),
        }
        await message_repo.create(message_data)
        await self.db.commit()

        # Se for node de pergunta, aguardar resposta do usuário
        if node.node_type == "question":
            logger.info(f"⏸️ Aguardando resposta do usuário para question node {node.node_id}")
            # Não avançar - esperar próxima mensagem do usuário
            return

        # Para message e end nodes, avançar automaticamente
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _process_user_response_and_advance(self, conversation, current_node, flow, user_message):
        """
        Processa resposta do usuário para um question node e avança para próximo node.
        Inclui validação de responseType e sistema de retry com maxAttempts.

        Args:
            conversation: Instância da conversa
            current_node: Node atual (deve ser tipo "question")
            flow: Flow ativo
            user_message: Mensagem do usuário
        """
        from app.repositories.conversation import ConversationRepository
        from datetime import datetime, timedelta

        logger.info(f"💬 Processando resposta do usuário para node {current_node.node_id}")

        # 🛡️ PROTEÇÃO: Timeout de resposta (1 hora)
        context_vars = conversation.context_variables or {}
        timeout_key = f"_question_timestamp_{current_node.node_id}"
        question_timestamp = context_vars.get(timeout_key)

        if not question_timestamp:
            # Primeira mensagem deste question node - salvar timestamp
            context_vars[timeout_key] = datetime.utcnow().isoformat()

            conv_repo = ConversationRepository(self.db)
            await conv_repo.update(conversation.id, {
                "context_variables": context_vars
            })
            await self.db.commit()
        else:
            # Verificar se passou mais de 1 hora
            question_time = datetime.fromisoformat(question_timestamp)
            elapsed = datetime.utcnow() - question_time

            if elapsed > timedelta(hours=1):
                logger.warning(f"⏰ Timeout de resposta! Passou {elapsed.total_seconds()//60:.0f} minutos")

                # Enviar mensagem de timeout
                timeout_msg = (
                    "O tempo para resposta expirou. "
                    "Vou encaminhar você para um agente humano."
                )
                await self._send_error_message(conversation, timeout_msg)

                # Limpar timestamp
                del context_vars[timeout_key]

                conv_repo = ConversationRepository(self.db)
                await conv_repo.update(conversation.id, {
                    "context_variables": context_vars
                })
                await self.db.commit()

                # Transferir para agente humano
                handoff_data = {
                    "transferMessage": "Transferência automática devido a timeout de resposta.",
                    "priority": "medium",
                    "sendTransferMessage": False  # Já enviamos mensagem acima
                }
                await self._execute_handoff(conversation, handoff_data)
                return

        # Extrair texto da resposta do usuário
        user_text = user_message.content.get("text", "").strip()

        if not user_text:
            logger.warning("Mensagem do usuário sem texto")
            return

        node_data = current_node.data or {}

        # VALIDAÇÃO: Verificar se resposta é válida baseado no responseType
        is_valid, error_message = await self._validate_user_response(user_text, node_data)

        if not is_valid:
            logger.warning(f"❌ Resposta inválida: {user_text} (esperado: {node_data.get('responseType')})")

            # Sistema de retry: verificar número de tentativas
            context_vars = conversation.context_variables or {}
            attempt_key = f"_attempts_{current_node.node_id}"
            attempts = context_vars.get(attempt_key, 0) + 1

            validation = node_data.get("validation", {})
            max_attempts = validation.get("maxAttempts", 3)

            logger.info(f"  Tentativa {attempts}/{max_attempts}")

            if attempts >= max_attempts:
                # Máximo de tentativas atingido - enviar mensagem final e avançar
                logger.warning(f"⚠️ Número máximo de tentativas ({max_attempts}) atingido")

                final_error_message = (
                    "Número máximo de tentativas excedido. "
                    "Continuando com o atendimento..."
                )

                await self._send_error_message(conversation, final_error_message)

                # Limpar contador de tentativas
                del context_vars[attempt_key]

                conv_repo = ConversationRepository(self.db)
                await conv_repo.update(conversation.id, {
                    "context_variables": context_vars
                })
                await self.db.commit()

                # Avançar para próximo node (sem salvar resposta inválida)
                await self._advance_to_next_node(conversation, current_node, flow, user_message)

            else:
                # Incrementar contador e enviar mensagem de erro
                context_vars[attempt_key] = attempts

                conv_repo = ConversationRepository(self.db)
                await conv_repo.update(conversation.id, {
                    "context_variables": context_vars
                })
                await self.db.commit()

                # Enviar mensagem de erro personalizada
                await self._send_error_message(conversation, error_message)

                # NÃO avançar - aguardar nova resposta do usuário

            return

        # Resposta válida - salvar e avançar
        logger.info(f"✅ Resposta válida: {user_text}")

        # Determinar nome da variável para salvar
        variable_name = node_data.get("outputVariable")

        if not variable_name:
            # Fallback: gerar nome baseado no node_id
            node_canvas_id = current_node.node_id
            variable_suffix = node_canvas_id.replace("node-", "")
            variable_name = f"user_response_{variable_suffix}"
            logger.warning(f"Node sem outputVariable, usando fallback: {variable_name}")

        logger.info(f"💾 Salvando resposta '{user_text}' na variável '{variable_name}'")

        # Atualizar context_variables
        context_vars = conversation.context_variables or {}
        context_vars[variable_name] = user_text

        # Limpar contador de tentativas (se existir)
        attempt_key = f"_attempts_{current_node.node_id}"
        if attempt_key in context_vars:
            del context_vars[attempt_key]

        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, current_node, flow, user_message)

    async def _advance_to_next_node(
        self,
        conversation,
        current_node,
        flow,
        incoming_message,
        condition_result: Optional[bool] = None
    ):
        """
        Avança para o próximo node seguindo as edges do canvas_data.

        Args:
            conversation: Instância da conversa
            current_node: Node atual
            flow: Flow ativo
            incoming_message: Mensagem que originou o avanço
            condition_result: Resultado de condição (True/False) para Condition Nodes
        """
        from app.repositories.conversation import ConversationRepository
        from app.models.chatbot import Node
        from sqlalchemy import select

        logger.info(f"➡️ Avançando do node {current_node.node_id}")

        # 🛡️ PROTEÇÃO: Detecção de loops infinitos
        context_vars = conversation.context_variables or {}
        path_key = "_execution_path"
        execution_path = context_vars.get(path_key, [])

        # Adicionar node atual ao caminho
        execution_path.append(current_node.node_id)

        # Verificar se node foi visitado mais de 10 vezes (loop infinito)
        visit_count = execution_path.count(current_node.node_id)
        if visit_count > 10:
            logger.error(f"🚫 Loop infinito detectado! Node {current_node.node_id} visitado {visit_count} vezes")

            # Enviar mensagem de erro
            error_msg = (
                "Desculpe, detectamos um problema no fluxo de atendimento. "
                "Um agente humano irá atendê-lo em breve."
            )
            await self._send_error_message(conversation, error_msg)

            # Transferir para agente humano
            handoff_data = {
                "transferMessage": "Transferência automática devido a loop infinito no fluxo.",
                "priority": "high",
                "sendTransferMessage": False  # Já enviamos mensagem acima
            }
            await self._execute_handoff(conversation, handoff_data)
            return

        # Limitar tamanho do caminho (guardar apenas últimos 50 nodes)
        if len(execution_path) > 50:
            execution_path = execution_path[-50:]

        # Atualizar caminho
        context_vars[path_key] = execution_path

        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        # Buscar próximo node nas edges
        canvas_data = flow.canvas_data or {}
        edges = canvas_data.get("edges", [])
        current_node_canvas_id = current_node.node_id
        next_node_canvas_id = None

        # Se for Condition Node, buscar edge baseado no resultado
        if condition_result is not None:
            target_label = "true" if condition_result else "false"
            logger.info(f"🔀 Buscando edge com label '{target_label}' para Condition Node")

            for edge in edges:
                if edge.get("source") == current_node_canvas_id:
                    edge_label = edge.get("label", "").lower()
                    # Também aceita "yes"/"no" como sinônimos
                    if (target_label == "true" and edge_label in ["true", "yes", "sim"]) or \
                       (target_label == "false" and edge_label in ["false", "no", "não"]):
                        next_node_canvas_id = edge.get("target")
                        logger.info(f"  ✅ Edge encontrada: {edge_label} → {next_node_canvas_id}")
                        break

            if not next_node_canvas_id:
                logger.error(
                    f"❌ Nenhuma edge com label '{target_label}' encontrada "
                    f"saindo do Condition Node {current_node_canvas_id}"
                )
                return

        else:
            # Fluxo normal: primeira edge encontrada
            for edge in edges:
                if edge.get("source") == current_node_canvas_id:
                    next_node_canvas_id = edge.get("target")
                    break

        if not next_node_canvas_id:
            logger.warning(f"⚠️ Nenhuma edge encontrada saindo do node {current_node_canvas_id}")

            # Se for end node, finalizar fluxo
            if current_node.node_type == "end":
                await self._finalize_flow(conversation)

            return

        # Buscar próximo node no banco
        stmt = select(Node).where(
            Node.flow_id == flow.id,
            Node.node_id == next_node_canvas_id,
            Node.organization_id == conversation.organization_id
        )
        result = await self.db.execute(stmt)
        next_node = result.scalar_one_or_none()

        if not next_node:
            logger.warning(f"❌ Node {next_node_canvas_id} não encontrado no banco")
            return

        # Atualizar current_node_id
        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "current_node_id": next_node.id
        })
        await self.db.commit()

        logger.info(f"✅ Avançado para node {next_node.node_type}: {next_node.label}")

        # Se for end node, finalizar após executar
        if next_node.node_type == "end":
            await self._execute_node(conversation, next_node, flow, incoming_message)
            await self._finalize_flow(conversation)
        else:
            # Executar próximo node
            await self._execute_node(conversation, next_node, flow, incoming_message)

    async def _finalize_flow(self, conversation):
        """
        Finaliza o fluxo do chatbot.

        Args:
            conversation: Instância da conversa
        """
        from app.repositories.conversation import ConversationRepository

        logger.info(f"🏁 Finalizando fluxo para conversa {conversation.id}")

        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "is_bot_active": False,
            "active_flow_id": None,
            "current_node_id": None,
        })
        await self.db.commit()

        logger.info(f"✅ Fluxo finalizado com sucesso")

    async def _evaluate_conditions(self, conversation, node_data) -> bool:
        """
        Avalia as condições de um Condition Node.

        Args:
            conversation: Instância da conversa (com context_variables)
            node_data: Dados do node (com campo "conditions")

        Returns:
            bool: True se condições forem satisfeitas, False caso contrário

        Formato esperado do node_data:
        {
            "conditions": [
                {
                    "variable": "user_response_edad",
                    "operator": ">=",
                    "value": "18"
                }
            ],
            "logicOperator": "AND"  # Opcional: AND (default) ou OR
        }
        """
        context_vars = conversation.context_variables or {}
        conditions = node_data.get("conditions", [])
        logic_operator = node_data.get("logicOperator", "AND").upper()

        if not conditions:
            logger.warning("Condition Node sem condições definidas, retornando False")
            return False

        logger.info(f"🔍 Avaliando {len(conditions)} condição(ões) com lógica {logic_operator}")

        results = []

        for condition in conditions:
            var_name = condition.get("variable")
            operator = condition.get("operator")
            expected_value = condition.get("value")

            if not var_name or not operator:
                logger.warning(f"Condição inválida (sem variable ou operator): {condition}")
                results.append(False)
                continue

            # Obter valor da variável
            var_value = context_vars.get(var_name)

            if var_value is None:
                logger.warning(f"Variável '{var_name}' não encontrada em context_variables")
                results.append(False)
                continue

            # Converter valores para comparação
            # Tentar converter para número se possível
            try:
                var_value_num = float(var_value)
                expected_value_num = float(expected_value)
                use_numeric = True
            except (ValueError, TypeError):
                var_value_str = str(var_value).strip().lower()
                expected_value_str = str(expected_value).strip().lower()
                use_numeric = False

            # Avaliar operador
            condition_result = False

            try:
                if operator == "==":
                    if use_numeric:
                        condition_result = var_value_num == expected_value_num
                    else:
                        condition_result = var_value_str == expected_value_str

                elif operator == "!=":
                    if use_numeric:
                        condition_result = var_value_num != expected_value_num
                    else:
                        condition_result = var_value_str != expected_value_str

                elif operator == ">":
                    if use_numeric:
                        condition_result = var_value_num > expected_value_num
                    else:
                        logger.warning(f"Operador '>' requer valores numéricos")
                        condition_result = False

                elif operator == "<":
                    if use_numeric:
                        condition_result = var_value_num < expected_value_num
                    else:
                        logger.warning(f"Operador '<' requer valores numéricos")
                        condition_result = False

                elif operator == ">=":
                    if use_numeric:
                        condition_result = var_value_num >= expected_value_num
                    else:
                        logger.warning(f"Operador '>=' requer valores numéricos")
                        condition_result = False

                elif operator == "<=":
                    if use_numeric:
                        condition_result = var_value_num <= expected_value_num
                    else:
                        logger.warning(f"Operador '<=' requer valores numéricos")
                        condition_result = False

                elif operator == "contains":
                    # Sempre string
                    condition_result = expected_value_str in var_value_str

                else:
                    logger.warning(f"Operador desconhecido: {operator}")
                    condition_result = False

                logger.info(
                    f"  Condição: {var_name} ({var_value}) {operator} {expected_value} "
                    f"= {condition_result}"
                )

            except Exception as e:
                logger.error(f"Erro ao avaliar condição: {e}")
                condition_result = False

            results.append(condition_result)

        # Aplicar lógica AND/OR
        if logic_operator == "AND":
            final_result = all(results)
        elif logic_operator == "OR":
            final_result = any(results)
        else:
            logger.warning(f"Operador lógico desconhecido: {logic_operator}, usando AND")
            final_result = all(results)

        logger.info(f"✅ Resultado final das condições: {final_result}")

        return final_result

    async def _execute_handoff(self, conversation, node_data):
        """
        Executa transferência de conversa para agente humano (Handoff Node).

        Args:
            conversation: Instância da conversa
            node_data: Dados do Handoff Node

        Formato esperado do node_data:
        {
            "transferMessage": "Transferindo para um agente...",  # Opcional
            "sendTransferMessage": true,  # Opcional (default: true)
            "queueId": "uuid-da-fila",    # Opcional
            "priority": "medium"          # Opcional: low, medium, high, urgent
        }
        """
        from app.repositories.conversation import ConversationRepository

        logger.info(f"👤 Executando handoff para conversa {conversation.id}")

        # Extrair configurações
        send_transfer_message = node_data.get("sendTransferMessage", True)
        transfer_message = node_data.get("transferMessage", "Transferindo para um agente humano...")
        queue_id = node_data.get("queueId")
        priority = node_data.get("priority", "medium")

        # Enviar mensagem de transferência (se configurado)
        if send_transfer_message and transfer_message:
            whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

            if whatsapp_number.connection_type == "official":
                # Meta Cloud API
                from app.integrations.meta_api import MetaCloudAPI

                meta_api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token
                )

                contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

                try:
                    await meta_api.send_text_message(
                        to=contact_whatsapp_id,
                        text=transfer_message
                    )
                    logger.info(f"✅ Mensagem de transferência enviada via Meta API")
                except Exception as e:
                    logger.error(f"❌ Erro ao enviar mensagem de transferência: {e}")

            elif whatsapp_number.connection_type == "qrcode":
                # Evolution API
                from app.integrations.evolution_api import EvolutionAPIClient

                evolution = EvolutionAPIClient(
                    api_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key
                )

                contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

                try:
                    await evolution.send_text_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        text=transfer_message
                    )
                    logger.info(f"✅ Mensagem de transferência enviada via Evolution API")
                except Exception as e:
                    logger.error(f"❌ Erro ao enviar mensagem de transferência: {e}")

            # Salvar mensagem no banco
            from app.repositories.conversation import MessageRepository
            from datetime import datetime

            message_repo = MessageRepository(self.db)
            message_data = {
                "organization_id": conversation.organization_id,
                "conversation_id": conversation.id,
                "whatsapp_number_id": whatsapp_number.id,
                "direction": "outbound",
                "sender_type": "bot",
                "message_type": "text",
                "content": {"text": transfer_message},
                "status": "sent",
                "sent_at": datetime.utcnow(),
            }
            await message_repo.create(message_data)
            await self.db.commit()

        # Atualizar conversa: desativar bot e colocar na fila
        conv_repo = ConversationRepository(self.db)

        update_data = {
            "is_bot_active": False,
            "status": "queued",
            "priority": priority,
        }

        if queue_id:
            update_data["assigned_queue_id"] = queue_id

        await conv_repo.update(conversation.id, update_data)
        await self.db.commit()

        logger.info(
            f"✅ Handoff completo: conversa {conversation.id} "
            f"transferida para fila (prioridade: {priority})"
        )

        # Finalizar fluxo do bot
        await self._finalize_flow(conversation)

    async def _validate_user_response(self, user_text: str, node_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Valida a resposta do usuário baseado no responseType do Question Node.

        Args:
            user_text: Texto da resposta do usuário
            node_data: Dados do Question Node (com responseType e validation)

        Returns:
            tuple: (is_valid, error_message)
                - is_valid: True se resposta é válida, False caso contrário
                - error_message: Mensagem de erro (None se válido)

        Tipos suportados:
            - text: Qualquer texto (sempre válido)
            - number: Apenas números (inteiros ou decimais)
            - email: Formato de email válido
            - phone: Formato de telefone válido (mínimo 10 dígitos)
            - options: Escolha múltipla (deve estar na lista de opções)
        """
        import re

        response_type = node_data.get("responseType", "text")
        validation = node_data.get("validation", {})
        is_required = validation.get("required", True)
        custom_error_message = validation.get("errorMessage")

        # Verificar se campo é obrigatório e está vazio
        if is_required and not user_text.strip():
            return False, custom_error_message or "Por favor, digite uma resposta."

        # Se não é obrigatório e está vazio, aceitar
        if not is_required and not user_text.strip():
            return True, None

        # Validar baseado no tipo
        if response_type == "text":
            # Texto sempre válido (se não vazio)
            return True, None

        elif response_type == "options":
            # Validar se resposta está na lista de opções
            options = node_data.get("options", [])

            if not options:
                logger.warning("Question Node com responseType 'options' mas sem opções definidas")
                return True, None  # Aceitar qualquer resposta se não há opções

            # Normalizar resposta do usuário (lowercase, sem espaços)
            user_normalized = user_text.strip().lower()

            # Verificar se resposta corresponde a alguma opção (por valor ou label)
            for option in options:
                option_value = str(option.get("value", "")).strip().lower()
                option_label = str(option.get("label", "")).strip().lower()

                if user_normalized == option_value or user_normalized == option_label:
                    return True, None

            # Resposta não encontrada nas opções
            options_text = ", ".join([f"'{opt.get('label')}'" for opt in options if opt.get('label')])
            default_error = f"Por favor, escolha uma das opções: {options_text}"

            return False, custom_error_message or default_error

        elif response_type == "number":
            # Verificar se é número
            try:
                float(user_text.strip().replace(",", "."))
                return True, None
            except ValueError:
                return False, custom_error_message or "Por favor, digite um número válido."

        elif response_type == "email":
            # Validação básica de email
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if re.match(email_pattern, user_text.strip()):
                return True, None
            else:
                return False, custom_error_message or "Por favor, digite um e-mail válido."

        elif response_type == "phone":
            # Remover caracteres especiais e validar telefone
            phone_digits = re.sub(r'\D', '', user_text)

            if len(phone_digits) >= 10:  # Mínimo 10 dígitos (DDD + número)
                return True, None
            else:
                return False, custom_error_message or "Por favor, digite um telefone válido."

        else:
            # Tipo desconhecido - aceitar como text
            logger.warning(f"Tipo de resposta desconhecido: {response_type}, aceitando como texto")
            return True, None

    async def _send_error_message(self, conversation, error_text: str):
        """
        Envia mensagem de erro para o usuário via WhatsApp.

        Args:
            conversation: Instância da conversa
            error_text: Texto da mensagem de erro
        """
        logger.info(f"📮 Enviando mensagem de erro: {error_text}")

        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

        if whatsapp_number.connection_type == "official":
            # Meta Cloud API
            from app.integrations.meta_api import MetaCloudAPI

            meta_api = MetaCloudAPI(
                phone_number_id=whatsapp_number.phone_number_id,
                access_token=whatsapp_number.access_token
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            try:
                await meta_api.send_text_message(
                    to=contact_whatsapp_id,
                    text=error_text
                )
                logger.info(f"✅ Mensagem de erro enviada via Meta API")
            except Exception as e:
                logger.error(f"❌ Erro ao enviar mensagem de erro: {e}")
                return

        elif whatsapp_number.connection_type == "qrcode":
            # Evolution API
            from app.integrations.evolution_api import EvolutionAPIClient

            evolution = EvolutionAPIClient(
                api_url=whatsapp_number.evolution_api_url,
                api_key=whatsapp_number.evolution_api_key
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            try:
                await evolution.send_text_message(
                    instance_name=whatsapp_number.evolution_instance_name,
                    to=contact_whatsapp_id,
                    text=error_text
                )
                logger.info(f"✅ Mensagem de erro enviada via Evolution API")
            except Exception as e:
                logger.error(f"❌ Erro ao enviar mensagem de erro: {e}")
                return

        # Salvar mensagem no banco
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        message_repo = MessageRepository(self.db)
        message_data = {
            "organization_id": conversation.organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "outbound",
            "sender_type": "bot",
            "message_type": "text",
            "content": {"text": error_text},
            "status": "sent",
            "sent_at": datetime.utcnow(),
        }
        await message_repo.create(message_data)
        await self.db.commit()

    async def _execute_delay(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa um Delay Node - aguarda X segundos antes de avançar para o próximo node.

        Args:
            conversation: Instância da conversa
            node: Node atual (Delay)
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
            node_data: Dados do Delay Node

        Formato esperado do node_data:
        {
            "delaySeconds": 5,  # Tempo em segundos (padrão: 3)
            "delayMessage": "Aguarde um momento..."  # Opcional
        }
        """
        import asyncio

        logger.info(f"⏰ Executando Delay Node")

        # Extrair configurações
        delay_seconds = node_data.get("delaySeconds", 3)
        delay_message = node_data.get("delayMessage")

        # Validar delay (máximo 60 segundos para evitar bloqueios)
        if delay_seconds > 60:
            logger.warning(f"Delay de {delay_seconds}s reduzido para 60s (máximo permitido)")
            delay_seconds = 60

        # Enviar mensagem de espera (opcional)
        if delay_message:
            whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

            if whatsapp_number.connection_type == "official":
                from app.integrations.meta_api import MetaCloudAPI
                meta_api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token
                )
                contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

                try:
                    await meta_api.send_text_message(to=contact_whatsapp_id, text=delay_message)
                    logger.info(f"✅ Mensagem de delay enviada via Meta API")
                except Exception as e:
                    logger.error(f"❌ Erro ao enviar mensagem de delay: {e}")

            elif whatsapp_number.connection_type == "qrcode":
                from app.integrations.evolution_api import EvolutionAPIClient
                evolution = EvolutionAPIClient(
                    api_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key
                )
                contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

                try:
                    await evolution.send_text_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        text=delay_message
                    )
                    logger.info(f"✅ Mensagem de delay enviada via Evolution API")
                except Exception as e:
                    logger.error(f"❌ Erro ao enviar mensagem de delay: {e}")

            # Salvar mensagem no banco
            from app.repositories.conversation import MessageRepository
            from datetime import datetime

            message_repo = MessageRepository(self.db)
            message_data = {
                "organization_id": conversation.organization_id,
                "conversation_id": conversation.id,
                "whatsapp_number_id": whatsapp_number.id,
                "direction": "outbound",
                "sender_type": "bot",
                "message_type": "text",
                "content": {"text": delay_message},
                "status": "sent",
                "sent_at": datetime.utcnow(),
            }
            await message_repo.create(message_data)
            await self.db.commit()

        # Aguardar o delay
        logger.info(f"⏳ Aguardando {delay_seconds} segundos...")
        await asyncio.sleep(delay_seconds)
        logger.info(f"✅ Delay de {delay_seconds}s concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_jump(self, conversation, node_data, incoming_message):
        """
        Executa um Jump Node - pula para outro node ou flow.

        Args:
            conversation: Instância da conversa
            node_data: Dados do Jump Node
            incoming_message: Mensagem que originou a execução

        Formato esperado do node_data:
        {
            "jumpType": "node",  # "node" ou "flow"
            "targetNodeId": "node-message-abc123",  # Se jumpType = "node"
            "targetFlowId": "uuid-do-flow"  # Se jumpType = "flow"
        }
        """
        from app.services.chatbot_service import ChatbotService
        from app.repositories.conversation import ConversationRepository
        from app.models.chatbot import Node
        from sqlalchemy import select

        logger.info(f"🔀 Executando Jump Node")

        jump_type = node_data.get("jumpType", "node")
        chatbot_service = ChatbotService(self.db)
        conv_repo = ConversationRepository(self.db)

        if jump_type == "node":
            # Pular para node específico no flow atual
            target_node_canvas_id = node_data.get("targetNodeId")

            if not target_node_canvas_id:
                logger.error("❌ Jump Node sem targetNodeId configurado")
                return

            # Buscar node no flow atual
            stmt = select(Node).where(
                Node.flow_id == conversation.active_flow_id,
                Node.node_id == target_node_canvas_id,
                Node.organization_id == conversation.organization_id
            )
            result = await self.db.execute(stmt)
            target_node = result.scalar_one_or_none()

            if not target_node:
                logger.error(f"❌ Node {target_node_canvas_id} não encontrado no flow atual")
                return

            # Atualizar current_node_id
            await conv_repo.update(conversation.id, {
                "current_node_id": target_node.id
            })
            await self.db.commit()

            logger.info(f"✅ Jump para node {target_node.node_type}: {target_node.label}")

            # Buscar flow atual
            flow = await chatbot_service.flow_repo.get(conversation.active_flow_id)

            # Executar node de destino
            await self._execute_node(conversation, target_node, flow, incoming_message)

        elif jump_type == "flow":
            # Pular para outro flow
            target_flow_id = node_data.get("targetFlowId")

            if not target_flow_id:
                logger.error("❌ Jump Node sem targetFlowId configurado")
                return

            # Buscar flow de destino
            target_flow = await chatbot_service.flow_repo.get(target_flow_id)

            if not target_flow or target_flow.organization_id != conversation.organization_id:
                logger.error(f"❌ Flow {target_flow_id} não encontrado")
                return

            # Buscar start node do novo flow
            start_node = await chatbot_service.node_repo.get_start_node(
                target_flow.id,
                conversation.organization_id
            )

            if not start_node:
                logger.error(f"❌ Start node não encontrado no flow {target_flow.name}")
                return

            # Encontrar primeiro node real (seguindo edge do start)
            canvas_data = target_flow.canvas_data or {}
            edges = canvas_data.get("edges", [])
            next_node_canvas_id = None

            for edge in edges:
                if edge.get("source") == start_node.node_id:
                    next_node_canvas_id = edge.get("target")
                    break

            if not next_node_canvas_id:
                logger.error(f"❌ Nenhuma edge encontrada saindo do start node")
                return

            # Buscar próximo node
            stmt = select(Node).where(
                Node.flow_id == target_flow.id,
                Node.node_id == next_node_canvas_id,
                Node.organization_id == conversation.organization_id
            )
            result = await self.db.execute(stmt)
            first_node = result.scalar_one_or_none()

            if not first_node:
                logger.error(f"❌ Node {next_node_canvas_id} não encontrado")
                return

            # Atualizar flow e node
            await conv_repo.update(conversation.id, {
                "active_flow_id": target_flow.id,
                "current_node_id": first_node.id
            })
            await self.db.commit()

            logger.info(f"✅ Jump para flow {target_flow.name}, node {first_node.node_type}")

            # Executar primeiro node do novo flow
            await self._execute_node(conversation, first_node, target_flow, incoming_message)

        else:
            logger.error(f"❌ Tipo de jump desconhecido: {jump_type}")

    async def _send_media_message(self, conversation, node_data, media_type: str):
        """
        Envia mensagem de mídia (imagem, vídeo, documento, áudio) via WhatsApp.

        Args:
            conversation: Instância da conversa
            node_data: Dados do Message Node
            media_type: Tipo de mídia (image, video, document, audio)

        Formato esperado do node_data:
        {
            "mediaType": "image",  # image, video, document, audio
            "mediaUrl": "https://example.com/image.jpg",  # URL da mídia
            "caption": "Legenda da imagem"  # Opcional
        }
        """
        logger.info(f"📎 Enviando mensagem de mídia: {media_type}")

        media_url = node_data.get("mediaUrl")
        caption = node_data.get("caption", "")

        if not media_url:
            logger.error(f"❌ Media URL não configurada para {media_type}")
            return

        # Substituir variáveis na URL e caption
        import re
        context_vars = conversation.context_variables or {}

        # Substituir variáveis no URL
        variables = re.findall(r'\{\{(\w+)\}\}', media_url)
        for var_name in variables:
            if var_name in context_vars:
                media_url = media_url.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))

        # Substituir variáveis no caption
        if caption:
            variables = re.findall(r'\{\{(\w+)\}\}', caption)
            for var_name in variables:
                if var_name in context_vars:
                    caption = caption.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))

        # Enviar via WhatsApp
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

        if whatsapp_number.connection_type == "official":
            # Meta Cloud API
            from app.integrations.meta_api import MetaCloudAPI

            meta_api = MetaCloudAPI(
                phone_number_id=whatsapp_number.phone_number_id,
                access_token=whatsapp_number.access_token
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            try:
                if media_type == "image":
                    response = await meta_api.send_image_message(
                        to=contact_whatsapp_id,
                        image_url=media_url,
                        caption=caption
                    )
                elif media_type == "video":
                    response = await meta_api.send_video_message(
                        to=contact_whatsapp_id,
                        video_url=media_url,
                        caption=caption
                    )
                elif media_type == "document":
                    filename = node_data.get("filename", "document.pdf")
                    response = await meta_api.send_document_message(
                        to=contact_whatsapp_id,
                        document_url=media_url,
                        filename=filename,
                        caption=caption
                    )
                elif media_type == "audio":
                    response = await meta_api.send_audio_message(
                        to=contact_whatsapp_id,
                        audio_url=media_url
                    )
                else:
                    logger.error(f"❌ Tipo de mídia não suportado: {media_type}")
                    return

                logger.info(f"✅ Mensagem de {media_type} enviada via Meta API")

            except Exception as e:
                logger.error(f"❌ Erro ao enviar {media_type} via Meta API: {e}")
                return

        elif whatsapp_number.connection_type == "qrcode":
            # Evolution API
            from app.integrations.evolution_api import EvolutionAPIClient

            evolution = EvolutionAPIClient(
                api_url=whatsapp_number.evolution_api_url,
                api_key=whatsapp_number.evolution_api_key
            )

            contact_whatsapp_id = conversation.contact.whatsapp_id.replace("+", "")

            try:
                if media_type == "image":
                    await evolution.send_media_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        media_type="image",
                        media_url=media_url,
                        caption=caption
                    )
                elif media_type == "video":
                    await evolution.send_media_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        media_type="video",
                        media_url=media_url,
                        caption=caption
                    )
                elif media_type == "document":
                    filename = node_data.get("filename", "document.pdf")
                    await evolution.send_media_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        media_type="document",
                        media_url=media_url,
                        caption=caption,
                        filename=filename
                    )
                elif media_type == "audio":
                    await evolution.send_media_message(
                        instance_name=whatsapp_number.evolution_instance_name,
                        to=contact_whatsapp_id,
                        media_type="audio",
                        media_url=media_url
                    )
                else:
                    logger.error(f"❌ Tipo de mídia não suportado: {media_type}")
                    return

                logger.info(f"✅ Mensagem de {media_type} enviada via Evolution API")

            except Exception as e:
                logger.error(f"❌ Erro ao enviar {media_type} via Evolution API: {e}")
                return

        # Salvar mensagem no banco
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        message_repo = MessageRepository(self.db)
        message_data = {
            "organization_id": conversation.organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "outbound",
            "sender_type": "bot",
            "message_type": media_type,
            "content": {
                media_type: {"url": media_url},
                "caption": caption
            },
            "status": "sent",
            "sent_at": datetime.utcnow(),
        }
        await message_repo.create(message_data)
        await self.db.commit()

    async def _execute_action(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa um Action Node - realiza ações automatizadas no fluxo.

        Args:
            conversation: Instância da conversa
            node: Node atual (Action)
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
            node_data: Dados do Action Node

        Formato esperado do node_data:
        {
            "actions": [
                {
                    "type": "webhook",  # webhook, save_contact, update_variable
                    "config": {
                        # Configuração específica de cada tipo de ação
                    }
                }
            ]
        }
        """
        import httpx
        import re
        from app.repositories.conversation import ConversationRepository
        from app.repositories.contact import ContactRepository

        logger.info(f"⚡ Executando Action Node")

        actions = node_data.get("actions", [])

        if not actions:
            logger.warning("Action Node sem ações configuradas")
            # Avançar para próximo node mesmo sem ações
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        context_vars = conversation.context_variables or {}

        # Executar cada ação sequencialmente
        for idx, action in enumerate(actions):
            action_type = action.get("type")
            config = action.get("config", {})

            logger.info(f"  Ação {idx+1}/{len(actions)}: {action_type}")

            try:
                if action_type == "webhook":
                    # Executar webhook HTTP
                    url = config.get("url")
                    method = config.get("method", "POST").upper()
                    headers = config.get("headers", {})
                    body = config.get("body", {})
                    timeout_seconds = config.get("timeout", 30)

                    if not url:
                        logger.error("❌ Webhook sem URL configurada")
                        continue

                    # Substituir variáveis na URL
                    variables = re.findall(r'\{\{(\w+)\}\}', url)
                    for var_name in variables:
                        if var_name in context_vars:
                            url = url.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))

                    # Substituir variáveis no body (se for string)
                    if isinstance(body, str):
                        variables = re.findall(r'\{\{(\w+)\}\}', body)
                        for var_name in variables:
                            if var_name in context_vars:
                                body = body.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))
                    elif isinstance(body, dict):
                        # Substituir variáveis nos valores do dict
                        for key, value in body.items():
                            if isinstance(value, str):
                                variables = re.findall(r'\{\{(\w+)\}\}', value)
                                for var_name in variables:
                                    if var_name in context_vars:
                                        body[key] = value.replace(
                                            f"{{{{{var_name}}}}}",
                                            str(context_vars[var_name])
                                        )

                    logger.info(f"  📡 Chamando webhook: {method} {url}")

                    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                        if method == "GET":
                            response = await client.get(url, headers=headers)
                        elif method == "POST":
                            response = await client.post(url, headers=headers, json=body)
                        elif method == "PUT":
                            response = await client.put(url, headers=headers, json=body)
                        elif method == "DELETE":
                            response = await client.delete(url, headers=headers)
                        else:
                            logger.error(f"❌ Método HTTP não suportado: {method}")
                            continue

                    logger.info(f"  ✅ Webhook respondeu: {response.status_code}")

                    # Salvar resposta em variável (se configurado)
                    response_var = config.get("saveResponseTo")
                    if response_var:
                        try:
                            response_data = response.json()
                            context_vars[response_var] = response_data
                            logger.info(f"  💾 Resposta salva em '{response_var}'")
                        except Exception as e:
                            logger.warning(f"  ⚠️ Erro ao parsear resposta JSON: {e}")
                            context_vars[response_var] = response.text

                elif action_type == "save_contact":
                    # Salvar/atualizar informações do contato
                    contact_repo = ContactRepository(self.db)
                    contact = conversation.contact

                    contact_updates = {}

                    # Mapear campos configurados
                    field_mappings = config.get("fields", {})

                    for field_name, variable_name in field_mappings.items():
                        if variable_name in context_vars:
                            value = context_vars[variable_name]

                            # Mapear campos conhecidos
                            if field_name == "name":
                                contact_updates["name"] = value
                            elif field_name == "email":
                                contact_updates["email"] = value
                            elif field_name == "phone":
                                contact_updates["phone"] = value
                            elif field_name == "company":
                                contact_updates["company"] = value
                            elif field_name == "position":
                                contact_updates["position"] = value
                            else:
                                # Campos customizados vão para custom_fields
                                if "custom_fields" not in contact_updates:
                                    contact_updates["custom_fields"] = contact.custom_fields or {}
                                contact_updates["custom_fields"][field_name] = value

                    if contact_updates:
                        await contact_repo.update(contact.id, contact_updates)
                        logger.info(f"  ✅ Contato atualizado: {list(contact_updates.keys())}")
                    else:
                        logger.warning("  ⚠️ Nenhum campo para atualizar no contato")

                elif action_type == "update_variable":
                    # Atualizar/criar variável no contexto
                    variable_name = config.get("variableName")
                    variable_value = config.get("value")
                    operation = config.get("operation", "set")  # set, append, increment

                    if not variable_name:
                        logger.error("❌ update_variable sem variableName configurado")
                        continue

                    # Substituir variáveis no valor
                    if isinstance(variable_value, str):
                        variables = re.findall(r'\{\{(\w+)\}\}', variable_value)
                        for var_name in variables:
                            if var_name in context_vars:
                                variable_value = variable_value.replace(
                                    f"{{{{{var_name}}}}}",
                                    str(context_vars[var_name])
                                )

                    if operation == "set":
                        context_vars[variable_name] = variable_value
                        logger.info(f"  ✅ Variável '{variable_name}' definida como: {variable_value}")

                    elif operation == "append":
                        current_value = context_vars.get(variable_name, "")
                        context_vars[variable_name] = str(current_value) + str(variable_value)
                        logger.info(
                            f"  ✅ Variável '{variable_name}' concatenada: {context_vars[variable_name]}"
                        )

                    elif operation == "increment":
                        try:
                            current_value = float(context_vars.get(variable_name, 0))
                            increment_by = float(variable_value)
                            context_vars[variable_name] = current_value + increment_by
                            logger.info(
                                f"  ✅ Variável '{variable_name}' incrementada: {context_vars[variable_name]}"
                            )
                        except (ValueError, TypeError) as e:
                            logger.error(f"❌ Erro ao incrementar variável: {e}")

                else:
                    logger.warning(f"⚠️ Tipo de ação desconhecido: {action_type}")

            except Exception as e:
                logger.error(f"❌ Erro ao executar ação {action_type}: {e}")
                # Continuar com próximas ações mesmo se uma falhar

        # Salvar context_variables atualizadas
        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        logger.info(f"✅ Action Node concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_api_call(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa um API Call Node - faz chamadas HTTP para APIs externas e salva resposta.

        Args:
            conversation: Instância da conversa
            node: Node atual (API Call)
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
            node_data: Dados do API Call Node

        Formato esperado do node_data:
        {
            "url": "https://api.example.com/users/{{user_id}}",
            "method": "GET",  # GET, POST, PUT, DELETE, PATCH
            "headers": {
                "Authorization": "Bearer token123",
                "Content-Type": "application/json"
            },
            "queryParams": {
                "limit": "10",
                "offset": "0"
            },
            "body": {
                "name": "{{user_name}}",
                "email": "{{user_email}}"
            },
            "timeout": 30,  # Segundos (padrão: 30)
            "responseVariable": "api_response",  # Nome da variável para salvar resposta
            "errorHandling": {
                "onError": "continue",  # continue, stop, retry
                "maxRetries": 3,
                "retryDelay": 2,
                "fallbackValue": null
            }
        }
        """
        import httpx
        import re
        import json
        from app.repositories.conversation import ConversationRepository

        logger.info(f"🌐 Executando API Call Node")

        # Extrair configurações
        url = node_data.get("url")
        method = node_data.get("method", "GET").upper()
        headers = node_data.get("headers", {})
        query_params = node_data.get("queryParams", {})
        body = node_data.get("body")
        timeout_seconds = node_data.get("timeout", 30)
        response_variable = node_data.get("responseVariable", "api_response")
        error_handling = node_data.get("errorHandling", {})

        if not url:
            logger.error("❌ API Call sem URL configurada")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        context_vars = conversation.context_variables or {}

        # Substituir variáveis na URL
        final_url = url
        variables = re.findall(r'\{\{(\w+)\}\}', url)
        for var_name in variables:
            if var_name in context_vars:
                final_url = final_url.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))

        # Substituir variáveis nos query params
        final_query_params = {}
        for key, value in query_params.items():
            if isinstance(value, str):
                variables = re.findall(r'\{\{(\w+)\}\}', value)
                for var_name in variables:
                    if var_name in context_vars:
                        value = value.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))
            final_query_params[key] = value

        # Substituir variáveis nos headers
        final_headers = {}
        for key, value in headers.items():
            if isinstance(value, str):
                variables = re.findall(r'\{\{(\w+)\}\}', value)
                for var_name in variables:
                    if var_name in context_vars:
                        value = value.replace(f"{{{{{var_name}}}}}", str(context_vars[var_name]))
            final_headers[key] = value

        # Substituir variáveis no body
        final_body = None
        if body is not None:
            if isinstance(body, str):
                # Body como string (JSON ou texto)
                variables = re.findall(r'\{\{(\w+)\}\}', body)
                final_body = body
                for var_name in variables:
                    if var_name in context_vars:
                        final_body = final_body.replace(
                            f"{{{{{var_name}}}}}",
                            str(context_vars[var_name])
                        )
                # Tentar parsear como JSON
                try:
                    final_body = json.loads(final_body)
                except:
                    pass  # Manter como string se não for JSON válido

            elif isinstance(body, dict):
                # Body como objeto - substituir variáveis nos valores
                final_body = {}
                for key, value in body.items():
                    if isinstance(value, str):
                        variables = re.findall(r'\{\{(\w+)\}\}', value)
                        for var_name in variables:
                            if var_name in context_vars:
                                value = value.replace(
                                    f"{{{{{var_name}}}}}",
                                    str(context_vars[var_name])
                                )
                    final_body[key] = value

        # Configurar retry
        on_error = error_handling.get("onError", "continue")
        max_retries = error_handling.get("maxRetries", 1)
        retry_delay = error_handling.get("retryDelay", 2)
        fallback_value = error_handling.get("fallbackValue")

        retry_count = 0
        last_error = None

        logger.info(f"  📡 {method} {final_url}")
        if final_query_params:
            logger.info(f"  🔍 Query Params: {final_query_params}")
        if final_body:
            logger.info(f"  📦 Body: {json.dumps(final_body) if isinstance(final_body, dict) else final_body}")

        # Tentar fazer a chamada (com retry se configurado)
        while retry_count < max_retries:
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    if method == "GET":
                        response = await client.get(
                            final_url,
                            headers=final_headers,
                            params=final_query_params
                        )
                    elif method == "POST":
                        response = await client.post(
                            final_url,
                            headers=final_headers,
                            params=final_query_params,
                            json=final_body if isinstance(final_body, dict) else None,
                            content=final_body if isinstance(final_body, str) else None
                        )
                    elif method == "PUT":
                        response = await client.put(
                            final_url,
                            headers=final_headers,
                            params=final_query_params,
                            json=final_body if isinstance(final_body, dict) else None,
                            content=final_body if isinstance(final_body, str) else None
                        )
                    elif method == "PATCH":
                        response = await client.patch(
                            final_url,
                            headers=final_headers,
                            params=final_query_params,
                            json=final_body if isinstance(final_body, dict) else None,
                            content=final_body if isinstance(final_body, str) else None
                        )
                    elif method == "DELETE":
                        response = await client.delete(
                            final_url,
                            headers=final_headers,
                            params=final_query_params
                        )
                    else:
                        logger.error(f"❌ Método HTTP não suportado: {method}")
                        await self._advance_to_next_node(conversation, node, flow, incoming_message)
                        return

                # Verificar status code
                response.raise_for_status()

                logger.info(f"  ✅ API respondeu: {response.status_code}")

                # Parsear resposta
                try:
                    response_data = response.json()
                    logger.info(f"  📥 Resposta JSON recebida")
                except:
                    response_data = response.text
                    logger.info(f"  📥 Resposta em texto recebida")

                # Salvar resposta em variável
                context_vars[response_variable] = response_data
                logger.info(f"  💾 Resposta salva em '{response_variable}'")

                # Sucesso - sair do loop de retry
                break

            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(
                    f"  ⚠️ Erro HTTP {e.response.status_code}: {e.response.text[:100]}"
                )

            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"  ⏰ Timeout na chamada da API")

            except Exception as e:
                last_error = e
                logger.warning(f"  ❌ Erro na chamada da API: {str(e)}")

            # Incrementar contador de retry
            retry_count += 1

            if retry_count < max_retries:
                import asyncio
                logger.info(f"  🔄 Tentando novamente ({retry_count}/{max_retries})...")
                await asyncio.sleep(retry_delay)
            else:
                # Esgotou tentativas
                logger.error(f"  ❌ Falha após {max_retries} tentativas")

                # Aplicar estratégia de erro
                if on_error == "stop":
                    logger.info(f"  🛑 Parando fluxo devido a erro")
                    # Transferir para agente humano
                    from app.repositories.conversation import ConversationRepository
                    conv_repo = ConversationRepository(self.db)
                    await conv_repo.update(conversation.id, {
                        "is_bot_active": False,
                        "status": "queued",
                        "priority": "high"
                    })
                    await self.db.commit()
                    return

                elif on_error == "continue":
                    logger.info(f"  ➡️ Continuando fluxo apesar do erro")
                    if fallback_value is not None:
                        context_vars[response_variable] = fallback_value
                        logger.info(f"  💾 Valor fallback salvo em '{response_variable}'")

        # Salvar context_variables atualizadas
        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        logger.info(f"✅ API Call Node concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_ai_prompt(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa um AI Prompt Node - interage com modelos de IA (GPT, Claude, etc.).

        Args:
            conversation: Instância da conversa
            node: Node atual (AI Prompt)
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
            node_data: Dados do AI Prompt Node

        Formato esperado do node_data:
        {
            "provider": "openai",  # openai, anthropic, custom
            "model": "gpt-4",  # gpt-4, gpt-3.5-turbo, claude-3-opus, etc.
            "prompt": "Classifique o seguinte problema: {{user_message}}",
            "systemPrompt": "Você é um assistente de atendimento ao cliente.",  # Opcional
            "temperature": 0.7,  # 0.0 - 1.0 (padrão: 0.7)
            "maxTokens": 500,  # Máximo de tokens na resposta (padrão: 500)
            "responseVariable": "ai_response",  # Variável para salvar resposta
            "apiKey": "{{openai_api_key}}",  # API key (pode usar variável)
            "timeout": 60,  # Timeout em segundos (padrão: 60)
            "errorHandling": {
                "onError": "continue",  # continue, stop
                "fallbackValue": "Não foi possível processar"
            }
        }
        """
        import httpx
        import re
        import json
        from app.repositories.conversation import ConversationRepository

        logger.info(f"🤖 Executando AI Prompt Node")

        # Extrair configurações
        provider = node_data.get("provider", "openai")
        model = node_data.get("model", "gpt-3.5-turbo")
        prompt = node_data.get("prompt")
        system_prompt = node_data.get("systemPrompt")
        temperature = node_data.get("temperature", 0.7)
        max_tokens = node_data.get("maxTokens", 500)
        response_variable = node_data.get("responseVariable", "ai_response")
        api_key = node_data.get("apiKey")
        timeout_seconds = node_data.get("timeout", 60)
        error_handling = node_data.get("errorHandling", {})

        if not prompt:
            logger.error("❌ AI Prompt Node sem prompt configurado")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        if not api_key:
            logger.error("❌ AI Prompt Node sem API key configurada")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        context_vars = conversation.context_variables or {}

        # Substituir variáveis no prompt
        final_prompt = prompt
        variables = re.findall(r'\{\{(\w+)\}\}', prompt)
        for var_name in variables:
            if var_name in context_vars:
                final_prompt = final_prompt.replace(
                    f"{{{{{var_name}}}}}",
                    str(context_vars[var_name])
                )

        # Substituir variáveis no system prompt
        final_system_prompt = system_prompt
        if system_prompt:
            variables = re.findall(r'\{\{(\w+)\}\}', system_prompt)
            for var_name in variables:
                if var_name in context_vars:
                    final_system_prompt = final_system_prompt.replace(
                        f"{{{{{var_name}}}}}",
                        str(context_vars[var_name])
                    )

        # Substituir variáveis na API key
        final_api_key = api_key
        variables = re.findall(r'\{\{(\w+)\}\}', api_key)
        for var_name in variables:
            if var_name in context_vars:
                final_api_key = final_api_key.replace(
                    f"{{{{{var_name}}}}}",
                    str(context_vars[var_name])
                )

        # Configurar error handling
        on_error = error_handling.get("onError", "continue")
        fallback_value = error_handling.get("fallbackValue")

        logger.info(f"  🔮 Provider: {provider}")
        logger.info(f"  🎯 Model: {model}")
        logger.info(f"  💬 Prompt: {final_prompt[:100]}...")

        try:
            # Chamar API baseado no provider
            if provider == "openai":
                ai_response = await self._call_openai(
                    model=model,
                    prompt=final_prompt,
                    system_prompt=final_system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    api_key=final_api_key,
                    timeout=timeout_seconds
                )

            elif provider == "anthropic":
                ai_response = await self._call_anthropic(
                    model=model,
                    prompt=final_prompt,
                    system_prompt=final_system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    api_key=final_api_key,
                    timeout=timeout_seconds
                )

            elif provider == "custom":
                # Para APIs customizadas (compatíveis com formato OpenAI)
                custom_url = node_data.get("customUrl")
                if not custom_url:
                    raise ValueError("Custom provider requer 'customUrl' configurado")

                ai_response = await self._call_custom_ai(
                    url=custom_url,
                    model=model,
                    prompt=final_prompt,
                    system_prompt=final_system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    api_key=final_api_key,
                    timeout=timeout_seconds
                )

            else:
                logger.error(f"❌ Provider não suportado: {provider}")
                raise ValueError(f"Provider não suportado: {provider}")

            # Salvar resposta em variável
            context_vars[response_variable] = ai_response
            logger.info(f"  ✅ Resposta da IA: {ai_response[:100]}...")
            logger.info(f"  💾 Resposta salva em '{response_variable}'")

        except Exception as e:
            logger.error(f"  ❌ Erro ao chamar IA: {str(e)}")

            # Aplicar estratégia de erro
            if on_error == "stop":
                logger.info(f"  🛑 Parando fluxo devido a erro")
                # Transferir para agente humano
                conv_repo = ConversationRepository(self.db)
                await conv_repo.update(conversation.id, {
                    "is_bot_active": False,
                    "status": "queued",
                    "priority": "high"
                })
                await self.db.commit()
                return

            elif on_error == "continue":
                logger.info(f"  ➡️ Continuando fluxo apesar do erro")
                if fallback_value is not None:
                    context_vars[response_variable] = fallback_value
                    logger.info(f"  💾 Valor fallback salvo em '{response_variable}'")

        # Salvar context_variables atualizadas
        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        logger.info(f"✅ AI Prompt Node concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _call_openai(
        self, model: str, prompt: str, system_prompt: str, temperature: float,
        max_tokens: int, api_key: str, timeout: int
    ) -> str:
        """Chama OpenAI API (GPT-3.5, GPT-4, etc.)"""
        import httpx

        url = "https://api.openai.com/v1/chat/completions"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"]

    async def _call_anthropic(
        self, model: str, prompt: str, system_prompt: str, temperature: float,
        max_tokens: int, api_key: str, timeout: int
    ) -> str:
        """Chama Anthropic API (Claude)"""
        import httpx

        url = "https://api.anthropic.com/v1/messages"

        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        if system_prompt:
            payload["system"] = system_prompt

        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        return data["content"][0]["text"]

    async def _call_custom_ai(
        self, url: str, model: str, prompt: str, system_prompt: str,
        temperature: float, max_tokens: int, api_key: str, timeout: int
    ) -> str:
        """Chama API customizada (compatível com formato OpenAI)"""
        import httpx

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"]

    async def _execute_database_query(
        self, conversation, node, flow, incoming_message, node_data
    ):
        """
        Executa um Database Query Node - consulta bancos de dados externos.

        Args:
            conversation: Instância da conversa
            node: Node atual (Database Query)
            flow: Flow ativo
            incoming_message: Mensagem que originou a execução
            node_data: Dados do Database Query Node

        Formato esperado do node_data:
        {
            "databaseType": "postgresql",  # postgresql, mysql, mongodb, sqlite
            "connectionString": "{{db_connection_string}}",  # Connection string
            "query": "SELECT * FROM products WHERE category = {{category}}",
            "parameters": {  # Opcional: parâmetros para query preparada
                "category": "{{product_category}}"
            },
            "resultVariable": "query_result",  # Variável para salvar resultado
            "resultFormat": "list",  # list (padrão), first, count, scalar
            "timeout": 30,  # Timeout em segundos
            "errorHandling": {
                "onError": "continue",  # continue, stop
                "fallbackValue": []
            }
        }
        """
        import re
        import json
        from app.repositories.conversation import ConversationRepository

        logger.info(f"💾 Executando Database Query Node")

        # Extrair configurações
        db_type = node_data.get("databaseType", "postgresql")
        connection_string = node_data.get("connectionString")
        query = node_data.get("query")
        parameters = node_data.get("parameters", {})
        result_variable = node_data.get("resultVariable", "query_result")
        result_format = node_data.get("resultFormat", "list")
        timeout_seconds = node_data.get("timeout", 30)
        error_handling = node_data.get("errorHandling", {})

        if not connection_string:
            logger.error("❌ Database Query Node sem connection string configurada")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        if not query:
            logger.error("❌ Database Query Node sem query configurada")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        context_vars = conversation.context_variables or {}

        # Substituir variáveis na connection string
        final_connection_string = connection_string
        variables = re.findall(r'\{\{(\w+)\}\}', connection_string)
        for var_name in variables:
            if var_name in context_vars:
                final_connection_string = final_connection_string.replace(
                    f"{{{{{var_name}}}}}",
                    str(context_vars[var_name])
                )

        # Substituir variáveis na query
        final_query = query
        variables = re.findall(r'\{\{(\w+)\}\}', query)
        for var_name in variables:
            if var_name in context_vars:
                final_query = final_query.replace(
                    f"{{{{{var_name}}}}}",
                    str(context_vars[var_name])
                )

        # Substituir variáveis nos parâmetros
        final_parameters = {}
        for key, value in parameters.items():
            if isinstance(value, str):
                variables = re.findall(r'\{\{(\w+)\}\}', value)
                for var_name in variables:
                    if var_name in context_vars:
                        value = value.replace(
                            f"{{{{{var_name}}}}}",
                            str(context_vars[var_name])
                        )
            final_parameters[key] = value

        # Configurar error handling
        on_error = error_handling.get("onError", "continue")
        fallback_value = error_handling.get("fallbackValue", [])

        logger.info(f"  🗄️ Database Type: {db_type}")
        logger.info(f"  📝 Query: {final_query[:100]}...")
        if final_parameters:
            logger.info(f"  🔧 Parameters: {final_parameters}")

        try:
            # Executar query baseado no tipo de banco
            if db_type == "postgresql":
                result = await self._query_postgresql(
                    final_connection_string,
                    final_query,
                    final_parameters,
                    timeout_seconds
                )

            elif db_type == "mysql":
                result = await self._query_mysql(
                    final_connection_string,
                    final_query,
                    final_parameters,
                    timeout_seconds
                )

            elif db_type == "mongodb":
                result = await self._query_mongodb(
                    final_connection_string,
                    final_query,
                    final_parameters,
                    timeout_seconds
                )

            elif db_type == "sqlite":
                result = await self._query_sqlite(
                    final_connection_string,
                    final_query,
                    final_parameters,
                    timeout_seconds
                )

            else:
                logger.error(f"❌ Tipo de banco não suportado: {db_type}")
                raise ValueError(f"Tipo de banco não suportado: {db_type}")

            # Formatar resultado baseado em resultFormat
            formatted_result = self._format_query_result(result, result_format)

            # Salvar resultado em variável
            context_vars[result_variable] = formatted_result
            logger.info(f"  ✅ Query executada com sucesso")
            logger.info(f"  📊 Resultado: {len(result)} linha(s)")
            logger.info(f"  💾 Resultado salvo em '{result_variable}'")

        except Exception as e:
            logger.error(f"  ❌ Erro ao executar query: {str(e)}")

            # Aplicar estratégia de erro
            if on_error == "stop":
                logger.info(f"  🛑 Parando fluxo devido a erro")
                # Transferir para agente humano
                conv_repo = ConversationRepository(self.db)
                await conv_repo.update(conversation.id, {
                    "is_bot_active": False,
                    "status": "queued",
                    "priority": "high"
                })
                await self.db.commit()
                return

            elif on_error == "continue":
                logger.info(f"  ➡️ Continuando fluxo apesar do erro")
                context_vars[result_variable] = fallback_value
                logger.info(f"  💾 Valor fallback salvo em '{result_variable}'")

        # Salvar context_variables atualizadas
        conv_repo = ConversationRepository(self.db)
        await conv_repo.update(conversation.id, {
            "context_variables": context_vars
        })
        await self.db.commit()

        logger.info(f"✅ Database Query Node concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _query_postgresql(
        self, connection_string: str, query: str, parameters: dict, timeout: int
    ) -> list:
        """Executa query no PostgreSQL"""
        import asyncpg

        conn = await asyncpg.connect(connection_string, timeout=timeout)
        try:
            if parameters:
                # Query com parâmetros nomeados
                rows = await conn.fetch(query, *parameters.values())
            else:
                rows = await conn.fetch(query)

            # Converter para lista de dicts
            return [dict(row) for row in rows]
        finally:
            await conn.close()

    async def _query_mysql(
        self, connection_string: str, query: str, parameters: dict, timeout: int
    ) -> list:
        """Executa query no MySQL"""
        import aiomysql
        from urllib.parse import urlparse, parse_qs

        # Parsear connection string
        parsed = urlparse(connection_string)

        conn = await aiomysql.connect(
            host=parsed.hostname,
            port=parsed.port or 3306,
            user=parsed.username,
            password=parsed.password,
            db=parsed.path.lstrip('/'),
            connect_timeout=timeout
        )

        try:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                if parameters:
                    await cursor.execute(query, list(parameters.values()))
                else:
                    await cursor.execute(query)

                rows = await cursor.fetchall()
                return rows
        finally:
            conn.close()

    async def _query_mongodb(
        self, connection_string: str, query: str, parameters: dict, timeout: int
    ) -> list:
        """Executa query no MongoDB"""
        from motor.motor_asyncio import AsyncIOMotorClient
        import json

        client = AsyncIOMotorClient(
            connection_string,
            serverSelectionTimeoutMS=timeout * 1000
        )

        try:
            # Parsear query JSON
            query_obj = json.loads(query)

            # Extrair database e collection
            db_name = query_obj.get("database")
            collection_name = query_obj.get("collection")
            filter_query = query_obj.get("filter", {})
            projection = query_obj.get("projection")
            limit_val = query_obj.get("limit")

            if not db_name or not collection_name:
                raise ValueError("MongoDB query deve ter 'database' e 'collection'")

            db = client[db_name]
            collection = db[collection_name]

            # Executar query
            cursor = collection.find(filter_query, projection)

            if limit_val:
                cursor = cursor.limit(limit_val)

            results = await cursor.to_list(length=None)

            # Converter ObjectId para string
            for doc in results:
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])

            return results
        finally:
            client.close()

    async def _query_sqlite(
        self, connection_string: str, query: str, parameters: dict, timeout: int
    ) -> list:
        """Executa query no SQLite (usando aiosqlite)"""
        import aiosqlite

        # Remover prefixo sqlite:/// se existir
        db_path = connection_string.replace("sqlite:///", "")

        async with aiosqlite.connect(db_path, timeout=timeout) as db:
            db.row_factory = aiosqlite.Row

            if parameters:
                cursor = await db.execute(query, list(parameters.values()))
            else:
                cursor = await db.execute(query)

            rows = await cursor.fetchall()

            # Converter para lista de dicts
            return [dict(row) for row in rows]

    def _format_query_result(self, result: list, result_format: str) -> any:
        """Formata resultado da query baseado no formato solicitado"""
        if result_format == "list":
            # Retorna lista completa (padrão)
            return result

        elif result_format == "first":
            # Retorna apenas primeiro resultado
            return result[0] if result else None

        elif result_format == "count":
            # Retorna quantidade de resultados
            return len(result)

        elif result_format == "scalar":
            # Retorna primeiro valor da primeira linha
            if result and len(result) > 0:
                first_row = result[0]
                if isinstance(first_row, dict):
                    # Pegar primeiro valor do dict
                    return list(first_row.values())[0] if first_row else None
                else:
                    return first_row
            return None

        else:
            # Formato desconhecido, retorna lista
            return result

    async def _execute_script(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Script Node - Roda código Python customizado para transformação de dados

        Node Data Format:
        {
            "language": "python",  # Apenas Python suportado no backend
            "code": "return int(user_age) >= 18",
            "inputVariables": ["user_age"],  # Opcional: lista de variáveis que o script usa
            "outputVariable": "is_adult",
            "timeout": 5,  # Segundos (padrão: 5)
            "errorHandling": {
                "onError": "continue",  # continue ou stop
                "fallbackValue": null
            }
        }
        """
        from app.repositories.conversation import ConversationRepository
        import asyncio
        import json

        logger.info(f"📜 Executando Script Node")

        conv_repo = ConversationRepository(self.db)

        # Extrair configurações
        language = node_data.get("language", "python")
        code = node_data.get("code", "")
        input_variables = node_data.get("inputVariables", [])
        output_variable = node_data.get("outputVariable")
        timeout = node_data.get("timeout", 5)
        error_handling = node_data.get("errorHandling", {})
        on_error = error_handling.get("onError", "continue")
        fallback_value = error_handling.get("fallbackValue")

        # Validações
        if not code:
            logger.error("❌ Script Node sem código definido")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        if language != "python":
            logger.warning(f"⚠️ Linguagem '{language}' não suportada. Apenas Python é suportado no backend.")
            if on_error == "stop":
                await self._execute_handoff(
                    conversation,
                    {
                        "transferMessage": "Erro ao processar script. Transferindo para agente.",
                        "sendTransferMessage": True,
                        "priority": "high"
                    }
                )
                return
            else:
                # Continue com fallback
                if output_variable and fallback_value is not None:
                    context_vars = conversation.context_variables or {}
                    context_vars[output_variable] = fallback_value
                    await conv_repo.update(conversation.id, {"context_variables": context_vars})
                await self._advance_to_next_node(conversation, node, flow, incoming_message)
                return

        # Obter variáveis do contexto
        context_vars = conversation.context_variables or {}

        # Preparar namespace para execução do script
        # Criar namespace seguro com apenas variáveis necessárias
        script_namespace = {
            # Bibliotecas Python padrão permitidas
            '__builtins__': {
                'abs': abs,
                'all': all,
                'any': any,
                'bool': bool,
                'dict': dict,
                'enumerate': enumerate,
                'filter': filter,
                'float': float,
                'int': int,
                'len': len,
                'list': list,
                'map': map,
                'max': max,
                'min': min,
                'range': range,
                'reversed': reversed,
                'round': round,
                'sorted': sorted,
                'str': str,
                'sum': sum,
                'tuple': tuple,
                'zip': zip,
                'True': True,
                'False': False,
                'None': None,
            },
            # Adicionar variáveis do contexto
            **context_vars
        }

        # Logs
        logger.info(f"  📝 Código Python ({len(code)} caracteres)")
        logger.info(f"  🔧 Timeout: {timeout}s")
        if input_variables:
            logger.info(f"  📥 Variáveis de entrada: {input_variables}")
        if output_variable:
            logger.info(f"  📤 Variável de saída: {output_variable}")

        try:
            # Executar código Python com timeout
            result = await asyncio.wait_for(
                self._run_python_script(code, script_namespace),
                timeout=timeout
            )

            logger.info(f"  ✅ Script executado com sucesso")
            logger.info(f"  💾 Resultado: {result}")

            # Salvar resultado na variável de output
            if output_variable:
                context_vars[output_variable] = result
                await conv_repo.update(conversation.id, {"context_variables": context_vars})
                await self.db.commit()
                logger.info(f"  💾 Resultado salvo em '{output_variable}'")

        except asyncio.TimeoutError:
            logger.error(f"  ⏰ Timeout! Script excedeu {timeout}s")

            if on_error == "stop":
                await self._execute_handoff(
                    conversation,
                    {
                        "transferMessage": "Tempo de processamento excedido. Transferindo para agente.",
                        "sendTransferMessage": True,
                        "priority": "high"
                    }
                )
                return
            else:
                # Continue com fallback
                if output_variable and fallback_value is not None:
                    context_vars[output_variable] = fallback_value
                    await conv_repo.update(conversation.id, {"context_variables": context_vars})
                    await self.db.commit()

        except Exception as e:
            logger.error(f"  ❌ Erro ao executar script: {str(e)}")

            if on_error == "stop":
                await self._execute_handoff(
                    conversation,
                    {
                        "transferMessage": "Erro ao processar dados. Transferindo para agente.",
                        "sendTransferMessage": True,
                        "priority": "high"
                    }
                )
                return
            else:
                # Continue com fallback
                if output_variable and fallback_value is not None:
                    context_vars[output_variable] = fallback_value
                    await conv_repo.update(conversation.id, {"context_variables": context_vars})
                    await self.db.commit()

        logger.info(f"✅ Script Node concluído")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _run_python_script(self, code: str, namespace: dict) -> any:
        """
        Executa código Python em um namespace restrito.

        Args:
            code: Código Python a ser executado
            namespace: Namespace (variáveis disponíveis)

        Returns:
            Resultado retornado pelo script (via return)
        """
        import asyncio

        # Se o código não tem return explícito, adicionar return na última linha se for expressão
        code_lines = code.strip().split('\n')
        if code_lines and not any(line.strip().startswith('return') for line in code_lines):
            # Se é uma única expressão, adicionar return
            if len(code_lines) == 1 and not ':' in code_lines[0]:
                code = f"return {code}"

        # Wrapper para capturar o return
        wrapped_code = f"""
def __script_func__():
    {chr(10).join('    ' + line for line in code.split(chr(10)))}

__result__ = __script_func__()
"""

        try:
            # Executar em thread separada para não bloquear o event loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: exec(wrapped_code, namespace)
            )

            # Retornar resultado
            return namespace.get('__result__')

        except Exception as e:
            logger.error(f"Erro na execução do script: {str(e)}")
            raise

    async def _execute_set_variable(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Set Variable Node - Define/atualiza variáveis no contexto da conversa

        Node Data Format:
        {
            "variables": [
                {
                    "name": "user_name",
                    "valueType": "static",     # "static", "variable", "expression"
                    "value": "João Silva",
                    "variableSource": null,    # Nome da variável para copiar
                    "expression": null         # Expressão para avaliar
                }
            ]
        }

        Value Types:
        - static: Valor fixo/literal
        - variable: Copiar valor de outra variável
        - expression: Avaliar expressão simples (ex: "{{first_name}} {{last_name}}")
        """
        from app.repositories.conversation import ConversationRepository
        import re

        logger.info(f"🔧 Set Variable Node - Configurando variáveis")

        # Obter variáveis configuradas
        variables_config = node_data.get("variables", [])

        if not variables_config:
            logger.warning("⚠️ Nenhuma variável configurada no Set Variable Node")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Obter contexto atual
        conv_repo = ConversationRepository(self.db)
        context_vars = conversation.context_variables or {}

        logger.info(f"📦 Contexto atual: {list(context_vars.keys())}")

        # Processar cada variável
        for var_config in variables_config:
            var_name = var_config.get("name")
            value_type = var_config.get("valueType", "static")

            if not var_name:
                logger.warning("⚠️ Nome de variável vazio, pulando")
                continue

            try:
                # Determinar valor baseado no tipo
                if value_type == "static":
                    # Valor estático/literal
                    value = var_config.get("value")
                    logger.info(f"✏️ Definindo '{var_name}' = '{value}' (static)")

                elif value_type == "variable":
                    # Copiar de outra variável
                    source_var = var_config.get("variableSource")
                    if source_var and source_var in context_vars:
                        value = context_vars[source_var]
                        logger.info(f"📋 Copiando '{var_name}' <- '{source_var}' = '{value}'")
                    else:
                        logger.warning(f"⚠️ Variável source '{source_var}' não encontrada, usando null")
                        value = None

                elif value_type == "expression":
                    # Avaliar expressão com substituição de variáveis
                    expression = var_config.get("expression", "")

                    # Substituir placeholders {{variable}} pelos valores
                    def replace_placeholder(match):
                        var = match.group(1)
                        return str(context_vars.get(var, ""))

                    value = re.sub(r'\{\{(\w+)\}\}', replace_placeholder, expression)
                    logger.info(f"🔢 Avaliando expressão '{var_name}' = '{expression}' → '{value}'")

                else:
                    logger.warning(f"⚠️ Tipo de valor '{value_type}' desconhecido, usando null")
                    value = None

                # Salvar no contexto
                context_vars[var_name] = value

            except Exception as e:
                logger.error(f"❌ Erro ao processar variável '{var_name}': {str(e)}")
                context_vars[var_name] = None

        # Atualizar contexto da conversa
        try:
            await conv_repo.update(
                conversation.id,
                {"context_variables": context_vars}
            )
            logger.info(f"✅ Variáveis atualizadas: {list(context_vars.keys())}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar contexto: {str(e)}")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_random(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Random Node - Seleção aleatória de caminhos para A/B Testing

        Node Data Format:
        {
            "paths": [
                {
                    "id": "path_a",
                    "label": "Variante A",
                    "weight": 50,  # Peso em porcentagem
                    "targetNodeId": "node_123"
                },
                {
                    "id": "path_b",
                    "label": "Variante B",
                    "weight": 30,
                    "targetNodeId": "node_456"
                }
            ],
            "saveToVariable": "ab_test_variant",  # Opcional: salvar variante escolhida
            "seed": null  # Opcional: seed para randomização reproduzível
        }
        """
        from app.repositories.conversation import ConversationRepository
        import random

        logger.info(f"🎲 Random Node - Selecionando caminho aleatório")

        # Obter configuração de caminhos
        paths = node_data.get("paths", [])
        save_to_variable = node_data.get("saveToVariable")
        seed = node_data.get("seed")

        if not paths:
            logger.warning("⚠️ Nenhum caminho configurado no Random Node")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Validar pesos
        total_weight = sum(path.get("weight", 0) for path in paths)
        if total_weight == 0:
            logger.warning("⚠️ Peso total é 0, usando distribuição uniforme")
            # Distribuição uniforme se não houver pesos
            for path in paths:
                path["weight"] = 100 / len(paths)
            total_weight = 100

        # Configurar seed se fornecido (para testes reproduzíveis)
        if seed is not None:
            random.seed(seed)

        # Seleção aleatória ponderada
        rand_value = random.uniform(0, total_weight)
        cumulative_weight = 0
        selected_path = None

        for path in paths:
            cumulative_weight += path.get("weight", 0)
            if rand_value <= cumulative_weight:
                selected_path = path
                break

        # Fallback: se algo der errado, selecionar primeiro caminho
        if not selected_path:
            selected_path = paths[0]
            logger.warning("⚠️ Nenhum caminho selecionado, usando primeiro path")

        logger.info(
            f"✅ Caminho selecionado: '{selected_path.get('label')}' "
            f"(ID: {selected_path.get('id')}, Peso: {selected_path.get('weight')}%)"
        )

        # Salvar variante em variável se configurado
        if save_to_variable:
            conv_repo = ConversationRepository(self.db)
            context_vars = conversation.context_variables or {}
            context_vars[save_to_variable] = selected_path.get("id")

            try:
                await conv_repo.update(
                    conversation.id,
                    {"context_variables": context_vars}
                )
                logger.info(f"💾 Variante salva em '{save_to_variable}' = '{selected_path.get('id')}'")
            except Exception as e:
                logger.error(f"❌ Erro ao salvar variante: {str(e)}")

        # Avançar para node de destino do caminho selecionado
        target_node_id = selected_path.get("targetNodeId")
        if target_node_id:
            # Encontrar node de destino no flow
            target_node = None
            canvas_data = flow.canvas_data or {}
            nodes = canvas_data.get("nodes", [])

            for n in nodes:
                if n.get("id") == target_node_id:
                    target_node = n
                    break

            if target_node:
                logger.info(f"➡️ Avançando para node de destino: {target_node.get('data', {}).get('label', target_node_id)}")
                await self._execute_node(conversation, target_node, flow, incoming_message)
            else:
                logger.error(f"❌ Node de destino '{target_node_id}' não encontrado")
                await self._advance_to_next_node(conversation, node, flow, incoming_message)
        else:
            logger.warning("⚠️ Caminho sem targetNodeId, avançando normalmente")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_datetime(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Date/Time Node - Manipulação de datas e horários

        Node Data Format:
        {
            "operation": "get_current",  # "get_current", "format", "add", "compare", "parse"
            "timezone": "America/Sao_Paulo",
            "format": "DD/MM/YYYY HH:mm",  # Formato de saída
            "inputFormat": null,  # Formato para parse
            "addAmount": 7,  # Quantidade a adicionar/subtrair
            "addUnit": "days",  # "days", "hours", "minutes", "months", "years"
            "sourceVariable": null,  # Variável contendo data para manipular
            "compareWith": null,  # Data/variável para comparar
            "compareOperator": "gt",  # "gt", "lt", "eq", "gte", "lte"
            "outputVariable": "scheduled_date"
        }

        Operations:
        - get_current: Obter data/hora atual
        - format: Formatar data
        - add: Adicionar/subtrair tempo
        - compare: Comparar datas
        - parse: Parse de string para data
        """
        from app.repositories.conversation import ConversationRepository
        from datetime import datetime, timedelta
        from dateutil.relativedelta import relativedelta
        import pytz

        logger.info(f"📅 Date/Time Node - Manipulando datas")

        operation = node_data.get("operation", "get_current")
        timezone_str = node_data.get("timezone", "America/Sao_Paulo")
        output_format = node_data.get("format", "%d/%m/%Y %H:%M")
        output_variable = node_data.get("outputVariable")

        # Obter contexto
        conv_repo = ConversationRepository(self.db)
        context_vars = conversation.context_variables or {}

        try:
            # Configurar timezone
            tz = pytz.timezone(timezone_str)

            # Obter data de origem (se houver)
            source_var = node_data.get("sourceVariable")
            if source_var and source_var in context_vars:
                # Parse da data armazenada
                source_date_str = context_vars[source_var]
                input_format = node_data.get("inputFormat", "%d/%m/%Y %H:%M")
                try:
                    source_date = datetime.strptime(str(source_date_str), input_format)
                    if source_date.tzinfo is None:
                        source_date = tz.localize(source_date)
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao fazer parse da data '{source_date_str}': {e}")
                    source_date = datetime.now(tz)
            else:
                source_date = datetime.now(tz)

            result = None

            # Executar operação
            if operation == "get_current":
                # Obter data/hora atual
                result_date = datetime.now(tz)
                result = result_date.strftime(output_format)
                logger.info(f"🕐 Data atual: {result}")

            elif operation == "format":
                # Formatar data
                result = source_date.strftime(output_format)
                logger.info(f"📝 Data formatada: {result}")

            elif operation == "add":
                # Adicionar/subtrair tempo
                add_amount = node_data.get("addAmount", 0)
                add_unit = node_data.get("addUnit", "days")

                if add_unit == "days":
                    result_date = source_date + timedelta(days=add_amount)
                elif add_unit == "hours":
                    result_date = source_date + timedelta(hours=add_amount)
                elif add_unit == "minutes":
                    result_date = source_date + timedelta(minutes=add_amount)
                elif add_unit == "months":
                    result_date = source_date + relativedelta(months=add_amount)
                elif add_unit == "years":
                    result_date = source_date + relativedelta(years=add_amount)
                else:
                    logger.warning(f"⚠️ Unidade '{add_unit}' desconhecida, usando days")
                    result_date = source_date + timedelta(days=add_amount)

                result = result_date.strftime(output_format)
                logger.info(f"➕ Data calculada: {result} ({add_amount} {add_unit})")

            elif operation == "compare":
                # Comparar datas
                compare_with = node_data.get("compareWith")
                compare_operator = node_data.get("compareOperator", "gt")

                # Parse da data de comparação
                if compare_with and compare_with in context_vars:
                    compare_date_str = context_vars[compare_with]
                    input_format = node_data.get("inputFormat", "%d/%m/%Y %H:%M")
                    try:
                        compare_date = datetime.strptime(str(compare_date_str), input_format)
                        if compare_date.tzinfo is None:
                            compare_date = tz.localize(compare_date)
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao parse de compareWith: {e}")
                        compare_date = datetime.now(tz)
                else:
                    compare_date = datetime.now(tz)

                # Executar comparação
                if compare_operator == "gt":
                    result = source_date > compare_date
                elif compare_operator == "lt":
                    result = source_date < compare_date
                elif compare_operator == "eq":
                    result = source_date == compare_date
                elif compare_operator == "gte":
                    result = source_date >= compare_date
                elif compare_operator == "lte":
                    result = source_date <= compare_date
                else:
                    result = False

                logger.info(f"⚖️ Comparação: {source_date} {compare_operator} {compare_date} = {result}")

            elif operation == "parse":
                # Parse de string para data
                input_format = node_data.get("inputFormat", "%d/%m/%Y %H:%M")
                result = source_date.strftime(output_format)
                logger.info(f"🔄 Parse de data: {result}")

            else:
                logger.warning(f"⚠️ Operação '{operation}' desconhecida")
                result = datetime.now(tz).strftime(output_format)

            # Salvar resultado em variável
            if output_variable:
                context_vars[output_variable] = result
                await conv_repo.update(
                    conversation.id,
                    {"context_variables": context_vars}
                )
                logger.info(f"💾 Resultado salvo em '{output_variable}' = '{result}'")

        except Exception as e:
            logger.error(f"❌ Erro na operação de data/hora: {str(e)}")
            # Em caso de erro, salvar null
            if output_variable:
                context_vars[output_variable] = None
                await conv_repo.update(
                    conversation.id,
                    {"context_variables": context_vars}
                )

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_whatsapp_template(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa WhatsApp Template Node - Envia template oficial do WhatsApp

        Node Data Format:
        {
            "templateName": "welcome_message",
            "languageCode": "pt_BR",
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "{{user_name}}"}
                    ]
                }
            ]
        }
        """
        from app.repositories.conversation import ConversationRepository
        import re

        logger.info(f"📋 Executando WhatsApp Template Node")

        # Extrair dados do template
        template_name = node_data.get("templateName", "")
        language_code = node_data.get("languageCode", "pt_BR")
        components = node_data.get("components", [])

        if not template_name:
            logger.error("❌ Template name não especificado")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Substituir variáveis nos componentes
        context_vars = conversation.context_variables or {}
        variables_pattern = r'\{\{(\w+)\}\}'

        # Processar componentes e substituir variáveis
        processed_components = []
        for component in components:
            comp_copy = component.copy()

            if comp_copy.get("type") == "body" and "parameters" in comp_copy:
                processed_params = []
                for param in comp_copy["parameters"]:
                    if param.get("type") == "text":
                        text = param.get("text", "")
                        # Substituir variáveis
                        for var_name in re.findall(variables_pattern, text):
                            value = str(context_vars.get(var_name, f"{{{{{var_name}}}}}"))
                            text = text.replace(f"{{{{{var_name}}}}}", value)
                        processed_params.append({"type": "text", "text": text})
                    else:
                        processed_params.append(param)
                comp_copy["parameters"] = processed_params

            processed_components.append(comp_copy)

        # Buscar WhatsApp number da conversa
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)
        if not whatsapp_number:
            logger.error("❌ WhatsApp number não encontrado")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        contact_phone = conversation.contact_whatsapp_id

        try:
            if whatsapp_number.connection_type == "official":
                # Meta Cloud API
                from app.integrations.meta_api import MetaCloudAPI

                api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token
                )

                response = await api.send_template_message(
                    to=contact_phone,
                    template_name=template_name,
                    language_code=language_code,
                    components=processed_components if processed_components else None
                )

                logger.info(f"✅ Template '{template_name}' enviado via Meta API")

            else:
                # Evolution API (QR Code) - Templates não são suportados nativamente
                # Vamos fazer fallback para mensagem de texto simples
                logger.warning(f"⚠️ Templates não são suportados via Evolution API. Enviando como texto simples.")

                # Extrair texto do body component
                body_text = f"Template: {template_name}"
                for comp in processed_components:
                    if comp.get("type") == "body" and "parameters" in comp:
                        params_text = " ".join([p.get("text", "") for p in comp["parameters"] if p.get("type") == "text"])
                        body_text = params_text
                        break

                from app.integrations.evolution_api import EvolutionAPIClient

                evo_client = EvolutionAPIClient(
                    api_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key
                )

                await evo_client.send_text_message(
                    instance_name=whatsapp_number.evolution_instance_name,
                    phone_number=contact_phone,
                    message=body_text
                )

                logger.info(f"✅ Template enviado como texto via Evolution API")

            # Salvar mensagem no banco
            from app.repositories.conversation import ConversationRepository
            conv_repo = ConversationRepository(self.db)
            await conv_repo.create_message({
                "conversation_id": conversation.id,
                "direction": "outbound",
                "sender_type": "bot",
                "message_type": "template",
                "content": {
                    "template_name": template_name,
                    "language_code": language_code,
                    "components": processed_components
                },
                "status": "sent"
            })
            await self.db.commit()

        except Exception as e:
            logger.error(f"❌ Erro ao enviar template: {e}")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_interactive_buttons(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Interactive Buttons Node - Envia botões interativos no WhatsApp

        Node Data Format:
        {
            "bodyText": "Escolha uma opção:",
            "headerText": "Menu Principal",  // Opcional
            "footerText": "Powered by PyTake",  // Opcional
            "buttons": [
                {"id": "btn1", "title": "Opção 1"},
                {"id": "btn2", "title": "Opção 2"},
                {"id": "btn3", "title": "Opção 3"}
            ]
        }
        """
        from app.repositories.conversation import ConversationRepository
        import re

        logger.info(f"🔘 Executando Interactive Buttons Node")

        # Extrair dados
        body_text = node_data.get("bodyText", "")
        header_text = node_data.get("headerText")
        footer_text = node_data.get("footerText")
        buttons = node_data.get("buttons", [])

        if not body_text or not buttons:
            logger.error("❌ Body text ou buttons não especificados")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Validar quantidade de botões (máximo 3 para Meta API)
        if len(buttons) > 3:
            logger.warning(f"⚠️ Máximo de 3 botões permitidos. Usando apenas os 3 primeiros.")
            buttons = buttons[:3]

        # Substituir variáveis
        context_vars = conversation.context_variables or {}
        variables_pattern = r'\{\{(\w+)\}\}'

        for var_name in re.findall(variables_pattern, body_text):
            value = str(context_vars.get(var_name, f"{{{{{var_name}}}}}"))
            body_text = body_text.replace(f"{{{{{var_name}}}}}", value)

        if header_text:
            for var_name in re.findall(variables_pattern, header_text):
                value = str(context_vars.get(var_name, f"{{{{{var_name}}}}}"))
                header_text = header_text.replace(f"{{{{{var_name}}}}}", value)

        # Buscar WhatsApp number
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)
        if not whatsapp_number:
            logger.error("❌ WhatsApp number não encontrado")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        contact_phone = conversation.contact_whatsapp_id

        try:
            if whatsapp_number.connection_type == "official":
                # Meta Cloud API
                from app.integrations.meta_api import MetaCloudAPI

                api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token
                )

                await api.send_interactive_buttons(
                    to=contact_phone,
                    body_text=body_text,
                    buttons=buttons,
                    header_text=header_text,
                    footer_text=footer_text
                )

                logger.info(f"✅ Botões interativos enviados via Meta API ({len(buttons)} botões)")

            else:
                # Evolution API (QR Code)
                from app.integrations.evolution_api import EvolutionAPIClient

                evo_client = EvolutionAPIClient(
                    api_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key
                )

                # Formatar botões para Evolution API
                evo_buttons = [{"displayText": btn["title"]} for btn in buttons]

                await evo_client.send_buttons(
                    instance_name=whatsapp_number.evolution_instance_name,
                    phone_number=contact_phone,
                    title=header_text or "Menu",
                    description=body_text,
                    buttons=evo_buttons,
                    footer=footer_text
                )

                logger.info(f"✅ Botões enviados via Evolution API ({len(buttons)} botões)")

            # Salvar mensagem no banco
            from app.repositories.conversation import ConversationRepository
            conv_repo = ConversationRepository(self.db)
            await conv_repo.create_message({
                "conversation_id": conversation.id,
                "direction": "outbound",
                "sender_type": "bot",
                "message_type": "interactive",
                "content": {
                    "type": "buttons",
                    "body": body_text,
                    "header": header_text,
                    "footer": footer_text,
                    "buttons": buttons
                },
                "status": "sent"
            })
            await self.db.commit()

        except Exception as e:
            logger.error(f"❌ Erro ao enviar botões interativos: {e}")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def _execute_interactive_list(self, conversation, node, flow, incoming_message, node_data):
        """
        Executa Interactive List Node - Envia lista/menu interativo no WhatsApp

        Node Data Format:
        {
            "bodyText": "Escolha uma opção da lista:",
            "buttonText": "Ver Opções",
            "headerText": "Produtos Disponíveis",  // Opcional
            "footerText": "Powered by PyTake",  // Opcional
            "sections": [
                {
                    "title": "Categoria 1",
                    "rows": [
                        {"id": "opt1", "title": "Opção 1", "description": "Descrição da opção 1"},
                        {"id": "opt2", "title": "Opção 2", "description": "Descrição da opção 2"}
                    ]
                }
            ]
        }
        """
        from app.repositories.conversation import ConversationRepository
        import re

        logger.info(f"📝 Executando Interactive List Node")

        # Extrair dados
        body_text = node_data.get("bodyText", "")
        button_text = node_data.get("buttonText", "Ver opções")
        header_text = node_data.get("headerText")
        footer_text = node_data.get("footerText")
        sections = node_data.get("sections", [])

        if not body_text or not sections:
            logger.error("❌ Body text ou sections não especificados")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        # Substituir variáveis
        context_vars = conversation.context_variables or {}
        variables_pattern = r'\{\{(\w+)\}\}'

        for var_name in re.findall(variables_pattern, body_text):
            value = str(context_vars.get(var_name, f"{{{{{var_name}}}}}"))
            body_text = body_text.replace(f"{{{{{var_name}}}}}", value)

        # Buscar WhatsApp number
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)
        if not whatsapp_number:
            logger.error("❌ WhatsApp number não encontrado")
            await self._advance_to_next_node(conversation, node, flow, incoming_message)
            return

        contact_phone = conversation.contact_whatsapp_id

        try:
            if whatsapp_number.connection_type == "official":
                # Meta Cloud API
                from app.integrations.meta_api import MetaCloudAPI

                api = MetaCloudAPI(
                    phone_number_id=whatsapp_number.phone_number_id,
                    access_token=whatsapp_number.access_token
                )

                await api.send_interactive_list(
                    to=contact_phone,
                    body_text=body_text,
                    button_text=button_text,
                    sections=sections,
                    header_text=header_text,
                    footer_text=footer_text
                )

                total_rows = sum(len(s.get("rows", [])) for s in sections)
                logger.info(f"✅ Lista interativa enviada via Meta API ({len(sections)} seções, {total_rows} itens)")

            else:
                # Evolution API (QR Code)
                from app.integrations.evolution_api import EvolutionAPIClient

                evo_client = EvolutionAPIClient(
                    api_url=whatsapp_number.evolution_api_url,
                    api_key=whatsapp_number.evolution_api_key
                )

                await evo_client.send_list(
                    instance_name=whatsapp_number.evolution_instance_name,
                    phone_number=contact_phone,
                    title=header_text or "Menu",
                    description=body_text,
                    button_text=button_text,
                    sections=sections,
                    footer=footer_text
                )

                total_rows = sum(len(s.get("rows", [])) for s in sections)
                logger.info(f"✅ Lista enviada via Evolution API ({len(sections)} seções, {total_rows} itens)")

            # Salvar mensagem no banco
            from app.repositories.conversation import ConversationRepository
            conv_repo = ConversationRepository(self.db)
            await conv_repo.create_message({
                "conversation_id": conversation.id,
                "direction": "outbound",
                "sender_type": "bot",
                "message_type": "interactive",
                "content": {
                    "type": "list",
                    "body": body_text,
                    "button": button_text,
                    "header": header_text,
                    "footer": footer_text,
                    "sections": sections
                },
                "status": "sent"
            })
            await self.db.commit()

        except Exception as e:
            logger.error(f"❌ Erro ao enviar lista interativa: {e}")

        # Avançar para próximo node
        await self._advance_to_next_node(conversation, node, flow, incoming_message)

    async def get_by_id(
        self, number_id: UUID, organization_id: UUID
    ) -> WhatsAppNumber:
        """Get WhatsApp number by ID"""
        number = await self.repo.get(number_id)
        if not number or number.organization_id != organization_id:
            raise NotFoundException("WhatsApp number not found")
        return self._enrich_number_with_node_info(number)

    async def list_numbers(self, organization_id: UUID) -> List[WhatsAppNumber]:
        """List all WhatsApp numbers"""
        numbers = await self.repo.get_by_organization(organization_id)
        return [self._enrich_number_with_node_info(num) for num in numbers]

    async def create_number(
        self, data: WhatsAppNumberCreate, organization_id: UUID
    ) -> WhatsAppNumber:
        """Register a new WhatsApp number"""
        # Check if phone already exists
        existing = await self.repo.get_by_phone(data.phone_number, organization_id)
        if existing:
            raise ConflictException("Phone number already registered")

        number_data = data.model_dump()
        number_data["organization_id"] = organization_id
        number_data["is_active"] = True

        number = await self.repo.create(number_data)
        return self._enrich_number_with_node_info(number)

    async def update_number(
        self, number_id: UUID, data: WhatsAppNumberUpdate, organization_id: UUID
    ) -> WhatsAppNumber:
        """Update WhatsApp number"""
        number = await self.get_by_id(number_id, organization_id)
        update_data = data.model_dump(exclude_unset=True)
        updated_number = await self.repo.update(number_id, update_data)
        return self._enrich_number_with_node_info(updated_number)

    async def delete_number(
        self, number_id: UUID, organization_id: UUID
    ) -> bool:
        """Delete WhatsApp number"""
        number = await self.get_by_id(number_id, organization_id)
        return await self.repo.delete(number_id)

    # ============= Webhook Methods =============

    async def verify_webhook_token(self, token: str) -> bool:
        """
        Verify if the webhook token matches any WhatsApp number in database.
        Used during Meta webhook verification.
        """
        try:
            stmt = select(WhatsAppNumber).where(
                WhatsAppNumber.webhook_verify_token == token,
                WhatsAppNumber.deleted_at.is_(None),
            )
            result = await self.db.execute(stmt)
            number = result.scalar_one_or_none()
            return number is not None
        except Exception as e:
            logger.error(f"Error verifying webhook token: {e}")
            return False

    async def process_webhook(self, payload: Dict[str, Any]) -> None:
        """
        Process incoming webhook from Meta Cloud API.

        Payload structure from Meta:
        {
          "object": "whatsapp_business_account",
          "entry": [{
            "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
            "changes": [{
              "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                  "display_phone_number": "15550000000",
                  "phone_number_id": "123456789"
                },
                "messages": [...],  # Incoming messages
                "statuses": [...]   # Status updates
              },
              "field": "messages"
            }]
          }]
        }
        """
        try:
            logger.info(f"Processing webhook payload: {payload}")

            # Extract entries
            entries = payload.get("entry", [])

            for entry in entries:
                changes = entry.get("changes", [])

                for change in changes:
                    field = change.get("field")
                    value = change.get("value", {})

                    # Get phone number ID to identify which number received the message
                    metadata = value.get("metadata", {})
                    phone_number_id = metadata.get("phone_number_id")

                    if not phone_number_id:
                        logger.warning("No phone_number_id in webhook payload")
                        continue

                    # Get WhatsApp number from database
                    stmt = select(WhatsAppNumber).where(
                        WhatsAppNumber.phone_number_id == phone_number_id
                    )
                    result = await self.db.execute(stmt)
                    whatsapp_number = result.scalar_one_or_none()

                    if not whatsapp_number:
                        logger.warning(f"WhatsApp number not found for phone_number_id: {phone_number_id}")
                        continue

                    # Process messages
                    if field == "messages":
                        messages = value.get("messages", [])
                        for message in messages:
                            await self._process_incoming_message(message, whatsapp_number)

                        # Process statuses
                        statuses = value.get("statuses", [])
                        for status in statuses:
                            await self._process_message_status(status, whatsapp_number)

            await self.db.commit()

        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            await self.db.rollback()
            raise

    async def _process_incoming_message(
        self, message: Dict[str, Any], whatsapp_number: WhatsAppNumber
    ) -> None:
        """
        Process an incoming message from WhatsApp

        Message structure from Meta:
        {
            "from": "5511999999999",  # Contact's WhatsApp ID
            "id": "wamid.xxx",         # WhatsApp message ID
            "timestamp": "1234567890",
            "type": "text",
            "text": {"body": "Hello!"}
        }
        """
        from app.repositories.contact import ContactRepository
        from app.repositories.conversation import ConversationRepository, MessageRepository
        from app.models.conversation import Conversation, Message
        from datetime import datetime, timedelta

        logger.info(f"Processing incoming message: {message.get('id')} for number {whatsapp_number.phone_number}")

        # Extract message data
        whatsapp_contact_id = message.get("from")
        whatsapp_message_id = message.get("id")
        message_type = message.get("type", "text")
        timestamp = message.get("timestamp")

        if not whatsapp_contact_id or not whatsapp_message_id:
            logger.warning("Missing required fields in message")
            return

        # 1. Get or Create Contact
        contact_repo = ContactRepository(self.db)
        contact = await contact_repo.get_by_whatsapp_id(
            whatsapp_id=whatsapp_contact_id,
            organization_id=whatsapp_number.organization_id
        )

        if not contact:
            # Create new contact
            contact_data = {
                "organization_id": whatsapp_number.organization_id,
                "whatsapp_id": whatsapp_contact_id,
                "whatsapp_name": message.get("profile", {}).get("name"),
                "source": "whatsapp",
                "lifecycle_stage": "lead",
                "last_message_received_at": datetime.utcnow(),
            }
            contact = await contact_repo.create(contact_data)
            logger.info(f"Created new contact: {contact.id} for WhatsApp ID: {whatsapp_contact_id}")
        else:
            # Update contact activity
            await contact_repo.update(contact.id, {
                "last_message_received_at": datetime.utcnow(),
                "last_message_at": datetime.utcnow(),
                "total_messages_received": contact.total_messages_received + 1,
            })

        # 2. Get or Create Conversation
        conversation_repo = ConversationRepository(self.db)
        conversations = await conversation_repo.get_by_contact(
            contact_id=contact.id,
            organization_id=whatsapp_number.organization_id,
            status="open"
        )

        if conversations:
            conversation = conversations[0]
        else:
            # Create new conversation
            now = datetime.utcnow()
            window_expires = now + timedelta(hours=24)

            conversation_data = {
                "organization_id": whatsapp_number.organization_id,
                "contact_id": contact.id,
                "whatsapp_number_id": whatsapp_number.id,
                "status": "open",
                "channel": "whatsapp",
                "first_message_at": now,
                "last_message_at": now,
                "last_inbound_message_at": now,
                "window_expires_at": window_expires,
                "is_bot_active": True if whatsapp_number.default_chatbot_id else False,
                "active_chatbot_id": whatsapp_number.default_chatbot_id,
            }
            conversation = await conversation_repo.create(conversation_data)
            logger.info(f"Created new conversation: {conversation.id}")

        # Update conversation
        now = datetime.utcnow()
        await conversation_repo.update(conversation.id, {
            "last_message_at": now,
            "last_message_from_contact_at": now,
            "last_inbound_message_at": now,
            "window_expires_at": now + timedelta(hours=24),
            "messages_from_contact": conversation.messages_from_contact + 1,
            "total_messages": conversation.total_messages + 1,
        })

        # 3. Store Message
        message_repo = MessageRepository(self.db)

        # Check if message already exists (WhatsApp may send duplicate webhooks)
        stmt = select(Message).where(
            Message.whatsapp_message_id == whatsapp_message_id,
            Message.organization_id == whatsapp_number.organization_id,
        )
        result = await self.db.execute(stmt)
        existing_message = result.scalar_one_or_none()

        if existing_message:
            logger.info(f"Message {whatsapp_message_id} already processed. Skipping duplicate.")
            return  # Idempotent - just return without error

        # Extract content based on message type
        content = {}
        if message_type == "text":
            content = {"text": message.get("text", {}).get("body", "")}
        elif message_type == "image":
            content = {"image": message.get("image", {})}
        elif message_type == "video":
            content = {"video": message.get("video", {})}
        elif message_type == "audio":
            content = {"audio": message.get("audio", {})}
        elif message_type == "document":
            content = {"document": message.get("document", {})}
        elif message_type == "location":
            content = {"location": message.get("location", {})}
        else:
            content = message.get(message_type, {})

        message_data = {
            "organization_id": whatsapp_number.organization_id,
            "conversation_id": conversation.id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "inbound",
            "sender_type": "contact",
            "whatsapp_message_id": whatsapp_message_id,
            "whatsapp_timestamp": int(timestamp) if timestamp else None,
            "message_type": message_type,
            "content": content,
            "status": "received",
        }

        new_message = await message_repo.create(message_data)
        logger.info(f"Saved message: {new_message.id} (WhatsApp ID: {whatsapp_message_id})")

        # 4. Trigger chatbot se configurado
        if conversation.is_bot_active and conversation.active_chatbot_id:
            await self._trigger_chatbot(conversation, new_message)

        # 5. TODO: Send to queue if needed
        # if not conversation.is_bot_active and not conversation.current_agent_id:
        #     await conversation_repo.update(conversation.id, {"status": "queued"})

        await self.db.commit()

        # Emit WebSocket event for incoming message
        from app.websocket.manager import emit_to_conversation

        message_dict = {
            "id": str(new_message.id),
            "conversation_id": str(conversation.id),
            "direction": new_message.direction,
            "sender_type": new_message.sender_type,
            "message_type": new_message.message_type,
            "content": new_message.content,
            "status": new_message.status,
            "whatsapp_message_id": new_message.whatsapp_message_id,
            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        }

        await emit_to_conversation(
            conversation_id=str(conversation.id),
            event="message:new",
            data=message_dict
        )

        logger.info(f"[WebSocket] Emitted message:new for incoming message {new_message.id}")
        logger.info(f"✅ Message processed successfully")

    async def _process_message_status(
        self, status: Dict[str, Any], whatsapp_number: WhatsAppNumber
    ) -> None:
        """
        Process message status update from WhatsApp

        Status structure from Meta:
        {
            "id": "wamid.xxx",         # WhatsApp message ID
            "status": "delivered",      # sent, delivered, read, failed
            "timestamp": "1234567890",
            "recipient_id": "5511999999999",
            "errors": [{               # Only if status is "failed"
                "code": 131047,
                "title": "Re-engagement message"
            }]
        }
        """
        from app.repositories.conversation import MessageRepository
        from datetime import datetime

        whatsapp_message_id = status.get("id")
        message_status = status.get("status")

        if not whatsapp_message_id or not message_status:
            logger.warning("Missing required fields in status update")
            return

        logger.info(f"Processing status update: {whatsapp_message_id} -> {message_status}")

        # Find message by WhatsApp message ID
        message_repo = MessageRepository(self.db)
        stmt = select(Message).where(
            Message.whatsapp_message_id == whatsapp_message_id,
            Message.organization_id == whatsapp_number.organization_id,
        )
        result = await self.db.execute(stmt)
        message = result.scalar_one_or_none()

        if not message:
            logger.warning(f"Message not found for WhatsApp ID: {whatsapp_message_id}")
            return

        # Update message status
        now = datetime.utcnow()
        update_data = {"status": message_status}

        if message_status == "sent":
            update_data["sent_at"] = now
            logger.info(f"✅ Message {message.id} marked as sent")

        elif message_status == "delivered":
            update_data["delivered_at"] = now
            logger.info(f"✅ Message {message.id} marked as delivered")

        elif message_status == "read":
            update_data["read_at"] = now
            logger.info(f"✅ Message {message.id} marked as read")

        elif message_status == "failed":
            update_data["failed_at"] = now

            # Extract error information
            errors = status.get("errors", [])
            if errors:
                error = errors[0]  # Get first error
                update_data["error_code"] = str(error.get("code", "unknown"))
                update_data["error_message"] = error.get("title") or error.get("message", "Unknown error")

            logger.error(
                f"❌ Message {message.id} failed: "
                f"{update_data.get('error_code')} - {update_data.get('error_message')}"
            )

        # Update in database
        await message_repo.update(message.id, update_data)

        # Emit WebSocket event for status update
        from app.websocket.manager import emit_to_conversation
        from datetime import timezone

        await emit_to_conversation(
            conversation_id=str(message.conversation_id),
            event="message:status",
            data={
                "message_id": str(message.id),
                "status": message_status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

        logger.info(f"[WebSocket] Emitted message:status update for message {message.id}")

    # ============= Evolution API Methods =============

    async def generate_qrcode(self, whatsapp_number: WhatsAppNumber) -> Dict[str, Any]:
        """
        Generate QR Code for Evolution API connection

        Args:
            whatsapp_number: WhatsApp number instance (must be type 'qrcode')

        Returns:
            Dict with qr_code (base64) and status
        """
        if whatsapp_number.connection_type != "qrcode":
            raise ValueError("QR Code only available for Evolution API connections")

        if not whatsapp_number.evolution_api_url or not whatsapp_number.evolution_api_key:
            raise ValueError("Evolution API credentials not configured")

        # Initialize Evolution API client
        evolution = EvolutionAPIClient(
            api_url=whatsapp_number.evolution_api_url,
            api_key=whatsapp_number.evolution_api_key
        )

        # Generate instance name if not exists
        if not whatsapp_number.evolution_instance_name:
            instance_name = generate_instance_name(
                str(whatsapp_number.organization_id),
                whatsapp_number.phone_number
            )

            # Create instance in Evolution API
            webhook_url = whatsapp_number.webhook_url or f"{whatsapp_number.webhook_url}/api/v1/whatsapp/webhook/evolution"

            try:
                await evolution.create_instance(
                    instance_name=instance_name,
                    webhook_url=webhook_url,
                )

                # Update database with instance name
                await self.repo.update(
                    whatsapp_number.id,
                    {"evolution_instance_name": instance_name}
                )
                whatsapp_number.evolution_instance_name = instance_name

            except EvolutionAPIError as e:
                logger.error(f"Failed to create Evolution instance: {e}")
                raise

        # Connect and get QR Code
        try:
            await evolution.connect_instance(whatsapp_number.evolution_instance_name)

            # Get QR Code
            qr_code = await evolution.get_qrcode(whatsapp_number.evolution_instance_name)

            if not qr_code:
                # Check if already connected
                status_data = await evolution.get_instance_status(
                    whatsapp_number.evolution_instance_name
                )
                state = status_data.get("state", "")

                if state == "open":
                    # Already connected
                    await self.repo.update(
                        whatsapp_number.id,
                        {
                            "status": "connected",
                            "connected_at": "now()",
                        }
                    )

                    return {
                        "qr_code": None,
                        "status": "connected",
                        "message": "Número já conectado!"
                    }

                return {
                    "qr_code": None,
                    "status": "pending",
                    "message": "Aguardando QR Code..."
                }

            return {
                "qr_code": qr_code,
                "status": "pending",
                "message": "Escaneie o QR Code com seu WhatsApp"
            }

        except EvolutionAPIError as e:
            logger.error(f"Failed to generate QR Code: {e}")
            raise

    async def get_qrcode_status(self, whatsapp_number: WhatsAppNumber) -> Dict[str, Any]:
        """
        Check QR Code connection status

        Args:
            whatsapp_number: WhatsApp number instance

        Returns:
            Dict with current status and QR Code if available
        """
        if whatsapp_number.connection_type != "qrcode":
            raise ValueError("QR Code status only available for Evolution API connections")

        if not whatsapp_number.evolution_instance_name:
            return {
                "qr_code": None,
                "status": "not_created",
                "message": "Instância não criada. Gere o QR Code primeiro."
            }

        # Initialize Evolution API client
        evolution = EvolutionAPIClient(
            api_url=whatsapp_number.evolution_api_url,
            api_key=whatsapp_number.evolution_api_key
        )

        try:
            # Get instance status
            status_data = await evolution.get_instance_status(
                whatsapp_number.evolution_instance_name
            )

            state = status_data.get("state", "close")

            if state == "open":
                # Connected!
                await self.repo.update(
                    whatsapp_number.id,
                    {
                        "status": "connected",
                        "connected_at": "now()",
                    }
                )

                return {
                    "qr_code": None,
                    "status": "connected",
                    "message": "Conectado com sucesso!"
                }

            elif state == "close":
                # Get new QR Code
                qr_code = await evolution.get_qrcode(
                    whatsapp_number.evolution_instance_name
                )

                return {
                    "qr_code": qr_code,
                    "status": "pending",
                    "message": "Escaneie o QR Code com seu WhatsApp"
                }

            else:
                return {
                    "qr_code": None,
                    "status": "connecting",
                    "message": "Conectando..."
                }

        except EvolutionAPIError as e:
            logger.error(f"Failed to get QR Code status: {e}")
            return {
                "qr_code": None,
                "status": "error",
                "message": str(e)
            }

    async def disconnect_number(self, whatsapp_number: WhatsAppNumber) -> bool:
        """
        Disconnect WhatsApp number

        Args:
            whatsapp_number: WhatsApp number instance

        Returns:
            True if disconnected successfully
        """
        if whatsapp_number.connection_type == "qrcode":
            # Evolution API - logout instance
            if not whatsapp_number.evolution_instance_name:
                return True  # Nothing to disconnect

            evolution = EvolutionAPIClient(
                api_url=whatsapp_number.evolution_api_url,
                api_key=whatsapp_number.evolution_api_key
            )

            try:
                await evolution.logout_instance(whatsapp_number.evolution_instance_name)

                # Update database
                await self.repo.update(
                    whatsapp_number.id,
                    {
                        "status": "disconnected",
                        "connected_at": None,
                    }
                )

                return True

            except EvolutionAPIError as e:
                logger.error(f"Failed to disconnect Evolution instance: {e}")
                return False

        else:
            # Official API - just deactivate
            await self.repo.update(
                whatsapp_number.id,
                {
                    "is_active": False,
                    "status": "disconnected",
                }
            )

            return True

    # ============= Message Sending Methods =============

    async def send_message(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        message_type: str,
        content: Dict[str, Any],
        sender_user_id: Optional[UUID] = None
    ) -> Message:
        """
        Send a message via WhatsApp

        Args:
            conversation_id: Conversation ID
            organization_id: Organization ID
            message_type: Message type (text, image, document, template)
            content: Message content (depends on type)
            sender_user_id: User ID of sender (agent/bot)

        Returns:
            Created message with whatsapp_message_id

        Raises:
            NotFoundException: If conversation not found
            ValueError: If 24h window expired and no template provided
            MetaAPIError: If API call fails
        """
        from app.repositories.conversation import ConversationRepository, MessageRepository
        from app.repositories.contact import ContactRepository
        from app.integrations.meta_api import MetaCloudAPI, MetaAPIError
        from datetime import datetime

        logger.info(f"Sending {message_type} message to conversation {conversation_id}")

        # 1. Get conversation and validate
        conversation_repo = ConversationRepository(self.db)
        conversation = await conversation_repo.get_with_contact(conversation_id, organization_id)

        if not conversation:
            raise NotFoundException("Conversation not found")

        # 2. Get WhatsApp number
        whatsapp_number = await self.repo.get(conversation.whatsapp_number_id)

        if not whatsapp_number or not whatsapp_number.is_active:
            raise ValueError("WhatsApp number not active")

        # 3. Check if connection is official API
        if whatsapp_number.connection_type != "official":
            raise ValueError("Send message only supported for Meta Cloud API")

        # 4. Validate 24-hour window for non-template messages
        from datetime import timezone
        now = datetime.now(timezone.utc)

        # Ensure window_expires_at is timezone-aware
        window_expires = conversation.window_expires_at
        if window_expires and window_expires.tzinfo is None:
            window_expires = window_expires.replace(tzinfo=timezone.utc)

        is_within_window = (
            window_expires and
            now < window_expires
        )

        if not is_within_window and message_type != "template":
            logger.warning(
                f"24-hour window expired for conversation {conversation_id}. "
                f"Template message required."
            )
            raise ValueError(
                "24-hour window expired. You must use a template message to re-engage."
            )

        # 5. Create message record with pending status
        message_repo = MessageRepository(self.db)

        # Determine sender type
        if sender_user_id:
            sender_type = "agent"
        else:
            sender_type = "bot" if conversation.is_bot_active else "system"

        message_data = {
            "organization_id": organization_id,
            "conversation_id": conversation_id,
            "whatsapp_number_id": whatsapp_number.id,
            "direction": "outbound",
            "sender_type": sender_type,
            "sender_user_id": sender_user_id,
            "message_type": message_type,
            "content": content,
            "status": "pending",
        }

        message = await message_repo.create(message_data)
        await self.db.commit()

        logger.info(f"Message {message.id} created with status 'pending'")

        # 6. Send via Meta Cloud API
        meta_api = MetaCloudAPI(
            phone_number_id=whatsapp_number.phone_number_id,
            access_token=whatsapp_number.access_token
        )

        try:
            # Get contact WhatsApp ID (remove + if present)
            contact = conversation.contact
            recipient = contact.whatsapp_id.replace("+", "")

            # Send based on message type
            if message_type == "text":
                response = await meta_api.send_text_message(
                    to=recipient,
                    text=content.get("text", ""),
                    preview_url=content.get("preview_url", False)
                )

            elif message_type == "image":
                response = await meta_api.send_image_message(
                    to=recipient,
                    image_url=content.get("url"),
                    caption=content.get("caption")
                )

            elif message_type == "document":
                response = await meta_api.send_document_message(
                    to=recipient,
                    document_url=content.get("url"),
                    filename=content.get("filename"),
                    caption=content.get("caption")
                )

            elif message_type == "template":
                response = await meta_api.send_template_message(
                    to=recipient,
                    template_name=content.get("name"),
                    language_code=content.get("language", "pt_BR"),
                    components=content.get("components")
                )

            else:
                raise ValueError(f"Unsupported message type: {message_type}")

            # 7. Update message with WhatsApp message ID
            whatsapp_message_id = response.get("messages", [{}])[0].get("id")

            if whatsapp_message_id:
                await message_repo.update(message.id, {
                    "whatsapp_message_id": whatsapp_message_id,
                    "status": "sent",
                    "sent_at": datetime.utcnow()
                })

                logger.info(f"✅ Message sent successfully. WhatsApp ID: {whatsapp_message_id}")
            else:
                logger.warning("No message ID returned from Meta API")

            # 8. Update conversation metrics
            await conversation_repo.update(conversation_id, {
                "last_message_at": datetime.utcnow(),
                "last_message_from_agent_at": datetime.utcnow() if sender_type == "agent" else None,
                "messages_from_agent": conversation.messages_from_agent + (1 if sender_type == "agent" else 0),
                "messages_from_bot": conversation.messages_from_bot + (1 if sender_type == "bot" else 0),
                "total_messages": conversation.total_messages + 1,
            })

            await self.db.commit()
            await self.db.refresh(message)

            # Emit WebSocket event for new message
            from app.websocket.manager import emit_to_conversation

            message_dict = {
                "id": str(message.id),
                "conversation_id": str(conversation_id),
                "direction": message.direction,
                "sender_type": message.sender_type,
                "message_type": message.message_type,
                "content": message.content,
                "status": message.status,
                "whatsapp_message_id": message.whatsapp_message_id,
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "sent_at": message.sent_at.isoformat() if message.sent_at else None,
            }

            await emit_to_conversation(
                conversation_id=str(conversation_id),
                event="message:new",
                data=message_dict
            )

            logger.info(f"[WebSocket] Emitted message:new to conversation {conversation_id}")

            return message

        except MetaAPIError as e:
            # Mark message as failed
            await message_repo.update(message.id, {
                "status": "failed",
                "failed_at": datetime.utcnow(),
                "error_code": e.error_code,
                "error_message": e.message
            })
            await self.db.commit()

            logger.error(f"Failed to send message: {e.message}")
            raise

        except Exception as e:
            # Unexpected error
            await message_repo.update(message.id, {
                "status": "failed",
                "failed_at": datetime.utcnow(),
                "error_message": str(e)
            })
            await self.db.commit()

            logger.error(f"Unexpected error sending message: {e}")
            raise
