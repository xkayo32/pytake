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

logger = logging.getLogger(__name__)

class WhatsAppService:
    """Service for WhatsApp number management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WhatsAppNumberRepository(db)

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

            try:
                response = await meta_api.send_text_message(
                    to=contact_whatsapp_id,
                    text=final_text
                )

                whatsapp_message_id = response.get("messages", [{}])[0].get("id")
                logger.info(f"✅ Mensagem enviada via Meta API. ID: {whatsapp_message_id}")

            except Exception as e:
                logger.error(f"❌ Erro ao enviar mensagem via Meta API: {e}")
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
                response = await evolution.send_text_message(
                    instance_name=whatsapp_number.evolution_instance_name,
                    to=contact_whatsapp_id,
                    text=final_text
                )
                logger.info(f"✅ Mensagem enviada via Evolution API")

            except Exception as e:
                logger.error(f"❌ Erro ao enviar mensagem via Evolution API: {e}")
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

        logger.info(f"💬 Processando resposta do usuário para node {current_node.node_id}")

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

    async def get_by_id(
        self, number_id: UUID, organization_id: UUID
    ) -> WhatsAppNumber:
        """Get WhatsApp number by ID"""
        number = await self.repo.get(number_id)
        if not number or number.organization_id != organization_id:
            raise NotFoundException("WhatsApp number not found")
        return number

    async def list_numbers(self, organization_id: UUID) -> List[WhatsAppNumber]:
        """List all WhatsApp numbers"""
        return await self.repo.get_by_organization(organization_id)

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

        return await self.repo.create(number_data)

    async def update_number(
        self, number_id: UUID, data: WhatsAppNumberUpdate, organization_id: UUID
    ) -> WhatsAppNumber:
        """Update WhatsApp number"""
        number = await self.get_by_id(number_id, organization_id)
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(number_id, update_data)

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
