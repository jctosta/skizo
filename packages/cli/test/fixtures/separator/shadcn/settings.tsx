import { Separator } from "@/components/ui/separator"

export function SettingsScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
        <Separator />
        <h2 className="text-xl font-semibold tracking-tight">Billing</h2>
      </div>
    </main>
  )
}
