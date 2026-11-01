import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MenuIcon } from "lucide-react"

export function ReportsScreen() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/50 p-2 md:flex">
        <AppSidebar current="reports" />
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
                  <AppSidebar current="reports" />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <p className="text-sm">Monthly totals</p>
        </div>
      </main>
    </div>
  )
}
