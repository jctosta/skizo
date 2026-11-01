import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis } from "recharts"

const visitsData = [
  { month: "Jan", visits: 1008, signups: 742 },
  { month: "Feb", visits: 1096, signups: 867 },
  { month: "Mar", visits: 927, signups: 1030 },
  { month: "Apr", visits: 1110, signups: 875 },
  { month: "May", visits: 1228, signups: 1017 },
  { month: "Jun", visits: 1444, signups: 1147 },
]

const visitsConfig = {
  visits: { label: "Visits", color: "var(--chart-1)" },
  signups: { label: "Signups", color: "var(--chart-2)" },
} satisfies ChartConfig

const plansData = [
  { plan: "item-1", users: 957, fill: "var(--color-item-1)" },
  { plan: "item-2", users: 909, fill: "var(--color-item-2)" },
  { plan: "item-3", users: 907, fill: "var(--color-item-3)" },
]

const plansConfig = {
  users: { label: "Users" },
  "item-1": { label: "Item 1", color: "var(--chart-1)" },
  "item-2": { label: "Item 2", color: "var(--chart-2)" },
  "item-3": { label: "Item 3", color: "var(--chart-3)" },
} satisfies ChartConfig

export function DashboardScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>
      <div className="flex flex-col gap-4">
        <ChartContainer config={visitsConfig} className="aspect-auto h-60 w-full">
          <LineChart data={visitsData} margin={{ left: 12, right: 12 }} title="Visits">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line dataKey="visits" stroke="var(--color-visits)" strokeWidth={2} dot={false} />
            <Line dataKey="signups" stroke="var(--color-signups)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
        <ChartContainer config={plansConfig} className="mx-auto aspect-square h-60">
          <PieChart title="Plans">
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={plansData} dataKey="users" nameKey="plan" />
            <ChartLegend content={<ChartLegendContent nameKey="plan" />} />
          </PieChart>
        </ChartContainer>
      </div>
    </main>
  )
}
