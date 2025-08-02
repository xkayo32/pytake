import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

interface WSMessage {
  type: string;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  sender: {
    name: string;
    id: string;
  };
  content: string;
  timestamp: string;
  conversation_id: string;
}

export function WebSocketTest() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [roomId, setRoomId] = useState('room1');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  const connectWebSocket = () => {
    if (socket) {
      socket.close();
    }

    addLog('Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:8080/ws');
    
    ws.onopen = () => {
      setConnected(true);
      setSocket(ws);
      addLog('✅ Connected to WebSocket');
      
      // Authenticate (mock)
      const authMessage = {
        type: 'auth',
        token: 'demo-token-123'
      };
      ws.send(JSON.stringify(authMessage));
      addLog('🔐 Sent authentication');
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        addLog(`📥 Received: ${message.type}`);
        
        switch (message.type) {
          case 'ack':
            addLog(`✅ ${message.message}`);
            break;
            
          case 'new_message':
            const chatMsg: ChatMessage = {
              id: message.id,
              sender: message.sender,
              content: message.content,
              timestamp: message.timestamp,
              conversation_id: message.conversation_id
            };
            setMessages(prev => [...prev, chatMsg]);
            addLog(`💬 New message from ${message.sender.name}`);
            break;
            
          case 'user_presence':
            addLog(`👤 ${message.user.name} ${message.action} room ${message.conversation_id}`);
            break;
            
          case 'typing':
            if (message.is_typing) {
              addLog(`✏️ User ${message.user_id} is typing...`);
            }
            break;
            
          case 'error':
            addLog(`❌ Error: ${message.message}`);
            break;
            
          default:
            addLog(`📨 ${message.type}: ${JSON.stringify(message).slice(0, 50)}...`);
        }
      } catch (error) {
        addLog(`❌ Failed to parse message: ${event.data}`);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setSocket(null);
      setCurrentRoom(null);
      addLog('❌ WebSocket disconnected');
    };

    ws.onerror = (error) => {
      addLog(`❌ WebSocket error: ${error}`);
    };
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
    }
  };

  const joinRoom = () => {
    if (socket && connected) {
      const message = {
        type: 'join_room',
        conversation_id: roomId
      };
      socket.send(JSON.stringify(message));
      setCurrentRoom(roomId);
      addLog(`🚪 Joining room: ${roomId}`);
    }
  };

  const leaveRoom = () => {
    if (socket && connected && currentRoom) {
      const message = {
        type: 'leave_room',
        conversation_id: currentRoom
      };
      socket.send(JSON.stringify(message));
      addLog(`🚶 Leaving room: ${currentRoom}`);
      setCurrentRoom(null);
    }
  };

  const sendMessage = () => {
    if (socket && connected && currentRoom && messageInput.trim()) {
      const message = {
        type: 'send_message',
        conversation_id: currentRoom,
        content: messageInput.trim(),
        message_type: 'text'
      };
      socket.send(JSON.stringify(message));
      addLog(`📤 Sent message to ${currentRoom}`);
      setMessageInput('');
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (socket && connected && currentRoom) {
      const message = {
        type: 'typing',
        conversation_id: currentRoom,
        user_id: 'demo_user_123',
        is_typing: isTyping
      };
      socket.send(JSON.stringify(message));
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/ws/stats');
      const data = await response.json();
      setStats(data);
      addLog(`📊 Stats updated: ${data.active_connections} connections, ${data.active_rooms} rooms`);
    } catch (error) {
      addLog(`❌ Failed to fetch stats: ${error}`);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔗 WebSocket Chat Test
        </h1>
        <p className="text-gray-600">
          Testing real-time chat with WebSocket
        </p>
      </div>

      {/* Connection Status & Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">🔌 Connection Status</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={connected ? 'text-green-600' : 'text-red-600'}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Room: {currentRoom || 'Not in any room'}
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={connectWebSocket} 
                disabled={connected}
                className="bg-green-600 hover:bg-green-700"
              >
                Connect
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={disconnect} 
                disabled={!connected}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">📊 Server Stats</h3>
          {stats ? (
            <div className="space-y-1 text-sm">
              <div>Active Connections: <span className="font-mono">{stats.active_connections}</span></div>
              <div>Active Rooms: <span className="font-mono">{stats.active_rooms}</span></div>
              <div>Last Updated: <span className="font-mono">{new Date(stats.timestamp).toLocaleTimeString()}</span></div>
            </div>
          ) : (
            <div className="text-gray-500">Loading stats...</div>
          )}
          <Button size="sm" variant="outline" onClick={fetchStats} className="mt-2">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Room Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">🏠 Room Controls</h3>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID (e.g., room1)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            disabled={!connected}
          />
          <Button 
            onClick={joinRoom} 
            disabled={!connected || currentRoom === roomId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Join Room
          </Button>
          <Button 
            variant="outline" 
            onClick={leaveRoom} 
            disabled={!connected || !currentRoom}
          >
            Leave Room
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Messages */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">💬 Chat Messages</h3>
          <div className="h-64 overflow-y-auto border border-gray-100 rounded p-3 mb-3 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center">No messages yet...</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="mb-2 p-2 bg-white rounded border">
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.sender.name} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm">{msg.content}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => sendTyping(true)}
              onBlur={() => sendTyping(false)}
              placeholder={currentRoom ? "Type a message..." : "Join a room first"}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              disabled={!connected || !currentRoom}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!connected || !currentRoom || !messageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Send
            </Button>
          </div>
        </div>

        {/* Connection Log */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">📋 Connection Log</h3>
          <div className="h-64 overflow-y-auto border border-gray-100 rounded p-3 bg-gray-50 font-mono text-xs">
            {connectionLog.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              connectionLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setConnectionLog([])} 
            className="mt-2"
          >
            Clear Log
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click "Connect" to establish WebSocket connection</li>
          <li>Enter a room ID (e.g., "room1") and click "Join Room"</li>
          <li>Type messages in the chat input and press Enter to send</li>
          <li>Open this page in multiple tabs to test real-time chat</li>
          <li>Watch the connection log for WebSocket events</li>
          <li>Check server stats to see active connections</li>
        </ol>
      </div>
    </div>
  );
}