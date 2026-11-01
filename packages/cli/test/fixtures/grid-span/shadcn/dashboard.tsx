import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">$12,450</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">18</p>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">1,204</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-6 gap-4">
          <Card className="col-span-6">
            <CardHeader>
              <CardTitle>Wide</CardTitle>
            </CardHeader>
          </Card>
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Narrow</CardTitle>
            </CardHeader>
          </Card>
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Medium</CardTitle>
            </CardHeader>
          </Card>
          <Card className="col-span-5">
            <CardHeader>
              <CardTitle>Half</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </main>
  )
}
