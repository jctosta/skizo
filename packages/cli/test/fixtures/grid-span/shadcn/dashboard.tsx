import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="grid col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">$12,450</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">18</p>
            </CardContent>
          </Card>
          <div className="grid col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">1,204</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-4">
          <div className="grid col-span-6">
            <Card>
              <CardHeader>
                <CardTitle>Wide</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="grid col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Narrow</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="grid col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Medium</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="grid col-span-5">
            <Card>
              <CardHeader>
                <CardTitle>Half</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="grid col-span-2">
            <div className="grid gap-1">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <div className="text-2xl font-bold">$12,450</div>
            </div>
          </div>
          <div className="grid col-span-2">
            <div role="img" aria-label="Chart" className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "16 / 9" }}>Chart</div>
          </div>
          <div className="grid col-span-4">
            <Button>Export</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
