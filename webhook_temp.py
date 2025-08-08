#!/usr/bin/env python3
"""
Temporary webhook server for WhatsApp validation
"""

from flask import Flask, request, jsonify
import os
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Webhook verify token
VERIFY_TOKEN = "verify_token_123"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/v1/whatsapp/webhook', methods=['GET', 'POST'])
def webhook():
    if request.method == 'GET':
        # Webhook verification
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        logger.info(f"Webhook verification: mode={mode}, token={token}, challenge={challenge}")
        
        if mode == 'subscribe' and token == VERIFY_TOKEN:
            logger.info(f"Webhook verified successfully, returning challenge: {challenge}")
            return challenge, 200
        else:
            logger.error(f"Webhook verification failed: expected token={VERIFY_TOKEN}, got token={token}")
            return 'Forbidden', 403
    
    elif request.method == 'POST':
        # Webhook notification
        data = request.get_json()
        logger.info(f"Received webhook: {data}")
        return jsonify({"status": "received"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting webhook server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)