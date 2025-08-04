import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Send } from "lucide-react";
import { ChatDependencies } from "../types/ChatDependencies";

export interface ChatInputProps {
  dependencies: ChatDependencies;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  dependencies,
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      dependencies.chatService.sendChat(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 w-full">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button 
        onClick={handleSendMessage} 
        disabled={disabled || !message.trim()}
        size="icon"
        variant="default"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}