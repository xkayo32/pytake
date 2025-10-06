'use client';

import { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Olá! 👋 Como posso ajudar você hoje?',
      sender: 'bot',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simular resposta automática
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: 'Obrigado pela mensagem! Nossa equipe responderá em breve. 🚀',
        sender: 'bot',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-2xl flex items-center justify-center hover:shadow-green-500/50 transition-all"
          >
            <MessageCircle className="w-8 h-8 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              1
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">PyTake</h3>
                  <p className="text-xs text-green-100">Online agora</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center hover:shadow-lg transition"
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Powered by <span className="font-semibold text-indigo-600">PyTake</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
