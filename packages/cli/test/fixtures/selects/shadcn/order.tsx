import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function OrderScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Order</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select defaultValue="Open">
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Refunded, partly">Refunded, partly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plan">Plan</Label>
          <Select defaultOpen>
            <SelectTrigger id="plan">
              <SelectValue placeholder="Pick a plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </main>
  )
}
