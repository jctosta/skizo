import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function OrdersScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer, company</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>#1042</TableCell>
              <TableCell>Ana Souza</TableCell>
              <TableCell>$120.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>#1041</TableCell>
              <TableCell>{"<b>Bruno</b> & {Co}"}</TableCell>
              <TableCell>$64.50</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>#1040</TableCell>
              <TableCell></TableCell>
              <TableCell>$0.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
