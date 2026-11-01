import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Pie, PieChart } from "recharts"

const plansData = [
  { "col-1": "free", "col-2": 1, fill: "var(--color-free)" },
  { "col-1": "pro", "col-2": 2, fill: "var(--color-pro)" },
]

const plansConfig = {
  "col-2": { label: "Fill" },
  free: { label: "Free", color: "var(--chart-1)" },
  pro: { label: "Pro", color: "var(--chart-2)" },
} satisfies ChartConfig

export function PlansScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
      </header>
      <div className="flex flex-col gap-4">
        <ChartContainer config={plansConfig} className="mx-auto aspect-square h-60">
          <PieChart title="Plans">
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={plansData} dataKey="col-2" nameKey="col-1" />
            <ChartLegend content={<ChartLegendContent nameKey="col-1" />} />
          </PieChart>
        </ChartContainer>
      </div>
    </main>
  )
}
