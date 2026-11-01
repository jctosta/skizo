import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function DashboardScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Display Elements</p>
      </header>
      <div className="flex flex-col gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <div className="text-2xl font-bold">$12,450</div>
          <p className="text-xs text-emerald-600">↑ +12% vs last month</p>
        </div>
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">Open orders</p>
          <div className="text-2xl font-bold">18</div>
          <p className="text-xs text-destructive">↓</p>
        </div>
        <div className="grid gap-1">
          <div className="text-2xl font-bold">$86.20</div>
        </div>
        <Badge>Paid</Badge>
        <Badge variant="secondary">18 orders</Badge>
        <Badge variant="outline">Draft</Badge>
        <Badge variant="destructive">Overdue</Badge>
        <Avatar size="sm" role="img" aria-label="Ana Souza">
          <AvatarFallback>AS</AvatarFallback>
        </Avatar>
        <Avatar role="img" aria-label="bruno">
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <Avatar size="lg" role="img" aria-label="Carla Maria Dias">
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
        <div role="img" aria-label="Team photo" className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "16 / 9" }}>Team photo</div>
        <div role="img" aria-label="Chart" className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "4 / 3" }}>Chart</div>
        <div role="img" aria-label="Banner" className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "3 / 2" }}>Banner</div>
        <div role="img" aria-label={"The \"team\" & friends"} className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "1 / 1" }}>{"The \"team\" & friends"}</div>
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Exports run every hour.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTitle>{"Payment {failed}"}</AlertTitle>
          <AlertDescription>{"Card <declined> & retried"}</AlertDescription>
        </Alert>
        <Progress value={40} />
        <Progress />
        <p className="text-sm">Anim aute consectetur amet eiusmod amet aliquip occaecat anim ut. Incididunt qui et deserunt ad fugiat exercitation et lorem esse. Irure esse qui duis.</p>
        <p className="text-xs text-muted-foreground">Do non sunt ipsum excepteur esse.</p>
        <div role="img" aria-label="Cinema" className="flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ aspectRatio: "21 / 9" }}>Cinema</div>
      </div>
    </main>
  )
}
