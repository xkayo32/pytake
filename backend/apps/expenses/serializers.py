"""
Expense serializers
"""
from rest_framework import serializers
from .models import Expense


class ExpenseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'description', 'amount', 'currency', 'category',
            'expense_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExpenseDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'organization', 'description', 'amount', 'currency',
            'category', 'expense_date', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
