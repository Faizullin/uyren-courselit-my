"use client";

import { useCoursePublicDetail } from "@/components/course/detail/course-public-detail-context";
import { useChat } from "@ai-sdk/react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { DefaultChatTransport } from "ai";
import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function AiTutorTab() {
  const { t } = useTranslation(["dashboard"]);
  const { initialCourse } = useCoursePublicDetail();
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/services/ai/chat/course`,
      body: { courseId: initialCourse._id },
    }),
  });
  
  const isLoading = status === "streaming";
  
  const displayMessages = messages.length === 0 
    ? [{
        id: "welcome",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: t("dashboard:student.ai_tutor.welcome_message") }],
      }]
    : messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, isLoading]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-300px)]  bg-background">
      <ScrollArea className="p-4 h-[calc(100%-80px)]">
        <div className="space-y-4 max-w-4xl mx-auto">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 items-start",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 border border-brand-primary/20">
                  <Bot className="h-4 w-4 text-brand-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[80%] shadow-sm",
                  message.role === "user"
                    ? "bg-brand-primary text-white"
                    : "bg-muted/50 border border-border"
                )}
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  return null;
                })}
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 items-start justify-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 border border-brand-primary/20">
                <Bot className="h-4 w-4 text-brand-primary" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage({ text: input });
              setInput("");
            }
          }} 
          className="flex gap-2 max-w-4xl mx-auto"
        >
          <Input
            placeholder={t("dashboard:student.ai_tutor.input_placeholder")}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            disabled={isLoading}
            className="text-sm h-10 flex-1"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

