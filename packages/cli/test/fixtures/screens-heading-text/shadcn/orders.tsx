export function OrdersScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage, track and refund orders</p>
      </header>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Recent orders</h2>
        <p className="text-sm">Nothing shipped, paid or refunded yet.</p>
        <p className="text-xs text-muted-foreground">Updated hourly</p>
        <p className="text-sm font-semibold">Say "hi" to C:\orders</p>
      </div>
    </main>
  )
}
