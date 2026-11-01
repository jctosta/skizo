import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function OrdersScreen() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="needs-review">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="needs-review">Needs review</TabsTrigger>
            <TabsTrigger value="refunds-returns">{"Refunds & <returns>"}</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold tracking-tight">Every order</h2>
            <p className="text-sm text-muted-foreground">Sorted by date</p>
          </TabsContent>
          <TabsContent value="needs-review" className="flex flex-col gap-4">
            <Tabs defaultValue="today">
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="this-week">This week</TabsTrigger>
              </TabsList>
              <TabsContent value="today" className="flex flex-col gap-4">
                <p className="text-sm">Nothing to review today.</p>
              </TabsContent>
              <TabsContent value="this-week" className="flex flex-col gap-4"></TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="refunds-returns" className="flex flex-col gap-4">
            <p className="text-sm">Refunded orders show here.</p>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
