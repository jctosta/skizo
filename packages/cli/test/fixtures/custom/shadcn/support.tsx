import { ChatBubble } from "@/components/chat-bubble"
import { Conversation } from "@/components/conversation"
import { TypingIndicator } from "@/components/typing-indicator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SupportScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="grid col-span-2">
            <Conversation channel="email" unread>
              <ChatBubble author="Ana Souza" sentAt="9:41" mine>
                <p className="text-sm">Where is my order?</p>
              </ChatBubble>
              <ChatBubble author="Bruno Lima" sentAt="9:42">
                <p className="text-sm">It ships today.</p>
                <Button variant="outline">Track order</Button>
              </ChatBubble>
            </Conversation>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Ana Souza</p>
            </CardContent>
          </Card>
        </div>
        <TypingIndicator />
      </div>
    </main>
  )
}
