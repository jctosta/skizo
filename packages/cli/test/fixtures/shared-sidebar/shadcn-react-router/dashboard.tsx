import { AppSidebar } from "./app-sidebar"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"

export function DashboardScreen() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar current="dashboard" />
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <header className="mb-6 grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </header>
        <div className="flex flex-col gap-4">
          <Button asChild>
            <Link to="/orders">See orders</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
