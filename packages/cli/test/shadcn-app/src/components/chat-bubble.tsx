// Stub of a project component that a Custom Element names (fixture `custom`). Its typed props prove the export's:
// TypeScript skips hyphenated JSX attributes, so a required sentAt fails unless `sent-at` became camelCase.
import type { ReactNode } from "react"

export function ChatBubble(_: { author: string; sentAt: string; mine?: boolean; children?: ReactNode }) {
  return null
}
