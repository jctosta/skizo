import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DraftsScreen() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
      </header>
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="tab-1">
          <TabsList>
            <TabsTrigger value="tab-1">Draft</TabsTrigger>
            <TabsTrigger value="tab-2">Draft</TabsTrigger>
          </TabsList>
          <TabsContent value="tab-1" className="flex flex-col gap-4">
            <p className="text-sm">First draft</p>
          </TabsContent>
          <TabsContent value="tab-2" className="flex flex-col gap-4">
            <p className="text-sm">Second draft</p>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
