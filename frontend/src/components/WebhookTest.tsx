import React, { useState, useEffect } from 'react';

export default function WebhookTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState('verify_token_123');
  const [isListening, setIsListening] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Generate webhook URL automatically
  useEffect(() => {
    const baseUrl = window.location.protocol + '//' + window.location.hostname;
    const port = window.location.hostname === 'localhost' ? ':8080' : '';
    setWebhookUrl(`${baseUrl}${port}/api/v1/whatsapp/webhook`);
  }, []);

  const testWebhookVerification = async () => {
    try {
      const testUrl = `${webhookUrl}?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=${verifyToken}`;
      
      addLog('Testing webhook verification...');
      addLog(`GET ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'GET',
      });

      if (response.ok) {
        const challenge = await response.text();
        addLog(`✅ Webhook verification successful! Challenge: ${challenge}`);
      } else {
        addLog(`❌ Webhook verification failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ Error testing webhook: ${error}`);
    }
  };

  const testWebhookMessage = async () => {
    try {
      addLog('Testing webhook message reception...');
      
      const testPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "15550559999",
                    phone_number_id: "123456789"
                  },
                  messages: [
                    {
                      from: "5511999999999",
                      id: "wamid.test123",
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: "text",
                      text: {
                        body: "Hello from webhook test!"
                      }
                    }
                  ]
                },
                field: "messages"
              }
            ]
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Test message sent successfully: ${JSON.stringify(result)}`);
      } else {
        addLog(`❌ Failed to send test message: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      addLog(`❌ Error sending test message: ${error}`);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    addLog('📋 Webhook URL copied to clipboard!');
  };

  const copySetupInstructions = () => {
    const instructions = `WhatsApp Business API Webhook Setup:

1. Go to: https://developers.facebook.com/apps
2. Select your WhatsApp Business App
3. Go to WhatsApp > Configuration
4. In "Webhook" section:
   - Callback URL: ${webhookUrl}
   - Verify token: ${verifyToken}
5. Click "Verify and save"
6. Subscribe to webhook fields: messages, message_deliveries

For testing locally, you may need to use ngrok:
1. Install ngrok: https://ngrok.com/
2. Run: ngrok http 8080
3. Use the ngrok URL: https://xxxxx.ngrok.io/api/v1/whatsapp/webhook`;

    navigator.clipboard.writeText(instructions);
    addLog('📋 Setup instructions copied to clipboard!');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Webhook Test</h1>

      {/* Webhook Configuration */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Webhook Configuration</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Webhook URL:</label>
            <div className="flex">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-l bg-gray-100 font-mono text-sm"
              />
              <button
                onClick={copyWebhookUrl}
                className="px-3 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Verify Token:</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={copySetupInstructions}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              📋 Copy Setup Instructions
            </button>
          </div>
        </div>
      </div>

      {/* Test Webhook */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Test Webhook</h2>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <button
              onClick={testWebhookVerification}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              🔍 Test Verification
            </button>
            <button
              onClick={testWebhookMessage}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              📨 Test Message Reception
            </button>
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Note:</strong> For local testing, you need to expose your localhost to the internet.</p>
            <p>Options:</p>
            <ul className="list-disc list-inside mt-1">
              <li><strong>ngrok:</strong> <code>ngrok http 8080</code> - Then use the ngrok URL</li>
              <li><strong>localtunnel:</strong> <code>npx localtunnel --port 8080</code></li>
              <li><strong>Deploy to cloud:</strong> Use services like Heroku, Railway, or Vercel</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Webhook Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Real-time Webhook Monitoring</h2>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isListening ? 'Webhook is ready to receive messages' : 'Webhook not configured'}</span>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>Check the server logs in the terminal to see incoming webhook requests.</p>
            <p>All webhook events will be logged with detailed information.</p>
          </div>
        </div>
      </div>

      {/* Test Logs */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Test Logs</h2>
        <div className="bg-gray-100 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No test logs yet. Click the test buttons above to start.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setLogs([])}
          className="mt-2 text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        >
          Clear Logs
        </button>
      </div>

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">📚 How to Configure WhatsApp Webhook</h3>
        <div className="text-sm space-y-2">
          <p><strong>1. Expose your local server:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Install ngrok: <code className="bg-gray-200 px-1 rounded">brew install ngrok</code> or download from ngrok.com</li>
            <li>Run: <code className="bg-gray-200 px-1 rounded">ngrok http 8080</code></li>
            <li>Copy the HTTPS URL (e.g., https://abc123.ngrok.io)</li>
          </ul>

          <p><strong>2. Configure in Facebook Developer Console:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Facebook Developer Console</a></li>
            <li>Select your WhatsApp Business App</li>
            <li>Navigate to WhatsApp &gt; Configuration</li>
            <li>Add webhook URL: <code className="bg-gray-200 px-1 rounded">https://your-ngrok-url.ngrok.io/api/v1/whatsapp/webhook</code></li>
            <li>Set verify token: <code className="bg-gray-200 px-1 rounded">{verifyToken}</code></li>
            <li>Subscribe to: messages, message_deliveries</li>
          </ul>

          <p><strong>3. Test:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Send a message to your WhatsApp Business number</li>
            <li>Check the server logs to see the webhook being triggered</li>
            <li>Use the test buttons above to verify webhook functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
}