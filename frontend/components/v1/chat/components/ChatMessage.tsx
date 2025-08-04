import React, { useRef, useState, useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import * as Typo from "@/components/ui/typography";

import { type ChatMessage } from "@/store/useRoomStore";
export default function ChatMessage({
  chatMessage,
  currentUserId,
}: {
  chatMessage: ChatMessage;
  currentUserId: string;
}) {
  if (chatMessage.type === "private") {
    return (
      <div className="bg-blue-100 rounded-md p-3 mb-2">
        <strong>{chatMessage.username} (private):</strong>{" "}
        <RenderMessageContent chatMessage={chatMessage.content} />
      </div>
    );
  } else if (chatMessage.type === "system") {
    // You can customize system message rendering here
    return (
      <div className="bg-gray-100 rounded-md p-3 mb-2 text-center text-sm text-gray-600">
        {chatMessage.content}
      </div>
    );
  } else if (chatMessage.type === "text") {
    return (
      <StandardChat chatMessage={chatMessage} currentUserId={currentUserId} />
    );
  }

  return null;
}

function StandardChat({ chatMessage, currentUserId }: { chatMessage: ChatMessage, currentUserId: string }) {
  const messageContentRef = useRef<HTMLParagraphElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (messageContentRef.current) {
      messageContentRef.current.scrollTop = 0;
    }
  };

  const isCurrentUser = chatMessage.participantId === currentUserId;

  return (
    <div
      className={`flex items-start gap-4 p-3 mb-4 ${isCurrentUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="w-11 h-11">
        <AvatarImage
          src={`https://api.dicebear.com/5.x/initials/svg?seed=${chatMessage.username}`}
        />
        <AvatarFallback className="w-10 h-10 flex items-center justify-center text-xl">
          {chatMessage.username.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col justify-center w-full">
        <div
          className={`flex items-center gap-3 mt-2 ${isCurrentUser ? "flex-row-reverse text-right" : ""}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Typo.H4 className="my-0">{chatMessage.username}</Typo.H4>
          {isHovered && (
            <Typo.Muted className="mt-1">
              {chatMessage.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typo.Muted>
          )}
        </div>
        <div className={`mt-1 ${isCurrentUser ? "text-right" : ""}`}>
          <RenderMessageContent
            chatMessage={chatMessage.content}
            forwardedRef={messageContentRef}
            isHovered={isHovered}
          />
        </div>
      </div>
    </div>
  );
}

function RenderMessageContent({
  chatMessage,
  forwardedRef,
  isHovered,
}: {
  chatMessage: string;
  forwardedRef?: React.RefObject<HTMLParagraphElement | null>;
  isHovered?: boolean;
}) {
  const internalRef = useRef<HTMLParagraphElement>(null);
  const ref = forwardedRef ?? internalRef;
  const [showGradient, setShowGradient] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Show gradient only if content overflows and not scrolled to bottom
    const checkOverflow = () => {
      const isOverflowing = el.scrollHeight > el.clientHeight;
      const isScrolledToBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      setShowGradient(isOverflowing && !isScrolledToBottom);
    };
    checkOverflow();
    el.addEventListener("scroll", checkOverflow);
    window.addEventListener("resize", checkOverflow);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [chatMessage, ref]);

  const gradient =
    "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)";

  return (
    <Typo.P
      ref={ref}
      className={`font-medium mt-0 relative scrollbar-hide transition-all duration-100 ${isHovered ? "max-h-32 overflow-y-auto" : "max-h-20 overflow-y-hidden"
        }`}
      style={
        showGradient && !isHovered
          ? {
            WebkitMaskImage: gradient,
            maskImage: gradient,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }
          : { scrollbarColor: "transparent"}
      }
    >
      {chatMessage}
    </Typo.P>
  );
}