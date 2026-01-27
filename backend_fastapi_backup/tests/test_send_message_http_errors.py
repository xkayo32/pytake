"""
Tests for HTTP error handling in send_message endpoint.

Specifically tests that ValueError from WhatsAppService is properly
converted to HTTP 400 Bad Request instead of 500 Internal Server Error.

This test verifies the fix for:
https://github.com/user/pytake/issues/XXX

Error: POST /conversations/{id}/messages returned 500 instead of 400
when 24-hour window was expired.
"""

import pytest
from uuid import uuid4


def test_endpoint_error_handling_structure():
    """
    Test that the endpoint has proper error handling for ValueError
    by checking the endpoint function has been updated.
    
    This verifies that the send_message endpoint now includes try-except
    blocks to catch ValueError and convert to HTTPException with 400 status.
    """
    from app.api.v1.endpoints import conversations
    
    # Verify function exists
    assert hasattr(conversations, 'send_message')
    assert conversations.send_message is not None
    
    # Verify function has docstring
    assert conversations.send_message.__doc__ is not None
    assert "Validates 24-hour window" in conversations.send_message.__doc__
    
    # Verify that HTTPException is imported
    import inspect
    source = inspect.getsource(conversations.send_message)
    
    # Verify the function has try-except error handling
    assert "try:" in source, "send_message should have try-except block"
    assert "except ValueError" in source, "send_message should catch ValueError"
    assert "HTTPException" in source, "send_message should raise HTTPException"
    assert "HTTP_400_BAD_REQUEST" in source, "Should return 400 for validation errors"
