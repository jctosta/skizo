import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis } from "recharts"

const revenueData = [
  { month: "Jan", revenue: 1200, costs: 800 },
  { month: "Feb", revenue: 1500.5, costs: 950 },
  { month: "Mar", revenue: 1350, costs: -100 },
]

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  costs: { label: "Costs", color: "var(--chart-2)" },
} satisfies ChartConfig

const ordersData = [
  { day: "Mon", orders: 12 },
  { day: "Tue", orders: 18 },
  { day: "Wed", orders: 9 },
]

const ordersConfig = {
  orders: { label: "Orders", color: "var(--chart-1)" },
} satisfies ChartConfig

const trafficWeeklyData = [
  { week: "W1", "new-users": 120, "returning-users": 300 },
  { week: "W2", "new-users": 180, "returning-users": 280 },
  { week: "W3", "new-users": 150, "returning-users": 320 },
]

const trafficWeeklyConfig = {
  "new-users": { label: "New users", color: "var(--chart-1)" },
  "returning-users": { label: "Returning users", color: "var(--chart-2)" },
} satisfies ChartConfig

const plansData = [
  { plan: "free", users: 620, fill: "var(--color-free)" },
  { plan: "pro", users: 240, fill: "var(--color-pro)" },
  { plan: "team", users: 90, fill: "var(--color-team)" },
]

const plansConfig = {
  users: { label: "Users" },
  free: { label: "Free", color: "var(--chart-1)" },
  pro: { label: "Pro", color: "var(--chart-2)" },
  team: { label: "Team", color: "var(--chart-3)" },
} satisfies ChartConfig

const revenue2Data = [
  { region: "North", "2026": 40, "2025": 32 },
  { region: "South", "2026": 25, "2025": 30 },
]

const revenue2Config = {
  "2026": { label: "2026", color: "var(--chart-1)" },
  "2025": { label: "2025", color: "var(--chart-2)" },
} satisfies ChartConfig

export function DashboardScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueConfig} className="aspect-auto h-60 w-full">
                <LineChart data={revenueData} margin={{ left: 12, right: 12 }} title="Revenue">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                  <Line dataKey="costs" stroke="var(--color-costs)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={ordersConfig} className="aspect-auto h-60 w-full">
                <BarChart data={ordersData} title="Orders">
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trafficWeeklyConfig} className="aspect-auto h-60 w-full">
                <AreaChart data={trafficWeeklyData} margin={{ left: 12, right: 12 }} title={"Traffic \"weekly\""}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area dataKey="new-users" fill="var(--color-new-users)" fillOpacity={0.4} stroke="var(--color-new-users)" />
                  <Area dataKey="returning-users" fill="var(--color-returning-users)" fillOpacity={0.4} stroke="var(--color-returning-users)" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={plansConfig} className="mx-auto aspect-square h-60">
                <PieChart title="Plans">
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={plansData} dataKey="users" nameKey="plan" />
                  <ChartLegend content={<ChartLegendContent nameKey="plan" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <ChartContainer config={revenue2Config} className="aspect-auto h-60 w-full">
          <BarChart data={revenue2Data} title="Revenue">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="region" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="2026" fill="var(--color-2026)" radius={4} />
            <Bar dataKey="2025" fill="var(--color-2025)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>
    </main>
  )
}
