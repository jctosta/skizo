export function OrdersScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1 grid-cols-[1fr_auto] gap-x-4">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">Manage and track customer orders</p>
        <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
          <p className="text-sm text-muted-foreground">Synced</p>
          <p className="text-xs">2 min ago</p>
        </div>
      </header>
      <div className="flex flex-col gap-4">
        <p className="text-sm">Body</p>
      </div>
    </main>
  )
}
