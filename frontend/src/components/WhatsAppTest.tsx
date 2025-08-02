import React, { useState, useEffect } from 'react';

interface WhatsAppInstance {
  name: string;
  provider: string;
  connected: boolean;
}

export default function WhatsAppTest() {
  const [instances, setInstances] = useState<string[]>([]);
  const [instanceName, setInstanceName] = useState('');
  const [provider, setProvider] = useState<'evolution' | 'official'>('evolution');
  
  // Evolution API config
  const [evolutionUrl, setEvolutionUrl] = useState('http://localhost:8080/evolution/api');
  const [evolutionApiKey, setEvolutionApiKey] = useState('test-api-key');
  
  // Official API config
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('verify_token_123');
  
  const [selectedInstance, setSelectedInstance] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const fetchInstances = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/whatsapp/instances');
      const data = await response.json();
      setInstances(data.instances || []);
      addLog(`Fetched ${data.count} instances`);
    } catch (error) {
      addLog(`Error fetching instances: ${error}`);
    }
  };

  const createInstance = async () => {
    if (!instanceName) {
      addLog('Please enter an instance name');
      return;
    }

    let requestBody: any = {
      provider,
      instance_name: instanceName,
    };

    if (provider === 'evolution') {
      if (!evolutionUrl || !evolutionApiKey) {
        addLog('Please fill Evolution API configuration');
        return;
      }
      requestBody.evolution_config = {
        base_url: evolutionUrl,
        api_key: evolutionApiKey,
      };
    } else {
      if (!phoneNumberId || !accessToken) {
        addLog('Please fill Official API configuration');
        return;
      }
      requestBody.official_config = {
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
      };
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/whatsapp/instance/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`${provider === 'evolution' ? 'Evolution' : 'Official'} instance created: ${instanceName}`);
        if (provider === 'official' && data.phone_number) {
          addLog(`Phone number: ${data.phone_number}`);
          addLog(`Verified name: ${data.verified_name}`);
        }
        fetchInstances();
        setInstanceName('');
      } else {
        addLog(`Error creating instance: ${data.error || 'Unknown error'}`);
        if (data.details) {
          addLog(`Details: ${data.details}`);
        }
      }
    } catch (error) {
      addLog(`Error creating instance: ${error}`);
    }
  };

  const getInstanceStatus = async (name: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/whatsapp/instance/${name}/status`);
      const data = await response.json();
      addLog(`Instance ${name} status: ${data.connected ? 'Connected' : 'Not connected'}`);
    } catch (error) {
      addLog(`Error getting status: ${error}`);
    }
  };

  const getQRCode = async (name: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/whatsapp/instance/${name}/qrcode`);
      const data = await response.json();
      if (data.qr_code) {
        // Display QR code in a new window
        const qrWindow = window.open('', 'QR Code', 'width=400,height=400');
        if (qrWindow) {
          qrWindow.document.write(`<img src="${data.qr_code}" alt="QR Code" style="width:100%;">`);
        }
        addLog(`QR code retrieved for ${name}`);
      }
    } catch (error) {
      addLog(`Error getting QR code: ${error}`);
    }
  };

  const sendMessage = async () => {
    if (!selectedInstance || !phoneNumber || !message) {
      addLog('Please fill all fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_name: selectedInstance,
          to: phoneNumber,
          text: message,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`Message sent successfully! ID: ${data.message_id}`);
        setMessage('');
      } else {
        addLog(`Error sending message: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      addLog(`Error sending message: ${error}`);
    }
  };

  const deleteInstance = async (name: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/whatsapp/instance/${name}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addLog(`Instance deleted: ${name}`);
        fetchInstances();
      } else {
        addLog(`Error deleting instance`);
      }
    } catch (error) {
      addLog(`Error deleting instance: ${error}`);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Integration Test</h1>

      {/* Create Instance */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Create WhatsApp Instance</h2>
        
        {/* Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Provider:</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="evolution"
                checked={provider === 'evolution'}
                onChange={(e) => setProvider(e.target.value as 'evolution' | 'official')}
                className="mr-2"
              />
              Evolution API
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="official"
                checked={provider === 'official'}
                onChange={(e) => setProvider(e.target.value as 'evolution' | 'official')}
                className="mr-2"
              />
              Official WhatsApp API
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="Instance Name"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          
          {provider === 'evolution' ? (
            <>
              <input
                type="text"
                placeholder="Evolution API URL"
                value={evolutionUrl}
                onChange={(e) => setEvolutionUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="API Key"
                value={evolutionApiKey}
                onChange={(e) => setEvolutionApiKey(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                placeholder="Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Webhook Verify Token"
                value={webhookVerifyToken}
                onChange={(e) => setWebhookVerifyToken(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
              <div className="text-sm text-gray-600">
                <p>Get your credentials from: <a href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">WhatsApp Business Manager</a></p>
              </div>
            </>
          )}
          
          <button
            onClick={createInstance}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Instance
          </button>
        </div>
      </div>

      {/* Instances List */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">WhatsApp Instances</h2>
        <div className="space-y-2">
          {instances.length === 0 ? (
            <p className="text-gray-500">No instances created yet</p>
          ) : (
            instances.map((instance) => (
              <div key={instance} className="flex items-center justify-between p-2 border rounded">
                <span>{instance}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => getInstanceStatus(instance)}
                    className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                  >
                    Status
                  </button>
                  <button
                    onClick={() => getQRCode(instance)}
                    className="text-sm bg-green-200 px-2 py-1 rounded hover:bg-green-300"
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => setSelectedInstance(instance)}
                    className="text-sm bg-blue-200 px-2 py-1 rounded hover:bg-blue-300"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => deleteInstance(instance)}
                    className="text-sm bg-red-200 px-2 py-1 rounded hover:bg-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Send Message */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Send Message</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium mb-1">Selected Instance:</label>
            <input
              type="text"
              value={selectedInstance}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100"
              placeholder="Select an instance first"
            />
          </div>
          <input
            type="text"
            placeholder="Phone Number (with country code)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
          <button
            onClick={sendMessage}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Send Message
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <div className="bg-gray-100 rounded p-2 h-48 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}