import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EllipsisIcon, HouseIcon, PackageIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

export function OrdersScreen() {
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/50 p-2">
        <nav className="flex flex-col gap-1">
          <a href="/dashboard" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <HouseIcon className="size-4 shrink-0" />
            Dashboard
          </a>
          <a href="/orders" aria-current="page" className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-accent-foreground">
            <PackageIcon className="size-4 shrink-0" />
            Orders
          </a>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 grid gap-1 grid-cols-[1fr_auto] gap-x-4">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage and track customer orders</p>
          <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
            <Button onClick={() => setNewOrderOpen(true)}>
              <PlusIcon />
              New order
            </Button>
          </div>
        </header>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1">
                  <div className="text-2xl font-bold">$12,450</div>
                  <p className="text-xs text-emerald-600">↑ +12% vs last month</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending</CardTitle>
                <CardDescription>Awaiting payment</CardDescription>
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
              <CardContent>
                <Badge variant="secondary">18 orders</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg. order value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1">
                  <div className="text-2xl font-bold">$86.20</div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>#1042</TableCell>
                    <TableCell>Ana Souza</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>$120.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>#1041</TableCell>
                    <TableCell>Bruno Lima</TableCell>
                    <TableCell>Open</TableCell>
                    <TableCell>$64.50</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="open" className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Item 1</TableCell>
                    <TableCell>Item 1</TableCell>
                    <TableCell>$366.69</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Item 2</TableCell>
                    <TableCell>Item 2</TableCell>
                    <TableCell>$824.22</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Item 3</TableCell>
                    <TableCell>Item 3</TableCell>
                    <TableCell>$515.76</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Item 4</TableCell>
                    <TableCell>Item 4</TableCell>
                    <TableCell>$512.60</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Item 5</TableCell>
                    <TableCell>Item 5</TableCell>
                    <TableCell>$987.95</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
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
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue="Open">
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
        </div>
      </main>
    </div>
  )
}
