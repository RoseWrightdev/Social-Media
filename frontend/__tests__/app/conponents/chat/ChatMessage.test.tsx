import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" />);
    expect(screen.getByText(/Hello, this is a chat message!/)).toBeInTheDocument();
    expect(screen.getByText("User1")).toBeInTheDocument();
  });

  it("shows message as from current user if participantId matches currentUserId", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="1" />);
    // Add assertions for styling differences for current user
  });

  it("renders long content without crashing", () => {
    const longMessage = {
      ...mockMessage,
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(10)
    };
    render(<ChatMessage chatMessage={longMessage} currentUserId="1" />);
    expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
  });

  it("renders messages from other users correctly", () => {
    render(<ChatMessage chatMessage={mockMessage} currentUserId="2" />);
    expect(screen.getByText("User1")).toBeInTheDocument();
    // Add assertions for styling differences for other users
  });
});