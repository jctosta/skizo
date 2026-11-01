import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

export function PreferencesScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id="accept-terms" defaultChecked />
          <Label htmlFor="accept-terms">Accept terms</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="subscribe" disabled />
          <Label htmlFor="subscribe">Subscribe</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="email-me-updates" defaultChecked disabled />
          <Label htmlFor="email-me-updates">Email me updates</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="dark-mode" />
          <Label htmlFor="dark-mode">Dark mode</Label>
        </div>
        <div className="grid gap-2">
          <Label id="billing">Billing</Label>
          <RadioGroup aria-labelledby="billing" defaultValue="Yearly">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Monthly" id="billing-monthly" />
              <Label htmlFor="billing-monthly">Monthly</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Yearly" id="billing-yearly" />
              <Label htmlFor="billing-yearly">Yearly</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="Every 2 years, prepaid" id="billing-every-2-years-prepaid" />
              <Label htmlFor="billing-every-2-years-prepaid">Every 2 years, prepaid</Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </main>
  )
}
