export function ArchiveScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1 grid-cols-[1fr_auto] gap-x-4">
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
          <p className="text-sm text-muted-foreground">Read only</p>
        </div>
      </header>
      <div className="flex flex-col gap-4"></div>
    </main>
  )
}
