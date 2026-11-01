import { HouseIcon, PackageIcon } from "lucide-react"
import { Link } from "react-router"

export function AppSidebar({ current }: { current: string }) {
  return (
    <nav className="flex flex-col gap-1">
      <Link to="/dashboard" aria-current={current === "dashboard" ? "page" : undefined} className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
        <HouseIcon className="size-4 shrink-0" />
        Dashboard
      </Link>
      <Link to="/orders" aria-current={current === "orders" ? "page" : undefined} className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
        <PackageIcon className="size-4 shrink-0" />
        Orders
      </Link>
      <a className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">Help</a>
    </nav>
  )
}
