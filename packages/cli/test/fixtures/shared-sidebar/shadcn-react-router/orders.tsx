import { AppSidebar } from "./app-sidebar"

export function OrdersScreen() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar current="orders" />
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        </header>
        <div className="flex flex-col gap-4">
          <p className="text-sm">Recent orders</p>
        </div>
      </main>
    </div>
  )
}
