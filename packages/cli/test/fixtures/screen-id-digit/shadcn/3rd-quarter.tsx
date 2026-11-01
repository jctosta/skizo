import { Button } from "@/components/ui/button"

export function Screen3rdQuarterScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Third quarter</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Button asChild>
          <a href="/2026-report">Back</a>
        </Button>
      </div>
    </main>
  )
}
