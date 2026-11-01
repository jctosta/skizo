import { Button } from "@/components/ui/button"
import { HouseIcon, LoaderCircleIcon, PlusIcon, SettingsIcon, TrashIcon } from "lucide-react"

export function ToolbarScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Toolbar</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Button>Save</Button>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button variant="secondary" size="lg">
          <PlusIcon />
          New order
        </Button>
        <Button variant="ghost" size="icon">
          <HouseIcon />
          <span className="sr-only">Home</span>
        </Button>
        <Button size="icon-sm">
          <SettingsIcon />
          <span className="sr-only">Settings</span>
        </Button>
        <Button variant="destructive" disabled>
          <TrashIcon />
          Delete
        </Button>
        <Button disabled>
          <LoaderCircleIcon className="animate-spin" />
          Saving
        </Button>
        <Button variant="link">Learn more</Button>
      </div>
    </main>
  )
}
