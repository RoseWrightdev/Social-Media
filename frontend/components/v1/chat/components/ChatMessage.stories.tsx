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
      content: "Hello, this is a chat message! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla eleifend eget purus ut lacinia. Phasellus et elementum magna. Suspendisse tempus magna ac quam tincidunt, et facilisis leo cursus. Maecenas augue dui, hendrerit. consectetur adipiscing elit. Nulla eleifend eget purus ut lacinia. Phasellus et elementum magna. Suspendisse tempus magna ac quam tincidunt, et facilisis leo cursus. Maecenas augue dui, hendrerit. consectetur adipiscing elit. Nulla eleifend eget purus ut lacinia. Phasellus et elementum magna",
      id: "",
      participantId: "1",
      type: "text"
    },
    currentUserId: "1",
  },
};