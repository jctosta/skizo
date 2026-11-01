import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function NewCustomerScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="jane@example.com" aria-invalid />
          <p className="text-sm text-destructive">Enter a valid email</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" type="text" defaultValue={"Jane \"JD\" Doe"} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name-2">Name</Label>
          <Input id="name-2" type="text" placeholder="Same Label, its own id" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer-search">Search</Label>
          <Input id="customer-search" type="search" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" placeholder="Anything we should know?" rows={4} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" defaultValue={"Likes <b>bold</b> & {braces}"} />
        </div>
      </div>
    </main>
  )
}
