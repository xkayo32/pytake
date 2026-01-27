"""
NodeExecutor - Executes individual flow nodes and returns responses.

Handles all node types: START, MESSAGE, QUESTION, CONDITION, END, etc.
Each node type has its own execution logic and response generation.

Author: Kayo Carvalho Fernandes
"""

import logging
from typing import Optional, Dict, Any, Tuple
from uuid import UUID
import json

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class NodeExecutor:
    """Executes individual flow nodes and returns bot responses."""

    # Supported node types
    SUPPORTED_NODES = {
        "start",        # Flow entry point
        "message",      # Send text message to user
        "question",     # Ask question and capture response
        "condition",    # Branch based on variable value
        "action",       # Perform action (future)
        "api_call",     # Call external API (future)
        "ai_prompt",    # Use AI/LLM (future)
        "jump",         # Jump to another flow
        "end",          # End conversation
        "handoff",      # Handoff to human (future)
    }

    def __init__(self, db: AsyncSession):
        """Initialize executor with database session.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db

    async def execute(
        self,
        node: "Node",
        user_message: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, Optional[str], Optional[Dict[str, Any]]]:
        """Execute a node and return (response, next_node_id, updated_variables).
        
        Args:
            node: Node model instance to execute
            user_message: User's input text (optional, for question/input nodes)
            variables: Current conversation variables context
            
        Returns:
            Tuple of (bot_response_text, next_node_id, updated_variables)
            
        Raises:
            ValueError: If node type not supported
        """
        if node.node_type not in self.SUPPORTED_NODES:
            raise ValueError(f"Unsupported node type: {node.node_type}")

        variables = variables or {}
        
        # Route to appropriate executor based on node type
        if node.node_type == "start":
            return await self._execute_start(node, variables)
        elif node.node_type == "message":
            return await self._execute_message(node, variables)
        elif node.node_type == "question":
            return await self._execute_question(node, user_message, variables)
        elif node.node_type == "condition":
            return await self._execute_condition(node, variables)
        elif node.node_type == "end":
            return await self._execute_end(node, variables)
        elif node.node_type == "jump":
            return await self._execute_jump(node, variables)
        else:
            # Future node types
            return "Node type not yet implemented", None, variables

    async def _execute_start(
        self,
        node: "Node",
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute START node - entry point of flow.
        
        START node data:
        {
            "greeting": "Olá! Bem-vindo ao nosso atendimento",
            "next_node_id": "uuid-of-next-node"
        }
        """
        data = node.data or {}
        greeting = data.get("greeting", "Bem-vindo ao nosso atendimento!")
        next_node_id = data.get("next_node_id")

        logger.info(f"START node: {node.node_id} → {next_node_id}")

        return greeting, next_node_id, variables

    async def _execute_message(
        self,
        node: "Node",
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute MESSAGE node - send message to user.
        
        MESSAGE node data:
        {
            "text": "Sua pergunta?",
            "buttons": [
                {"label": "Opção 1", "value": "opt1", "next_node_id": "uuid"}
            ],
            "next_node_id": "uuid"  # Default next if no buttons
        }
        """
        data = node.data or {}
        text = data.get("text", "")
        buttons = data.get("buttons", [])
        next_node_id = data.get("next_node_id")

        # Build response with buttons if present
        response = text
        if buttons:
            response += "\n\nOpções:"
            for i, btn in enumerate(buttons, 1):
                response += f"\n{i}. {btn.get('label', f'Opção {i}')}"

        logger.info(f"MESSAGE node: {node.node_id} → {next_node_id}")

        return response, next_node_id, variables

    async def _execute_question(
        self,
        node: "Node",
        user_message: Optional[str],
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute QUESTION node - ask and capture response.
        
        QUESTION node data:
        {
            "question": "Qual seu nome?",
            "variable": "customer_name",
            "validation": {"type": "text", "min_length": 2},
            "next_node_id": "uuid"
        }
        """
        data = node.data or {}
        question = data.get("question", "Qual sua resposta?")
        variable_name = data.get("variable", "response")
        validation = data.get("validation", {})
        next_node_id = data.get("next_node_id")

        # If no user message, ask the question
        if not user_message:
            logger.info(f"QUESTION node: {node.node_id} asking '{question}'")
            return question, None, variables

        # Validate user response
        is_valid = self._validate_response(user_message, validation)

        if not is_valid:
            error_msg = validation.get("error_message", "Resposta inválida. Tente novamente.")
            return error_msg, node.id, variables  # Re-ask same node

        # Store response in variables
        updated_vars = {**variables, variable_name: user_message}
        logger.info(f"QUESTION node: {node.node_id} saved '{variable_name}' = '{user_message}'")

        return "", next_node_id, updated_vars

    async def _execute_condition(
        self,
        node: "Node",
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute CONDITION node - branch based on variable.
        
        CONDITION node data:
        {
            "variable": "customer_type",
            "operator": "==",  # ==, !=, >, <, >=, <=, in, not_in
            "value": "premium",
            "true_next_node_id": "uuid",
            "false_next_node_id": "uuid"
        }
        """
        data = node.data or {}
        variable = data.get("variable")
        operator = data.get("operator", "==")
        value = data.get("value")
        true_next = data.get("true_next_node_id")
        false_next = data.get("false_next_node_id")

        if not variable or variable not in variables:
            logger.warning(f"CONDITION: variable '{variable}' not found")
            next_node_id = false_next
        else:
            var_value = variables[variable]
            condition_met = self._evaluate_condition(var_value, operator, value)
            next_node_id = true_next if condition_met else false_next

        logger.info(f"CONDITION: {variable} {operator} {value} → {next_node_id}")

        return "", next_node_id, variables

    async def _execute_jump(
        self,
        node: "Node",
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute JUMP node - jump to another flow.
        
        JUMP node data:
        {
            "target_flow_id": "uuid",
            "pass_variables": true,
            "return_to_parent": true
        }
        """
        data = node.data or {}
        target_flow_id = data.get("target_flow_id")

        logger.info(f"JUMP node: {node.node_id} → flow {target_flow_id}")

        # Return special marker to indicate flow jump
        return "", f"__JUMP__{target_flow_id}", variables

    async def _execute_end(
        self,
        node: "Node",
        variables: Dict[str, Any],
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """Execute END node - close conversation.
        
        END node data:
        {
            "message": "Obrigado! Sua conversa foi encerrada.",
            "trigger_handoff": false
        }
        """
        data = node.data or {}
        message = data.get("message", "Conversa encerrada. Obrigado!")

        logger.info(f"END node: {node.node_id}")

        # Return special marker to indicate conversation end
        return message, "__END__", variables

    # ============= Helper Methods =============

    def _validate_response(
        self,
        response: str,
        validation: Dict[str, Any],
    ) -> bool:
        """Validate user response against validation rules.
        
        Args:
            response: User's input text
            validation: Validation rules dict
            
        Returns:
            True if valid, False otherwise
        """
        if not validation:
            return True

        validation_type = validation.get("type", "text")

        if validation_type == "text":
            min_len = validation.get("min_length", 0)
            max_len = validation.get("max_length", 1000)

            if len(response) < min_len or len(response) > max_len:
                return False

        elif validation_type == "email":
            import re
            pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(pattern, response):
                return False

        elif validation_type == "phone":
            import re
            # Accept digits and common phone chars
            if not re.match(r'^[\d\-\+\(\)\s]+$', response):
                return False

        elif validation_type == "number":
            try:
                float(response)
            except ValueError:
                return False

        elif validation_type == "choice":
            choices = validation.get("choices", [])
            if response not in choices:
                return False

        return True

    def _evaluate_condition(
        self,
        var_value: Any,
        operator: str,
        compare_value: Any,
    ) -> bool:
        """Evaluate a condition expression.
        
        Args:
            var_value: Variable value
            operator: Comparison operator
            compare_value: Value to compare against
            
        Returns:
            True if condition met, False otherwise
        """
        try:
            if operator == "==":
                return var_value == compare_value
            elif operator == "!=":
                return var_value != compare_value
            elif operator == ">":
                return float(var_value) > float(compare_value)
            elif operator == "<":
                return float(var_value) < float(compare_value)
            elif operator == ">=":
                return float(var_value) >= float(compare_value)
            elif operator == "<=":
                return float(var_value) <= float(compare_value)
            elif operator == "in":
                return var_value in (compare_value if isinstance(compare_value, (list, tuple)) else [compare_value])
            elif operator == "not_in":
                return var_value not in (compare_value if isinstance(compare_value, (list, tuple)) else [compare_value])
            elif operator == "contains":
                return str(compare_value).lower() in str(var_value).lower()
            elif operator == "starts_with":
                return str(var_value).lower().startswith(str(compare_value).lower())
            else:
                logger.warning(f"Unknown operator: {operator}")
                return False
        except Exception as e:
            logger.error(f"Condition evaluation error: {e}")
            return False

    def is_flow_jump(self, next_node_id: Optional[str]) -> Tuple[bool, Optional[str]]:
        """Check if next_node_id represents a flow jump.
        
        Args:
            next_node_id: Next node ID to check
            
        Returns:
            Tuple of (is_jump, target_flow_id)
        """
        if next_node_id and next_node_id.startswith("__JUMP__"):
            target = next_node_id.replace("__JUMP__", "")
            return True, target
        return False, None

    def is_conversation_end(self, next_node_id: Optional[str]) -> bool:
        """Check if next_node_id represents conversation end.
        
        Args:
            next_node_id: Next node ID to check
            
        Returns:
            True if conversation should end
        """
        return next_node_id == "__END__"
