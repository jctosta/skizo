import { Button } from "@/components/ui/button"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DownloadIcon, EllipsisIcon } from "lucide-react"

export function OrdersScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardAction className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <EllipsisIcon />
                    <span className="sr-only">Pending actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Send reminders</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Cancel all</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </CardHeader>
        </Card>
        <div className="flex flex-wrap gap-4">
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <DownloadIcon />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>CSV</DropdownMenuItem>
              <DropdownMenuItem disabled>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>More</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </main>
  )
}
