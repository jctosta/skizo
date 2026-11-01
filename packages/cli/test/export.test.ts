import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { runCli, tempDir, withFiles } from "./helpers/run-cli";

const TWO_SCREENS = `Screen "Orders"\n  Heading "Recent orders"\n\nScreen "Order details"\n  "Nothing yet."\n`;

test("export writes one .tsx per Screen next to the source, named after the Screen id", async () => {
  const cwd = tempDir();
  mkdirSync(join(cwd, "sketches"));
  writeFileSync(join(cwd, "sketches/orders.skz"), TWO_SCREENS);
  const { code, stdout } = await runCli(["export", "sketches/orders.skz", "--target", "shadcn"], cwd);
  expect({ code, stdout, files: readdirSync(join(cwd, "sketches")).sort() }).toEqual({
    code: 0,
    stdout: "wrote sketches/orders.tsx\nwrote sketches/order-details.tsx\n",
    files: ["order-details.tsx", "orders.skz", "orders.tsx"],
  });
});

test("--out writes the files into the chosen folder, creating it", async () => {
  const cwd = tempDir();
  writeFileSync(join(cwd, "orders.skz"), TWO_SCREENS);
  const { code, stdout } = await runCli(["export", "orders.skz", "--target", "shadcn", "--out", "src/screens"], cwd);
  expect({ code, stdout, files: readdirSync(join(cwd, "src/screens")).sort() }).toEqual({
    code: 0,
    stdout: "wrote src/screens/orders.tsx\nwrote src/screens/order-details.tsx\n",
    files: ["order-details.tsx", "orders.tsx"],
  });
});

test("each exported file exports a component named <PascalCaseId>Screen", async () => {
  const cwd = tempDir();
  writeFileSync(join(cwd, "orders.skz"), TWO_SCREENS);
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(readFileSync(join(cwd, "order-details.tsx"), "utf8")).toContain("export function OrderDetailsScreen() {");
});

test("a Screen id that starts with a digit still names a valid component, prefixed with Screen", async () => {
  const cwd = withFiles({ "report.skz": `Screen "2026 Report"\n  Heading "Totals"\n` });
  await runCli(["export", "report.skz", "--target", "shadcn"], cwd);
  expect(readFileSync(join(cwd, "2026-report.tsx"), "utf8")).toContain("export function Screen2026ReportScreen() {");
});

test("an Overlay without desc tells Radix it has no description, so the exported app logs no warning", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Dialog "Confirm"\n  Sheet "Filters" desc="Narrow the list"\n` });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const contents = readFileSync(join(cwd, "orders.tsx"), "utf8").match(/<(Dialog|Sheet)Content[^>]*>/g);
  expect(contents).toEqual(["<DialogContent aria-describedby={undefined}>", "<SheetContent>"]);
});

test("a disabled Button with to= exports as a disabled Button with no link", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Button "Next page" disabled to=orders\n` });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(readFileSync(join(cwd, "orders.tsx"), "utf8")).toContain("<Button disabled>Next page</Button>");
});

