import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { FunnelIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

export function OrdersScreen() {
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1 grid-cols-[1fr_auto] gap-x-4">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <FunnelIcon />
            Filters
          </Button>
          <Button onClick={() => setNewOrderOpen(true)}>
            <PlusIcon />
            New order
          </Button>
        </div>
      </header>
      <div className="flex flex-col gap-4">
        <p className="text-sm">Pick an order to see its details.</p>
        <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New order</DialogTitle>
              <DialogDescription>Create an order for a customer.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer-name">Customer name</Label>
                <Input id="customer-name" type="text" placeholder="Jane Doe" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Create order</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="grid flex-1 auto-rows-min gap-4 px-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Apply</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Welcome back</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <p className="text-sm">Here is what changed since your last visit.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
