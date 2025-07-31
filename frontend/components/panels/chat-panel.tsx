import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useRoom';
import { ChatMessage } from '@/store/useRoomStore';

export const ChatPanel: React.FC = () => {
  const {
    messages,
    isChatPanelOpen,
    sendTextMessage,
    sendPrivateMessage,
    closeChat,
    markMessagesRead,
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when panel is open
  useEffect(() => {
    if (isChatPanelOpen) {
      markMessagesRead();
    }
  }, [isChatPanelOpen, markMessagesRead]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    if (selectedParticipantId) {
      sendPrivateMessage(newMessage, selectedParticipantId);
    } else {
      sendTextMessage(newMessage);
    }

    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">Chat</h3>
        <button
          onClick={closeChat}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Private message indicator */}
      {selectedParticipantId && (
        <div className="px-4 py-2 bg-blue-600 text-white text-sm">
          Sending private message to {/* participant name would go here */}
          <button
            onClick={() => setSelectedParticipantId(null)}
            className="ml-2 text-blue-200 hover:text-white"
          >
            (cancel)
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isSystemMessage = message.type === 'system';
  const isPrivateMessage = message.type === 'private';

  if (isSystemMessage) {
    return (
      <div className="text-center">
        <span className="text-gray-400 text-sm bg-gray-700 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-300">
          {message.username}
        </span>
        <span className="text-xs text-gray-500">
          {formatTimestamp(message.timestamp)}
        </span>
        {isPrivateMessage && (
          <span className="text-xs text-blue-400 bg-blue-900 px-2 py-1 rounded">
            Private
          </span>
        )}
      </div>
      <div className={`p-3 rounded-lg ${
        isPrivateMessage 
          ? 'bg-blue-900 border border-blue-700' 
          : 'bg-gray-700'
      }`}>
        <p className="text-white text-sm whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
};

const formatTimestamp = (timestamp: Date) => {
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
