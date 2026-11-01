import { Button } from "@/components/ui/button"

export function Screen2026ReportScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">2026 Report</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Button asChild>
          <a href="/3rd-quarter">Q3</a>
        </Button>
      </div>
    </main>
  )
}
