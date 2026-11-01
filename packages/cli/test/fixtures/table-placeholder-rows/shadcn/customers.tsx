import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CustomersScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Signup date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Hugo Martin</TableCell>
              <TableCell>hugo.martin@example.com</TableCell>
              <TableCell>May 11, 2026</TableCell>
              <TableCell>Pending</TableCell>
              <TableCell>$449.18</TableCell>
              <TableCell>Item 1</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Carla Dias</TableCell>
              <TableCell>carla.dias@example.com</TableCell>
              <TableCell>May 13, 2026</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>$117.11</TableCell>
              <TableCell>Item 2</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Felipe Alves</TableCell>
              <TableCell>felipe.alves@example.com</TableCell>
              <TableCell>Sep 21, 2026</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>$79.70</TableCell>
              <TableCell>Item 3</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Signup date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Plan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Carla Dias</TableCell>
              <TableCell>carla.dias@example.com</TableCell>
              <TableCell>Oct 23, 2026</TableCell>
              <TableCell>Failed</TableCell>
              <TableCell>$394.07</TableCell>
              <TableCell>Item 1</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Felipe Alves</TableCell>
              <TableCell>felipe.alves@example.com</TableCell>
              <TableCell>Apr 25, 2026</TableCell>
              <TableCell>Pending</TableCell>
              <TableCell>$952.00</TableCell>
              <TableCell>Item 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
