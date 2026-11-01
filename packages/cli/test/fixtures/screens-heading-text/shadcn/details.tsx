export function DetailsScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order details</h1>
      </header>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Order #1042</h1>
        <h3 className="text-lg font-semibold tracking-tight">Items</h3>
        <h4 className="text-base font-semibold">Notes</h4>
        <p className="text-base">{"Large print, <b>escaped</b> & safe"}</p>
      </div>
    </main>
  )
}
