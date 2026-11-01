import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SignInScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Button asChild>
          <Link href="/dashboard">Sign in</Link>
        </Button>
      </div>
    </main>
  )
}
