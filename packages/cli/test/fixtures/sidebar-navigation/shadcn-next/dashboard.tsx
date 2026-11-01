import { HouseIcon, PackageIcon } from "lucide-react"
import Link from "next/link"

export function DashboardScreen() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/50 p-2">
        <nav className="flex flex-col gap-1">
          <Link href="/dashboard" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <HouseIcon className="size-4 shrink-0" />
            Dashboard
          </Link>
          <Link href="/orders" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <PackageIcon className="size-4 shrink-0" />
            Orders
          </Link>
          <a className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Help</a>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <header className="mb-6 grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </header>
        <div className="flex flex-col gap-4">
          <p className="text-sm">Welcome back</p>
        </div>
      </main>
    </div>
  )
}
