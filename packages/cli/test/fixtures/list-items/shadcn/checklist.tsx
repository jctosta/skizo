export function ChecklistScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Launch checklist</h1>
      </header>
      <div className="flex flex-col gap-4">
        <ul className="ml-6 list-disc text-sm [&>li]:mt-1">
          <li>Write the brief</li>
          <li>Review, then approve</li>
          <li>{"<b>Ship</b> & {celebrate}"}</li>
        </ul>
        <ul className="ml-6 list-disc text-sm [&>li]:mt-1">
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </div>
    </main>
  )
}
