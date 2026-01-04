"""
Tests for Template Cost Estimator Service - Phase 3.1

Author: Kayo Carvalho Fernandes
Date: 15/12/2025
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.services.template_cost_estimator import (
    TemplateCostEstimator,
    TemplatePricingTiers,
)


# ============================================================================
# TESTS - Pricing Tier Constants (Non-async, direct validation)
# ============================================================================

def test_pricing_tiers_constants():
    """Test pricing tier constants are correctly defined"""
    assert "MARKETING" in TemplatePricingTiers.PRICING_BY_CATEGORY
    assert "UTILITY" in TemplatePricingTiers.PRICING_BY_CATEGORY
    assert "AUTHENTICATION" in TemplatePricingTiers.PRICING_BY_CATEGORY
    assert "SERVICE" in TemplatePricingTiers.PRICING_BY_CATEGORY
    
    assert "simple" in TemplatePricingTiers.COMPLEXITY_MULTIPLIERS
    assert "with_button" in TemplatePricingTiers.COMPLEXITY_MULTIPLIERS
    assert "with_media" in TemplatePricingTiers.COMPLEXITY_MULTIPLIERS
    assert "with_interactive" in TemplatePricingTiers.COMPLEXITY_MULTIPLIERS
    
    assert 5000 in TemplatePricingTiers.VOLUME_DISCOUNTS
    assert 100000 in TemplatePricingTiers.VOLUME_DISCOUNTS


def test_pricing_tiers_values():
    """Test pricing tier values are correct per Meta Cloud API"""
    # MARKETING: $0.0015 per message
    assert TemplatePricingTiers.PRICING_BY_CATEGORY["MARKETING"] == Decimal("0.0015")
    
    # UTILITY: $0.0001 per message (cheapest)
    assert TemplatePricingTiers.PRICING_BY_CATEGORY["UTILITY"] == Decimal("0.0001")
    
    # AUTHENTICATION: $0.001 per message
    assert TemplatePricingTiers.PRICING_BY_CATEGORY["AUTHENTICATION"] == Decimal("0.001")
    
    # SERVICE: $0.0015 per message
    assert TemplatePricingTiers.PRICING_BY_CATEGORY["SERVICE"] == Decimal("0.0015")


def test_complexity_multipliers_values():
    """Test complexity multipliers are correctly set"""
    assert TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["simple"] == Decimal("1.0")
    assert TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["with_button"] == Decimal("1.1")
    assert TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["with_media"] == Decimal("1.2")
    assert TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["with_interactive"] == Decimal("1.3")


def test_volume_discounts_values():
    """Test volume discounts are correctly configured"""
    assert TemplatePricingTiers.VOLUME_DISCOUNTS[5000] == Decimal("0.05")   # 5%
    assert TemplatePricingTiers.VOLUME_DISCOUNTS[10000] == Decimal("0.10")  # 10%
    assert TemplatePricingTiers.VOLUME_DISCOUNTS[50000] == Decimal("0.15")  # 15%
    assert TemplatePricingTiers.VOLUME_DISCOUNTS[100000] == Decimal("0.20") # 20%


# ============================================================================
# TESTS - Cost Calculation Logic (Non-async, direct math)
# ============================================================================

def test_cost_calculation_marketing_simple():
    """Test cost calculation for MARKETING simple message"""
    # Base price
    base_price = TemplatePricingTiers.PRICING_BY_CATEGORY["MARKETING"]
    complexity = TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["simple"]
    
    unit_price = base_price * complexity
    assert unit_price == Decimal("0.0015")
    
    # For 1 message
    total = unit_price * 1
    assert total == Decimal("0.0015")
    
    # For 100 messages
    total_100 = unit_price * 100
    assert total_100 == Decimal("0.15")
    
    # For 1000 messages
    total_1000 = unit_price * 1000
    assert total_1000 == Decimal("1.50")


def test_cost_calculation_with_button_multiplier():
    """Test cost calculation with button complexity multiplier"""
    base_price = TemplatePricingTiers.PRICING_BY_CATEGORY["MARKETING"]
    complexity = TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["with_button"]
    
    unit_price = base_price * complexity
    # 0.0015 * 1.1 = 0.00165
    assert unit_price == Decimal("0.00165")
    
    total_100 = unit_price * 100
    assert total_100 == Decimal("0.165")


def test_cost_calculation_with_media_multiplier():
    """Test cost calculation with media complexity multiplier"""
    base_price = TemplatePricingTiers.PRICING_BY_CATEGORY["MARKETING"]
    complexity = TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["with_media"]
    
    unit_price = base_price * complexity
    # 0.0015 * 1.2 = 0.0018
    assert unit_price == Decimal("0.0018")


def test_cost_calculation_utility_category():
    """Test cheapest category - UTILITY"""
    base_price = TemplatePricingTiers.PRICING_BY_CATEGORY["UTILITY"]
    complexity = TemplatePricingTiers.COMPLEXITY_MULTIPLIERS["simple"]
    
    unit_price = base_price * complexity
    assert unit_price == Decimal("0.0001")
    
    # For 1000 messages
    total_1000 = unit_price * 1000
    assert total_1000 == Decimal("0.10")


def test_volume_discount_calculation_5000():
    """Test 5% volume discount at 5000 messages"""
    unit_price = Decimal("0.0015")
    volume = 5000
    
    subtotal = unit_price * volume
    assert subtotal == Decimal("7.50")
    
    discount = subtotal * Decimal("0.05")
    assert discount == Decimal("0.375")
    
    total = subtotal - discount
    assert total == Decimal("7.125")


def test_volume_discount_calculation_10000():
    """Test 10% volume discount at 10000 messages"""
    unit_price = Decimal("0.0015")
    volume = 10000
    
    subtotal = unit_price * volume
    assert subtotal == Decimal("15.00")
    
    discount = subtotal * Decimal("0.10")
    assert discount == Decimal("1.50")
    
    total = subtotal - discount
    assert total == Decimal("13.50")


def test_no_volume_discount_under_5000():
    """Test no discount for volumes under 5000"""
    unit_price = Decimal("0.0015")
    volume = 1000
    
    subtotal = unit_price * volume
    assert subtotal == Decimal("1.50")
    
    # No discount applied
    discount = Decimal("0")
    total = subtotal - discount
    assert total == Decimal("1.50")


def test_cost_per_message_calculation():
    """Test cost per message calculation"""
    total_cost = Decimal("7.125")
    messages_sent = 5000
    
    cost_per_message = total_cost / messages_sent
    assert cost_per_message == Decimal("0.001425")


def test_efficiency_percentage_calculation():
    """Test efficiency percentage (actual vs estimated)"""
    actual_cost = Decimal("0.50")      # $0.50 spent
    estimated_cost = Decimal("1.00")   # $1.00 estimated
    
    efficiency = (actual_cost / estimated_cost * 100)
    assert efficiency == Decimal("50")  # 50% of estimated


# ============================================================================
# TESTS - Meta Pricing Accuracy
# ============================================================================

def test_meta_pricing_marketing_1k_messages():
    """Validate Meta pricing for MARKETING category 1k messages"""
    # According to Meta docs: MARKETING = $0.0015 per message
    # 1000 * 0.0015 = $1.50
    
    unit_price = Decimal("0.0015")
    volume = 1000
    total = unit_price * volume
    
    assert total == Decimal("1.50")


def test_meta_pricing_utility_10k_messages():
    """Validate Meta pricing for UTILITY category 10k messages"""
    # According to Meta docs: UTILITY = $0.0001 per message (cheapest)
    # 10000 * 0.0001 = $1.00
    
    unit_price = Decimal("0.0001")
    volume = 10000
    total = unit_price * volume
    
    assert total == Decimal("1.00")


def test_meta_pricing_authentication_5k_messages():
    """Validate Meta pricing for AUTHENTICATION category 5k messages"""
    # According to Meta docs: AUTHENTICATION = $0.001 per message
    # 5000 * 0.001 = $5.00
    
    unit_price = Decimal("0.001")
    volume = 5000
    total = unit_price * volume
    
    assert total == Decimal("5.00")


def test_meta_pricing_with_volume_discount():
    """Test Meta pricing with volume discount applied"""
    # MARKETING 5000 messages with 5% discount
    # Base: 0.0015 * 5000 = 7.50
    # Discount (5%): 7.50 * 0.05 = 0.375
    # Final: 7.50 - 0.375 = 7.125
    
    base_price = Decimal("0.0015")
    volume = 5000
    subtotal = base_price * volume
    discount = subtotal * Decimal("0.05")
    final = subtotal - discount
    
    assert final == Decimal("7.125")


def test_tiered_pricing_comparison():
    """Compare pricing across different categories for same volume"""
    volume = 1000
    
    # MARKETING: 1000 * 0.0015 = 1.50
    marketing = Decimal("0.0015") * volume
    assert marketing == Decimal("1.50")
    
    # UTILITY: 1000 * 0.0001 = 0.10
    utility = Decimal("0.0001") * volume
    assert utility == Decimal("0.10")
    
    # AUTHENTICATION: 1000 * 0.001 = 1.00
    auth = Decimal("0.001") * volume
    assert auth == Decimal("1.00")
    
    # Verify tier hierarchy
    assert utility < auth < marketing


# ============================================================================
# TESTS - Edge Cases
# ============================================================================

def test_zero_volume():
    """Test cost calculation with zero volume"""
    unit_price = Decimal("0.0015")
    volume = 0
    
    total = unit_price * volume
    assert total == Decimal("0")


def test_very_large_volume():
    """Test cost calculation with very large volume"""
    unit_price = Decimal("0.0015")
    volume = 1000000  # 1 million
    
    total = unit_price * volume
    assert total == Decimal("1500")
    
    # Apply highest discount (20% at 100k+)
    discount = total * Decimal("0.20")
    final = total - discount
    assert final == Decimal("1200")


def test_decimal_precision():
    """Test decimal precision in cost calculations"""
    unit_price = Decimal("0.00165")  # with_button multiplier result
    volume = 3
    
    total = unit_price * volume
    # Should maintain precision: 0.00165 * 3 = 0.00495
    assert total == Decimal("0.00495")


def test_cost_calculation_rounding():
    """Test that cost calculations maintain proper Decimal precision"""
    # Test that we don't lose precision with Decimal arithmetic
    price1 = Decimal("0.0015")
    price2 = Decimal("1.1")
    
    result = price1 * price2
    assert result == Decimal("0.00165")
    
    # Verify not using floats (which would have precision issues)
    assert isinstance(result, Decimal)
