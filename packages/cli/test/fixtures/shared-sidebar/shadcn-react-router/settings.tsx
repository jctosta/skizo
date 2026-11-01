import { ArrowLeftIcon } from "lucide-react"
import { Link } from "react-router"

export function SettingsScreen() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/50 p-2">
        <nav className="flex flex-col gap-1">
          <Link to="/dashboard" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <ArrowLeftIcon className="size-4 shrink-0" />
            Back to dashboard
          </Link>
          <Link to="/settings" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Settings</Link>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </header>
        <div className="flex flex-col gap-4">
          <p className="text-sm">Preferences</p>
        </div>
      </main>
    </div>
  )
}
