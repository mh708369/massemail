"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (res.ok) {
        const text = await res.text();
        setMessages([...updatedMessages, { role: "assistant", content: text }]);
      } else {
        setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
      }
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <Header title="AI Chatbot" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">🤖</span> AI Support Chatbot
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-16">
                        <p className="text-4xl mb-4">💬</p>
                        <p className="font-medium">Test your AI Support Chatbot</p>
                        <p className="text-sm mt-2">Ask a question to see how the chatbot responds using your Knowledge Base.</p>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          <p className="text-muted-foreground">AI is thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t p-4 flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={loading}
                  />
                  <Button onClick={handleSend} disabled={loading || !input.trim()}>
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">How it works</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>The AI chatbot uses Claude to answer customer questions.</p>
                <p>It draws context from your <strong>Knowledge Base</strong> articles to provide accurate, relevant responses.</p>
                <p>Add more articles to improve chatbot accuracy.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Quick Test Questions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  "How do I reset my password?",
                  "What are your business hours?",
                  "How do I get a refund?",
                  "I need help with my account",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="block w-full text-left text-sm p-2 rounded hover:bg-muted transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMessages([])}
            >
              Clear Chat
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
