export function LayoutScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Layout</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <p className="text-sm">Default stack</p>
        </div>
        <div className="flex flex-col gap-2 items-center justify-between">
          <p className="text-sm">Small, centered</p>
        </div>
        <div className="flex flex-col gap-6 items-end justify-end">
          <p className="text-sm">Large, end</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <p className="text-sm">Left</p>
          <p className="text-sm">Right</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-6 items-end justify-end">
            <p className="text-sm">Nested</p>
          </div>
        </div>
      </div>
    </main>
  )
}