test("export refuses a file that fails check and prints the same errors", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Headng "Totals"\n` });
  const checked = await runCli(["check", "orders.skz"], cwd);
  const exported = await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect({ code: exported.code, stderr: exported.stderr, files: readdirSync(cwd) }).toEqual({
    code: 1,
    stderr: checked.stdout,
    files: ["orders.skz"],
  });
});

const SHARED_SIDEBAR = `Sidebar\n  Link "Orders" to=orders\n\n${TWO_SCREENS}\nScreen "Sign in" plain\n  "Welcome"\n`;

test("a shared Sidebar is written once, as app-sidebar.tsx, and each Screen that shows it renders AppSidebar", async () => {
  const cwd = withFiles({ "orders.skz": SHARED_SIDEBAR });
  const { stdout } = await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const rendered = (name: string) => readFileSync(join(cwd, name), "utf8").match(/<AppSidebar .*\/>/)?.[0];
  expect({ stdout, orders: rendered("orders.tsx"), details: rendered("order-details.tsx"), plain: rendered("sign-in.tsx") }).toEqual({
    stdout: "wrote app-sidebar.tsx\nwrote orders.tsx\nwrote order-details.tsx\nwrote sign-in.tsx\n",
    orders: '<AppSidebar current="orders" />',
    details: '<AppSidebar current="order-details" />',
    plain: undefined,
  });
});

test("on phones a menu Button opens the shared Sidebar in a left Sheet, and AppSidebar stays the one source of the links", async () => {
  const cwd = withFiles({ "orders.skz": SHARED_SIDEBAR });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const file = readFileSync(join(cwd, "orders.tsx"), "utf8");
  const shell = file.split("\n").map((line) => line.trim()).filter((line) => /^<(aside|AppSidebar|Sheet|SheetTrigger|SheetContent|Button|a)\b/.test(line));
  expect(shell).toEqual([
    '<aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/50 p-2 md:flex">',
    '<AppSidebar current="orders" />',
    "<Sheet>",
    "<SheetTrigger asChild>",
    '<Button variant="ghost" size="icon" className="md:hidden">',
    '<SheetContent side="left" aria-describedby={undefined}>',
    '<AppSidebar current="orders" />',
  ]);
});

test("exporting an unchanged file twice gives byte-identical output", async () => {
  const cwd = withFiles({ "orders.skz": SHARED_SIDEBAR });
  const read = () => ["app-sidebar.tsx", "orders.tsx", "order-details.tsx"].map((name) => readFileSync(join(cwd, name), "utf8"));
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const first = read();
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  expect(read()).toEqual(first);
});

test("a Screen id that is not a plain file name is refused instead of written outside the folder", async () => {
  const cwd = tempDir();
  mkdirSync(join(cwd, "sketches"));
  writeFileSync(join(cwd, "sketches/orders.skz"), `Screen "Orders" id=../orders\n`);
  const { code, stderr } = await runCli(["export", "sketches/orders.skz", "--target", "shadcn"], cwd);
  expect({ code, stderr, files: readdirSync(cwd) }).toEqual({
    code: 1,
    stderr: 'skizo export: "../orders.tsx" is not a plain file name (check the Screen id)\n',
    files: ["sketches"],
  });
});

test("export without --target is a usage error that names the targets", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz"], cwd);
  expect({ code, stderr, files: readdirSync(cwd) }).toEqual({
    code: 2,
    stderr: "skizo export: --target is required (expected: shadcn)\n",
    files: ["orders.skz"],
  });
});

test("an unknown --target gets a nearest-match hint", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz", "--target", "shadcm"], cwd);
  expect({ code, stderr }).toEqual({
    code: 2,
    stderr: 'skizo export: unknown target "shadcm" — did you mean shadcn? (expected: shadcn)\n',
  });
});

const LINKS = `Screen "Orders"\n  Sidebar\n    Link "Orders" to=orders\n    Link "Help"\n  Button "Dashboard" to=dashboard\n\nScreen "Dashboard"\n  "Welcome"\n`;

/** Exports LINKS with `flags`: the exit code, stderr, and the link lines of orders.tsx, trimmed, without classes. */
async function linkLines(...flags: string[]) {
  const cwd = withFiles({ "orders.skz": LINKS });
  const { code, stderr } = await runCli(["export", "orders.skz", "--target", "shadcn", ...flags], cwd);
  const file = readFileSync(join(cwd, "orders.tsx"), "utf8");
  const links = file.split("\n").filter((line) => /Link|<a[ >]|asChild/.test(line));
  return { code, stderr, links: links.map((line) => line.trim().replace(/ className="[^"]*"/, "")) };
}

test("--router next writes each link to a Screen as Link from next/link, with href=", async () => {
  expect(await linkLines("--router", "next")).toEqual({
    code: 0,
    stderr: "",
    links: [
      'import Link from "next/link"',
      '<Link href="/orders" aria-current="page">Orders</Link>',
      "<a>Help</a>",
      // The phone menu's Sheet holds the same links.
      "<SheetTrigger asChild>",
      '<Link href="/orders" aria-current="page">Orders</Link>',
      "<a>Help</a>",
      "<Button asChild>",
      '<Link href="/dashboard">Dashboard</Link>',
    ],
  });
});

test("--router react-router writes each link to a Screen as Link from react-router, with to=", async () => {
  expect(await linkLines("--router", "react-router")).toEqual({
    code: 0,
    stderr: "",
    links: [
      'import { Link } from "react-router"',
      '<Link to="/orders" aria-current="page">Orders</Link>',
      "<a>Help</a>",
      "<SheetTrigger asChild>",
      '<Link to="/orders" aria-current="page">Orders</Link>',
      "<a>Help</a>",
      "<Button asChild>",
      '<Link to="/dashboard">Dashboard</Link>',
    ],
  });
});

test("a Custom named like another import of its file, or like its component, is imported under an alias", async () => {
  const cwd = withFiles({ "orders.skz": `Screen "Orders"\n  Custom "Label" tone=green\n  Input "Customer"\n  Custom "OrdersScreen"\n` });
  await runCli(["export", "orders.skz", "--target", "shadcn"], cwd);
  const file = readFileSync(join(cwd, "orders.tsx"), "utf8");
  expect(file.split("\n").filter((line) => /Label\b|OrdersScreen/.test(line)).map((line) => line.trim())).toEqual([
    'import { Label as CustomLabel } from "@/components/label"',
    'import { OrdersScreen as CustomOrdersScreen } from "@/components/orders-screen"',
    'import { Label } from "@/components/ui/label"',
    "export function OrdersScreen() {",
    '<CustomLabel tone="green" />',
    '<Label htmlFor="customer">Customer</Label>',
    "<CustomOrdersScreen />",
  ]);
});

test('--router next starts the files that keep state or draw a Chart with "use client", as the App Router needs', async () => {
  const source = `Screen "Orders"\n  Button "New" opens=new\n  Dialog "New" id=new\n\nScreen "Sales"\n  Chart "Sales" cols="Month,Sales" rows=3\n\nScreen "Help"\n  "Ask us"\n`;
  const cwd = withFiles({ "app.skz": source });
  await runCli(["export", "app.skz", "--target", "shadcn", "--router", "next"], cwd);
  const head = (name: string) => readFileSync(join(cwd, name), "utf8").split("\n")[0];
  expect({ orders: head("orders.tsx"), sales: head("sales.tsx"), help: head("help.tsx") }).toEqual({
    orders: '"use client"',
    sales: '"use client"',
    help: "export function HelpScreen() {",
  });
});

test("an unknown --router gets a nearest-match hint and writes nothing", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz", "--target", "shadcn", "--router", "nxt"], cwd);
  expect({ code, stderr, files: readdirSync(cwd) }).toEqual({
    code: 2,
    stderr: 'skizo export: unknown router "nxt" — did you mean next? (expected: next, react-router)\n',
    files: ["orders.skz"],
  });
});

test("--router without --target is a usage error that names the target --router needs", async () => {
  const cwd = withFiles({ "orders.skz": TWO_SCREENS });
  const { code, stderr } = await runCli(["export", "orders.skz", "--router", "next"], cwd);
  expect({ code, stderr }).toEqual({ code: 2, stderr: "skizo export: --router needs --target shadcn\n" });
});

/** Exports one pie Chart: its data and config declarations and its legend line. */
async function pieExport(rows: string, cols = "Plan,Users") {
  const cwd = withFiles({ "plans.skz": `Screen "Plans"\n  Chart "Plans" type=pie cols="${cols}"\n${rows}` });
  await runCli(["export", "plans.skz", "--target", "shadcn"], cwd);
  const file = readFileSync(join(cwd, "plans.tsx"), "utf8");
  return [/const plansData = [\s\S]*?\n\]/, /const plansConfig = [\s\S]*?satisfies ChartConfig/, /<ChartLegend .*\/>/].map(
    (re) => file.match(re)?.[0],
  );
}

test("a pie Chart exports a legend, with one config entry per slice that names and colors it", async () => {
  expect(await pieExport("    | Free | 620\n    | Pro plan | 240\n")).toEqual([
    'const plansData = [\n  { plan: "free", users: 620, fill: "var(--color-free)" },\n  { plan: "pro-plan", users: 240, fill: "var(--color-pro-plan)" },\n]',
    'const plansConfig = {\n  users: { label: "Users" },\n  free: { label: "Free", color: "var(--chart-1)" },\n  "pro-plan": { label: "Pro plan", color: "var(--chart-2)" },\n} satisfies ChartConfig',
    '<ChartLegend content={<ChartLegendContent nameKey="plan" />} />',
  ]);
});

test("a pie slice named like the series still gets a config entry of its own", async () => {
  const [data] = await pieExport("    | Users | 620\n    | Guests | 240\n");
  expect(data).toBe(
    'const plansData = [\n  { plan: "slice-1", users: 620, fill: "var(--color-slice-1)" },\n  { plan: "slice-2", users: 240, fill: "var(--color-slice-2)" },\n]',
  );
});

test("a pie column that slugs to fill keeps its value: data keys never repeat the fill key the export adds", async () => {
  const [data] = await pieExport("    | Free | 1\n", "Plan,Fill");
  expect(data).toBe('const plansData = [\n  { "col-1": "free", "col-2": 1, fill: "var(--color-free)" },\n]');
});
