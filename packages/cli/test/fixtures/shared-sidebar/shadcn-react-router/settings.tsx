import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeftIcon, MenuIcon } from "lucide-react"
import { Link } from "react-router"

export function SettingsScreen() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/50 p-2 md:flex">
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
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="grid flex-1 auto-rows-min gap-4 px-4">
                  <nav className="flex flex-col gap-1">
                    <Link to="/dashboard" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
                      <ArrowLeftIcon className="size-4 shrink-0" />
                      Back to dashboard
                    </Link>
                    <Link to="/settings" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Settings</Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <p className="text-sm">Preferences</p>
        </div>
      </main>
    </div>
  )
}
