// ============================================
// STEM Genius - AI Tutor Chat V2
// Real-time streaming chat with OpenAI
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card-premium';
import { Button } from '../ui/button-premium';
import { Send, Sparkles, Loader2, BookOpen, Lightbulb } from 'lucide-react';
import { useAITutorStore } from '@/lib/store';
import { Subject } from '@/lib/prisma-types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITutorChatV2Props {
  userId: string;
  subject?: Subject;
  topic?: string;
  conversationId?: string;
}

export function AITutorChatV2({
  userId,
  subject,
  topic,
  conversationId: initialConversationId,
}: AITutorChatV2Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    inputMessage,
    setInputMessage,
    isStreaming,
    setIsStreaming,
    streamingMessage,
    setStreamingMessage,
    activeConversationId,
    setActiveConversationId,
  } = useAITutorStore();

  // Initialize conversation ID
  useEffect(() => {
    if (initialConversationId && !activeConversationId) {
      setActiveConversationId(initialConversationId);
    }
  }, [initialConversationId, activeConversationId, setActiveConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: inputMessage,
          subject,
          topic,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.content) {
              fullResponse += data.content;
              setStreamingMessage(fullResponse);
            }

            if (data.done) {
              // Save assistant message
              const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingMessage('');

              // Update conversation ID
              if (data.conversationId && !activeConversationId) {
                setActiveConversationId(data.conversationId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = [
    { icon: BookOpen, text: 'Explain this concept', color: 'text-blue-500' },
    { icon: Lightbulb, text: 'Give me a hint', color: 'text-amber-500' },
    { icon: Sparkles, text: 'Show me an example', color: 'text-purple-500' },
  ];

  return (
    <Card variant="premium" className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI Tutor</h3>
            <p className="text-sm text-muted-foreground">
              {subject ? `${subject} ${topic ? `• ${topic}` : ''}` : 'Ask me anything!'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-semibold mb-2">Hi! I'm your AI tutor</h4>
            <p className="text-muted-foreground mb-6">
              Ask me anything about {subject || 'STEM subjects'}!
            </p>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputMessage(suggestion.text)}
                  className="gap-2"
                >
                  <suggestion.icon className={`w-4 h-4 ${suggestion.color}`} />
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming message */}
        {streamingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-secondary text-secondary-foreground">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {streamingMessage}
                </ReactMarkdown>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            variant="premium"
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isStreaming}
            className="shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
