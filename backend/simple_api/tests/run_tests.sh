#!/bin/bash

# PyTake Backend Test Runner
# Run all tests with proper environment setup

echo "🧪 PyTake Backend Test Suite"
echo "============================"
echo ""

# Load environment variables
export $(cat ../../.env | grep -v '^#' | xargs)

# Set test-specific variables
export RUST_LOG=debug
export RUST_BACKTRACE=1
export TEST_PHONE_NUMBER="+5561994013828"

echo "📋 Test Configuration:"
echo "  - WhatsApp Phone ID: $WHATSAPP_PHONE_NUMBER_ID"
echo "  - Test Phone Number: $TEST_PHONE_NUMBER"
echo "  - Database: $DATABASE_URL"
echo ""

# Run different test suites
echo "🔐 Running Authentication Tests..."
cargo test auth_tests -- --nocapture

echo ""
echo "📱 Running WhatsApp Tests..."
cargo test whatsapp_tests -- --nocapture

echo ""
echo "🔌 Running WebSocket Tests..."
cargo test websocket_tests -- --nocapture

echo ""
echo "💬 Running Conversation Tests..."
cargo test conversation_tests -- --nocapture

echo ""
echo "🔄 Running Flow Tests..."
cargo test flow_tests -- --nocapture

echo ""
echo "🚀 Running Integration Tests..."
cargo test integration_tests -- --nocapture

echo ""
echo "📊 Running All Tests with Coverage..."
cargo test --all -- --nocapture

echo ""
echo "✅ Test Suite Complete!"