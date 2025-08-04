import ChatMessage from "@/components/v1/chat/components/ChatMessage";
import { type Meta, type StoryObj } from "@storybook/react";

const meta: Meta<typeof ChatMessage> = {
  title: "Chat/ChatMessage",
  component: ChatMessage,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof ChatMessage>;

export const Default: Story = {
  args: {
    chatMessage: {
      username: "User1",
      timestamp: new Date(),
      content: "Hello, this is a chat message! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla eleifend eget purus ut lacinia. Phasellus et elementum magna. Suspendisse tempus magna ac quam tincidunt, et facilisis leo cursus. Maecenas augue dui, hendrerit.",
      id: "msg-1",
      participantId: "1",
      type: "text"
    },
    currentUserId: "1",
  },
};

export const FromOtherUser: Story = {
  args: {
    chatMessage: {
      username: "Alice",
      timestamp: new Date(),
      content: "Hi everyone! How's the meeting going?",
      id: "msg-2",
      participantId: "2",
      type: "text"
    },
    currentUserId: "1",
  },
};

export const LongMessage: Story = {
  args: {
    chatMessage: {
      username: "Bob",
      timestamp: new Date(),
      content: "This is a very long message that should test how the component handles text wrapping and layout when dealing with extensive content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      id: "msg-3",
      participantId: "3",
      type: "text"
    },
    currentUserId: "1",
  },
};

export const SystemMessage: Story = {
  args: {
    chatMessage: {
      username: "System",
      timestamp: new Date(),
      content: "Alice has joined the room",
      id: "msg-4",
      participantId: "system",
      type: "system"
    },
    currentUserId: "1",
  },
};