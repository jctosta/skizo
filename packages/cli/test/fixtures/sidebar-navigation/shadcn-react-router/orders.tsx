import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowRightIcon, HouseIcon, MenuIcon, PackageIcon } from "lucide-react"
import { Link } from "react-router"

export function OrdersScreen() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/50 p-2 md:flex">
        <nav className="flex flex-col gap-1">
          <Link to="/dashboard" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <HouseIcon className="size-4 shrink-0" />
            Dashboard
          </Link>
          <Link to="/orders" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <PackageIcon className="size-4 shrink-0" />
            Orders
          </Link>
          <a className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Help</a>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 grid gap-1 grid-cols-[1fr_auto] gap-x-4">
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
                      <HouseIcon className="size-4 shrink-0" />
                      Dashboard
                    </Link>
                    <Link to="/orders" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
                      <PackageIcon className="size-4 shrink-0" />
                      Orders
                    </Link>
                    <a className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Help</a>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage orders</p>
          <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
            <Button variant="outline" asChild>
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <Button asChild>
            <Link to="/dashboard">
              <ArrowRightIcon />
              Open dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
