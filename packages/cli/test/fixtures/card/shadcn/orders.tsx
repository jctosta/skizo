import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function OrdersScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
            <CardAction className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Live</p>
              <p className="text-xs">Beta</p>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">$12,450</p>
            <p className="text-sm text-muted-foreground">+12% vs last month</p>
          </CardContent>
          <CardFooter className="gap-2">
            <p className="text-xs text-muted-foreground">Updated hourly</p>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">18 orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm">A Card without a header</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Archived</CardTitle>
            <CardDescription>Nothing here yet</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  )
}
