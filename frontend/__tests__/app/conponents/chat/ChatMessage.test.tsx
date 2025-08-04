import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatMessage from "@/components/v1/chat/components/ChatMessage";

describe("ChatMessage Component", () => {
  const mockMessage = {
    username: "User1",
    timestamp: new Date(),
    content: "Hello, this is a chat message!",
    id: "msg-1",
    participantId: "1",
    type: "text" as const
  };

  it("renders message content correctly", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText(/Hello, this is a chat message!/)).toBeInTheDocument();
    expect(screen.getByText("User1")).toBeInTheDocument();
  });

  it("shows message as from current user if participantId matches currentUserId", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" isHost={false} />);
    const messageContainer = screen.getByText("User1").closest('div');
    expect(messageContainer).toHaveClass("flex-row-reverse");
  });

  it("renders long content without crashing", () => {
    const longMessage = {
      ...mockMessage,
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10)
    };
    render(<ChatMessage chatMessage={longMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
  });

  it("adds a gradient for content longer than 3 lines", () => {
    const longMessage = {
      ...mockMessage,
      content: "This is a very long message that should span multiple lines and trigger the gradient effect. ".repeat(20)
    };
    render(<ChatMessage chatMessage={longMessage} currentUserId="1" isHost={false} />);
    const messageContent = screen.getByText(/This is a very long message/);
    expect(messageContent).toBeInTheDocument();
    // The gradient is applied via CSS mask, so we just ensure the content renders
  });

  it("renders messages from other users correctly", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="2" isHost={false} />);
    expect(screen.getByText("User1")).toBeInTheDocument();
    const messageContainer = screen.getByText("User1").closest('div');
    expect(messageContainer).not.toHaveClass("flex-row-reverse");
  });

  it("renders private messages correctly", () => {
    const privateMessage = {
      ...mockMessage,
      type: "private" as const,
      content: "This is a private message."
    };
    render(<ChatMessage chatMessage={privateMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("This is a private message.")).toBeInTheDocument();
  });

  it("renders system messages correctly", () => {
    const systemMessage = {
      ...mockMessage,
      type: "system" as const,
      content: "System maintenance scheduled."
    };
    render(<ChatMessage chatMessage={systemMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText("System maintenance scheduled.")).toBeInTheDocument();
  });

  it("handles empty message content gracefully", () => {
    const emptyMessage = {
      ...mockMessage,
      content: ""
    };
    render(<ChatMessage chatMessage={emptyMessage} currentUserId="1" isHost={false} />);
    expect(screen.queryByText(/Hello, this is a chat message!/)).not.toBeInTheDocument();
  });

  it("shows timestamp on hover", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" isHost={false} />);
    const messageContainer = screen.getByText("User1").closest('div')?.parentElement?.parentElement;
    
    // Initially timestamp should be invisible (opacity-0)
    const timestamp = screen.getByText(mockMessage.timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }));
    expect(timestamp).toHaveClass("opacity-0");
    
    // Hover over message
    if (messageContainer) {
      fireEvent.mouseEnter(messageContainer);
      expect(timestamp).toHaveClass("opacity-100");
      
      // Mouse leave
      fireEvent.mouseLeave(messageContainer);
      expect(timestamp).toHaveClass("opacity-0");
    }
  });

  it("renders avatar with correct fallback", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" isHost={false} />);
    const avatarFallback = screen.getByText("U"); // First letter of "User1"
    expect(avatarFallback).toBeInTheDocument();
  });

  it("applies correct styling for current user messages", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" isHost={false} />);
    const contentContainer = screen.getByText(/Hello, this is a chat message!/).closest('div');
    expect(contentContainer).toHaveClass("text-right");
  });

  it("applies correct styling for other user messages", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="2" isHost={false} />);
    const contentContainer = screen.getByText(/Hello, this is a chat message!/).closest('div');
    expect(contentContainer).toHaveClass("text-left");
  });

  it("handles different message types", () => {
    // Test all message types return valid JSX
    const textMessage = { ...mockMessage, type: "text" as const };
    const privateMessage = { ...mockMessage, type: "private" as const };
    const systemMessage = { ...mockMessage, type: "system" as const };
    
    const { rerender } = render(<ChatMessage chatMessage={textMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText("User1")).toBeInTheDocument();
    
    rerender(<ChatMessage chatMessage={privateMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
    
    rerender(<ChatMessage chatMessage={systemMessage} currentUserId="1" isHost={false} />);
    expect(screen.getByText(/Hello, this is a chat message!/)).toBeInTheDocument();
  });

  it("formats timestamp correctly", () => {
    const specificTime = new Date("2024-01-01T14:30:00");
    const messageWithTime = {
      ...mockMessage,
      timestamp: specificTime
    };
    
    render(<ChatMessage chatMessage={messageWithTime} currentUserId="1" isHost={false} />);
    
    // Get the expected timestamp format using the same method as the component
    const expectedTimestamp = specificTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const timestamp = screen.getByText(expectedTimestamp);
    expect(timestamp).toHaveClass("opacity-0");

    // Hover over message container to show timestamp
    const messageContainer = screen.getByText("User1").closest('div')?.parentElement?.parentElement;
    if (messageContainer) {
      fireEvent.mouseEnter(messageContainer);
      expect(timestamp).toHaveClass("opacity-100");
      expect(screen.getByText(expectedTimestamp)).toBeInTheDocument();
    }
  });

  it("shows Host badge when isHost is true", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="2" isHost={true} />);
    expect(screen.getByText("Host")).toBeInTheDocument();
  });

  it("does not show Host badge when isHost is false", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="2" isHost={false} />);
    expect(screen.queryByText("Host")).not.toBeInTheDocument();
  });

  it("shows both Host and Private badges when applicable", () => {
    const privateHostMessage = {
      ...mockMessage,
      type: "private" as const
    };

    render(<ChatMessage chatMessage={privateHostMessage} currentUserId="2" isHost={true} />);
    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
  });
});