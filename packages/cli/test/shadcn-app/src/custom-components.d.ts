// Type stubs for the project components that the Custom Elements of the `custom` fixture import. Their typed props
// prove the export's: TypeScript skips hyphenated JSX attributes, so the required sentAt fails unless `sent-at`
// became camelCase, and a flag must arrive as a boolean.

declare module "@/components/chat-bubble" {
  import type { ReactElement, ReactNode } from "react";
  export function ChatBubble(props: { author: string; sentAt: string; mine?: boolean; children?: ReactNode }): ReactElement;
}

declare module "@/components/conversation" {
  import type { ReactElement, ReactNode } from "react";
  export function Conversation(props: { channel: string; unread?: boolean; children?: ReactNode }): ReactElement;
}

declare module "@/components/typing-indicator" {
  import type { ReactElement } from "react";
  export function TypingIndicator(): ReactElement;
}
