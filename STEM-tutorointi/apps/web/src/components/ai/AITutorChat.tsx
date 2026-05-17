'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card-premium';
import { Button } from '@/components/ui/button-premium';
import { cn } from '@/lib/utils';
import { useSendMessage } from '@/lib/hooks/use-queries';
import { Subject } from '@/lib/prisma-types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  typing?: boolean;
}

interface AITutorChatProps {
  subject?: Subject;
  topic?: string;
  conversationId?: string;
  className?: string;
}

export function AITutorChat({ subject, topic, conversationId: initialConversationId, className }: AITutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI tutor. I'm here to help you learn${subject ? ` ${subject}` : ''}. What would you like to work on today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessageMutation = useSendMessage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sendMessageMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');

    try {
      const response = await sendMessageMutation.mutateAsync({
        conversationId,
        message: messageText,
        subject,
        topic,
      });

      // Update conversation ID if this was the first message
      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Explain this concept', icon: '💡' },
    { label: 'Give me a hint', icon: '🔍' },
    { label: 'Show me an example', icon: '📝' },
    { label: 'Check my answer', icon: '✓' },
  ];

  const isTyping = sendMessageMutation.isPending;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
            🤖
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">AI Tutor</h3>
          <p className="text-sm text-muted-foreground">Always here to help</p>
        </div>
        <Button variant="ghost" size="icon-sm">
          <span>⋮</span>
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-fade-in',
              message.role === 'user' && 'flex-row-reverse'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                message.role === 'assistant'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              )}
            >
              {message.role === 'assistant' ? '🤖' : '👤'}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'assistant'
                  ? 'bg-secondary'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.role === 'assistant'
                    ? 'text-muted-foreground'
                    : 'opacity-70'
                )}
              >
                {message.timestamp.toLocaleTimeString('fi-FI', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              🤖
            </div>
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => setInput(action.label)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap text-sm"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 resize-none rounded-xl bg-secondary px-4 py-3 outline-none focus:ring-2 focus:ring-primary min-h-[48px] max-h-[120px]"
            rows={1}
            disabled={isTyping}
          />
          <Button
            variant="premium"
            size="icon-lg"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            <span className="text-xl">↑</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
