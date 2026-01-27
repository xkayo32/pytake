"""
Custom validators for Brazilian-specific fields and common validations
"""
import re
from rest_framework import serializers


class CPFValidator:
    """Validador de CPF (Cadastro de Pessoa Física)"""
    
    def __call__(self, value):
        if not value:
            return
        
        # Remove non-digits
        cpf = re.sub(r'\D', '', value)
        
        # Check length
        if len(cpf) != 11:
            raise serializers.ValidationError("CPF deve ter 11 dígitos")
        
        # Check if all digits are the same
        if cpf == cpf[0] * 11:
            raise serializers.ValidationError("CPF inválido")
        
        # Validate first digit
        sum_val = sum(int(cpf[i]) * (10 - i) for i in range(9))
        remainder = sum_val % 11
        first_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(cpf[9]) != first_digit:
            raise serializers.ValidationError("CPF inválido")
        
        # Validate second digit
        sum_val = sum(int(cpf[i]) * (11 - i) for i in range(10))
        remainder = sum_val % 11
        second_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(cpf[10]) != second_digit:
            raise serializers.ValidationError("CPF inválido")


class CNPJValidator:
    """Validador de CNPJ (Cadastro Nacional de Pessoa Jurídica)"""
    
    def __call__(self, value):
        if not value:
            return
        
        # Remove non-digits
        cnpj = re.sub(r'\D', '', value)
        
        # Check length
        if len(cnpj) != 14:
            raise serializers.ValidationError("CNPJ deve ter 14 dígitos")
        
        # Check if all digits are the same
        if cnpj == cnpj[0] * 14:
            raise serializers.ValidationError("CNPJ inválido")
        
        # Validate first digit
        sum_val = sum(int(cnpj[i]) * (5 - i % 8) for i in range(12))
        remainder = sum_val % 11
        first_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(cnpj[12]) != first_digit:
            raise serializers.ValidationError("CNPJ inválido")
        
        # Validate second digit
        sum_val = sum(int(cnpj[i]) * (6 - i % 8) for i in range(13))
        remainder = sum_val % 11
        second_digit = 0 if remainder < 2 else 11 - remainder
        
        if int(cnpj[13]) != second_digit:
            raise serializers.ValidationError("CNPJ inválido")


class PhoneValidator:
    """Validador de número de telefone"""
    
    def __call__(self, value):
        if not value:
            return
        
        # Remove non-digits
        phone = re.sub(r'\D', '', value)
        
        # Check length (Brazil: 10-11 digits)
        if len(phone) < 10 or len(phone) > 11:
            raise serializers.ValidationError("Telefone deve ter 10 ou 11 dígitos")
        
        # Check if starts with valid area code (11-99)
        area_code = int(phone[:2])
        if area_code < 11 or area_code > 99:
            raise serializers.ValidationError("Código de área inválido")


class WhatsAppIDValidator:
    """Validador de WhatsApp ID (formato: 55NNNNNNNNNN ou 55NNNNNNNNNNN)"""
    
    def __call__(self, value):
        if not value:
            return
        
        # Remove non-digits
        wa_id = re.sub(r'\D', '', str(value))
        
        # Check if starts with 55 (Brazil)
        if not wa_id.startswith('55'):
            raise serializers.ValidationError("ID do WhatsApp deve começar com código de país (55)")
        
        # Check length (55 + 10-11 digits)
        if len(wa_id) < 12 or len(wa_id) > 13:
            raise serializers.ValidationError("ID do WhatsApp inválido")


def validate_email_not_blank(value):
    """Ensure email is not blank"""
    if not value or not value.strip():
        raise serializers.ValidationError("Email não pode estar vazio")


def validate_organization_limit(organization, model_name, limit_field):
    """Generic validator for organization limits"""
    def validator(value):
        current_count = getattr(organization, f'current_{model_name}_count', 0)
        limit = getattr(organization, limit_field, None)
        
        if limit and current_count >= limit:
            raise serializers.ValidationError(
                f"Limite de {model_name} atingido para esta organização"
            )
    
    return validator
