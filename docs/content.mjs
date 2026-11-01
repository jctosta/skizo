// Hand-written content of the Skizo documentation (docs/index.html). scripts/docs.mjs renders it and generates the
// prop tables from the Element schemas, so prop names, values and defaults never need writing here.
// Every Element type must appear in exactly one entry of GROUPS; the build fails otherwise.
// Write tutorials and instructions in ASD-STE100 Simplified Technical English: short sentences, active voice,
// one instruction per sentence, the imperative for instructions, one term for one thing.

/** Fallback descriptions for props, by name. An entry's own `props` override these. */
export const PROP_NOTES = {
  variant: "The visual style.",
  size: "The size of the Element.",
  gap: "The space between the children. sm, md and lg give Tailwind gap-2, gap-4 and gap-6.",
  align: "How the children align across the Stack or Row. With start, the children stretch.",
  justify: "How the children spread along the Stack or Row.",
  icon: "An icon before the Label.",
  "icon-only": "Shows only the icon. The Label stays as the accessible name.",
  disabled: "Shows the Element as not available.",
  open: "Shows the Element open when the Preview loads. The export also renders it open first.",
  desc: "A description below the title.",
  placeholder: "The hint text in the empty field.",
  value: "The current value.",
  options: "The choices, separated by commas. Write \\, for a comma in a choice.",
  checked: "Turns the control on.",
  active: "Marks the current item.",
  rows: "The number of placeholder rows.",
  title: "A small heading above the value.",
  hint: "A small line below the value.",
};

/**
 * Prose sections before the Element reference. `h` holds the block helpers skz (Skizo source), sh (shell) and
 * pre (plain text), and `tag`, the release tag of the current CLI version.
 */
export const SECTIONS = (h) => [
  {
    id: "getting-started",
    title: "Get started",
    html: `
<h3>Requirements</h3>
<ul>
  <li>Node.js 22.12 or later.</li>
  <li>Git.</li>
  <li>pnpm (recommended) or npm.</li>
</ul>
<h3>Install</h3>
<p>Skizo installs from its Git repository. Each release has a Git tag, for example <code>${h.tag}</code>.
Always put the tag in the install command. Then each install gets the same release.</p>
<p>Install with pnpm (recommended):</p>
${h.sh(`pnpm add -g github:jctosta/skizo#${h.tag}`)}
<p>Or install with npm:</p>
${h.sh(`npm install -g --allow-git=all github:jctosta/skizo#${h.tag}`)}
<p class="note">npm 12 and later blocks Git dependencies by default. The <code>--allow-git=all</code> option
allows them for this command only.</p>
<p>Make sure that the install is correct:</p>
${h.sh("skizo --help")}
<p>The install gives two commands: <code>skizo</code> and its short alias <code>skz</code>.</p>
<h3>Pin an exact build</h3>
<p>A release tag points to a commit on the <code>release</code> branch. This commit holds only the built CLI.
It has no build scripts and no dependencies. Thus the install runs no code from the package.</p>
<p>A tag can move to a different commit. To pin one exact build, use the commit hash instead of the tag.</p>
<ol>
  <li>Get the commit hash of the release:
  ${h.sh(`git ls-remote https://github.com/jctosta/skizo "refs/tags/${h.tag}^{}"`)}</li>
  <li>Install that commit:
  ${h.sh("pnpm add -g github:jctosta/skizo#<commit-hash>")}</li>
</ol>
<h3>Upgrade and remove</h3>
<p>To upgrade, run the install command again with the new tag. To remove Skizo, run one of these commands:</p>
${h.sh(`pnpm remove -g @jctosta/skizo
npm uninstall -g @jctosta/skizo`)}
<h3>Write your first sketch</h3>
<ol>
  <li>Save this text as <code>orders.skz</code>:
  ${h.skz(`Screen "Orders" subtitle="Track customer orders"
  actions
    Button "New order" icon=plus
  Card "Revenue" desc="Last 30 days"
    Stat "$12,450" hint="+12% vs last month" trend=up
  Table cols="Order,Customer,Amount" rows=5`)}</li>
  <li>Check the file. The command shows all errors in one run, each with a hint.
  ${h.sh("skizo check orders.skz")}</li>
  <li>Make the Preview. The command writes <code>orders.html</code>. Open this file in a browser.
  ${h.sh("skizo preview orders.skz")}</li>
  <li>To see your changes while you edit, serve the Preview. The page reloads each time that you save.
  ${h.sh("skizo preview orders.skz --watch")}</li>
  <li>Export the Screens as React code:
  ${h.sh("skizo export orders.skz --target shadcn --out src/screens")}</li>
</ol>
<h3>Build from source</h3>
<p>To change Skizo, build it from a clone of the repository. The build needs Node.js 22.18 or later.</p>
${h.sh(`git clone https://github.com/jctosta/skizo
cd skizo
pnpm install
pnpm build
node packages/cli/dist/cli.mjs --help`)}`,
  },
  {
    id: "agents",
    title: "Use Skizo with agents",
    html: `
<p>Coding agents such as Claude Code, Codex and Cursor write Skizo. You look at the Preview and tell the agent
what to change.</p>
<p>The command <code>skizo guide</code> prints the Guide. The Guide holds the full language in about 1,200
tokens. An agent needs no other document.</p>
<p>Add these lines to the instructions for your agent, for example in <code>AGENTS.md</code> or
<code>CLAUDE.md</code>:</p>
${h.pre(`Before you write UI code, make a sketch in Skizo:
1. Run \`skizo guide\` and read the Guide.
2. Write the sketch in <name>.skz.
3. Run \`skizo check <name>.skz\`. Fix all errors. Do this step again until the command shows no errors.
4. Run \`skizo preview <name>.skz\` and give me the HTML file.`)}
<p><code>skizo check</code> shows each error with its line, its Element type and a hint. Thus the agent can fix
all errors in one pass:</p>
${h.sh(`$ skizo check orders.skz
orders.skz:4  Button  unknown prop "varient" — did you mean variant?
orders.skz:7  Badge  unknown flag "secondary" — did you mean variant=secondary?
orders.skz:9  Table  row has 3 cells, expected 4 (cols: Order, Customer, Status, Amount)`)}
<p>While the agent works, keep <code>skizo preview --watch</code> open. The page reloads after each save that
passes <code>check</code>. You can correct the sketch before somebody writes the real code.</p>`,
  },
  {
    id: "syntax",
    title: "Syntax",
    html: `
<h3>Lines and indentation</h3>
<p>Write one Element on each line. Indent each level of nesting by two spaces. Do not use tabs.
A child can be only one level deeper than its parent. A file has one or more Screens at the top level.</p>
${h.skz(`Screen "Settings"
  Card "Profile"
    Input "Display name"`)}
<h3>Labels, flags and props</h3>
<p>A line starts with the Element type. After the type, write an optional Label, flags and props, in any order.
The Label is a quoted string. Its meaning depends on the type. For example, it is the text of a Button, the value
of a Stat and the alt text of an Image.</p>
<ul>
  <li>A flag is a lowercase word without a value. It means true. Examples are <code>disabled</code>,
  <code>open</code> and <code>icon-only</code>.</li>
  <li>A prop has the form <code>key=value</code>. Put quotes around a value with spaces:
  <code>placeholder="Jane Doe"</code>.</li>
  <li>In a quoted value, <code>\\"</code> is a quote and <code>\\\\</code> is a backslash.</li>
  <li>Only flags are bare words. Write <code>variant=secondary</code>. Do not write <code>secondary</code>
  alone.</li>
  <li>A list prop has values separated by commas: <code>options="Open,Paid"</code>. Write <code>\\,</code> for a
  comma in a value.</li>
</ul>
${h.skz(`Button "Save" variant=secondary icon=check disabled`)}
<h3>Text lines, table rows and comments</h3>
<p>A line with only a string is a paragraph. It is the same as a Text. A line that starts with <code>|</code> is
a row of a Table or a Chart. Each row has one cell for each column. A line that starts with <code>//</code> is a comment. The
Preview and the export ignore comments.</p>
${h.skz(`// A note for the human. Skizo does not show it.
"A paragraph of text."
Table cols="Name,Role"
  | Ana Souza | Admin
  | Bruno Lima | Member`)}
<h3>Slots</h3>
<p>A slot word puts children into one part of their parent. Write the slot word on its own line. Then indent the
children below it.</p>
<ul>
  <li><code>actions</code> puts the children in the header of a Screen or a Card.</li>
  <li><code>footer</code> puts the children in the footer of a Card, a Dialog or a Sheet.</li>
</ul>
${h.skz(`Card "Invoice"
  actions
    Button "Download" icon=download icon-only variant=ghost
  Text "Due on March 3"
  footer
    Button "Pay now"`)}
<h3>Ids</h3>
<p>All Elements accept <code>id=name</code>. An id is the target of <code>opens=</code> or <code>to=</code>.
Each id must be unique in the file. If a Screen has no id, Skizo makes one from its Label. For example,
<code>Order details</code> becomes <code>order-details</code>.</p>
<h3>One content source</h3>
<p>Give the content in one way only:</p>
<ul>
  <li>A Text has a Label or <code>lorem=N</code>.</li>
  <li>A Table has <code>|</code> rows or <code>rows=N</code>.</li>
  <li>A Chart has <code>|</code> rows or <code>rows=N</code>. It must have one of the two.</li>
  <li>A List has <code>items=</code> or <code>rows=N</code>.</li>
</ul>
<p><code>lorem=N</code> and <code>rows=N</code> make placeholder content. The placeholder content is the same
each time that you run Skizo.</p>
<h3>Icons</h3>
<p>The <code>icon=</code> prop takes the name of a <a href="https://lucide.dev/icons">Lucide</a> icon in kebab
case, for example <code>plus</code>, <code>house</code> or <code>trash-2</code>. If the name is not correct,
<code>skizo check</code> shows the nearest name.</p>`,
  },
  {
    id: "behavior",
    title: "Behavior",
    html: `
<p>Behavior is the effect of a click that you write in the source. Skizo has two kinds of Behavior:</p>
<ul>
  <li><code>opens=id</code> on a Button shows the Dialog or Sheet with that id. The Dialog or Sheet must be on
  the same Screen.</li>
  <li><code>to=screen-id</code> on a Button or a Sidebar Link shows a different Screen of the file.</li>
</ul>
<p>All other interactions work without Behavior:</p>
<ul>
  <li>A Tab shows its panel when you click it.</li>
  <li>A Menu or a Select opens when you click it.</li>
  <li>A Dialog or a Sheet closes from its close button, its backdrop or the Escape key. A footer Button without
  Behavior also closes it.</li>
</ul>
<p>Form controls do not validate or send data.</p>
${h.skz(`Screen "Projects" id=projects
  actions
    Button "New project" icon=plus opens=new-project
  Button "Open settings" variant=link to=settings
  Dialog "New project" id=new-project
    Input "Name"
    footer
      Button "Create"

Screen "Settings" id=settings
  Button "Back to projects" variant=outline to=projects`)}
<p>The Preview shows one Screen at a time. The URL hash gives the name of the Screen. Thus the back button of
the browser works. If the file has no <code>to=</code>, the Preview shows all Screens, one below the other.</p>`,
  },
  {
    id: "cli",
    title: "CLI reference",
    html: `
<table class="ref">
  <tr><th>Command</th><th>Result</th></tr>
  <tr><td><code>skizo guide</code></td><td>Prints the Guide. The Guide is the language reference for
  agents.</td></tr>
  <tr><td><code>skizo check &lt;file.skz&gt; [--json]</code></td><td>Shows all errors in the file, one on each
  line, in the format <code>file:line  Type  message</code>. With <code>--json</code>, the command prints
  <code>{"errors": [{"file", "line", "type", "message"}]}</code>.</td></tr>
  <tr><td><code>skizo preview &lt;file.skz&gt; [--watch]</code></td><td>Writes <code>&lt;file&gt;.html</code>
  next to the source file. The page holds all Screens and works offline. With <code>--watch</code>, the command
  also serves the page on 127.0.0.1 and reloads it after each save. If a save fails <code>check</code>, the
  command shows the errors and keeps the last good page.</td></tr>
  <tr><td><code>skizo export &lt;file.skz&gt; --target shadcn [--out dir] [--router next|react-router]</code></td><td>Writes one
  <code>.tsx</code> file for each Screen, and <code>app-sidebar.tsx</code> for a shared Sidebar. The files go next
  to the source file, or into the <code>--out</code> folder. With <code>--router</code>, the links use the
  <code>Link</code> component of Next.js or React Router.</td></tr>
</table>
<p><code>skz</code> is a short alias for <code>skizo</code>. <code>preview</code> and <code>export</code> do not
accept a file that fails <code>check</code>. They show the same errors as <code>check</code>.</p>
<p>The exit code tells the result:</p>
<ul>
  <li><code>0</code> means that the command was successful.</li>
  <li><code>1</code> means that the file has errors.</li>
  <li><code>2</code> means that the command is not correct, or that Skizo cannot read the file.</li>
</ul>`,
  },
  {
    id: "export",
    title: "shadcn export",
    html: `
<p><code>skizo export --target shadcn</code> writes React code. The code imports the components of your project
from <code>@/components/ui/*</code>. Thus the export uses your theme and your changes to the components. Each
Screen becomes one file with the name of its id. For example, <code>orders.tsx</code> exports
<code>OrdersScreen</code>.</p>
<h3>Requirements</h3>
<ul>
  <li>A shadcn project on the Radix base. The export uses <code>asChild</code>.</li>
  <li>The <code>lucide-react</code> package.</li>
  <li>The shadcn components that the file uses: alert, avatar, badge, button, card, chart, checkbox, dialog,
  dropdown-menu, input, label, progress, radio-group, select, separator, sheet, switch, table, tabs and
  textarea.</li>
  <li>The <code>recharts</code> package, if the file has a Chart. The shadcn chart component installs it.</li>
  <li>For each Custom name, your component in <code>@/components/&lt;kebab-name&gt;</code>. For example,
  <code>ChatBubble</code> comes from <code>@/components/chat-bubble</code>.</li>
</ul>
<h3>Output</h3>
<ul>
  <li><code>opens=</code> becomes a <code>useState</code> hook. A click on the Button sets the state, and the state
  opens the Dialog or Sheet. The <code>open</code> flag sets the initial state to open.</li>
  <li><code>to=</code> becomes a plain <code>&lt;a href="/screen-id"&gt;</code> link. A Button with
  <code>to=</code> wraps the link with <code>asChild</code>.</li>
  <li><code>--router next</code> writes each link as <code>&lt;Link href="/screen-id"&gt;</code> and imports
  <code>Link</code> from <code>next/link</code>.</li>
  <li><code>--router react-router</code> writes each link as <code>&lt;Link to="/screen-id"&gt;</code> and imports
  <code>{ Link }</code> from <code>react-router</code>.</li>
  <li>A shared Sidebar becomes one file, <code>app-sidebar.tsx</code>. It exports
  <code>AppSidebar({ current })</code>. Each Screen that shows the Sidebar renders
  <code>&lt;AppSidebar current="screen-id" /&gt;</code>.</li>
  <li>An export of an unchanged file writes the same bytes. Thus a diff shows only the changes that you made in the source.</li>
</ul>`,
  },
];

/**
 * The Element reference. `example` is Skizo source: wrapped in a Screen unless it starts with one or with a shared
 * Sidebar (then the Screen header is shown). `about[Type].position` replaces the Position fact from the schema. `height` fixes the demo height in px, for Overlays that render out of flow.
 * `about[Type]` holds the Label's meaning and per-prop descriptions.
 */
export const GROUPS = [
  {
    title: "Screens and navigation",
    entries: [
      {
        types: ["Screen"],
        summary: "One page of the app that you sketch. A file has one or more Screens at the top level. All other Elements go in a Screen.",
        example: `Screen "Orders" subtitle="Manage and track customer orders"
  actions
    Button "Export" variant=outline icon=download
    Button "New order" icon=plus
  Text "The body puts its children in a column with a medium gap."`,
        about: {
          Screen: {
            label: "The page title in the header row.",
            props: {
              id: "The target of to=. If you do not write it, Skizo makes it from the Label.",
              subtitle: "A muted line below the title.",
              plain: "Shows no shared Sidebar on this Screen, for example on a sign-in Screen.",
            },
          },
        },
        notes: ["The `actions` slot puts Elements on the right side of the header row."],
        shadcn: "A `<main>` element with a header row for the title, the subtitle and the actions.",
      },
      {
        types: ["Sidebar", "Link"],
        summary: "The navigation column of a Screen. Write the Sidebar one time, at the top level before the first Screen. Then each Screen shows it. The Link with `to=` set to the current Screen shows as active.",
        example: `Sidebar
  Link "Inbox" icon=inbox to=inbox
  Link "Archive" icon=archive to=archive

Screen "Inbox" id=inbox
  Text "Click Archive in the sidebar."

Screen "Archive" id=archive
  Text "The archive is empty."`,
        about: {
          Sidebar: { position: "The top level before the first Screen (shared), or the first child of a Screen" },
          Link: {
            label: "The link text.",
            props: {
              to: "Shows the Screen with this id.",
              active: "Marks the current page. Skizo sets it from to=, so you do not usually write it. Do not write it in a shared Sidebar.",
            },
          },
        },
        notes: [
          "A file can have one shared Sidebar.",
          "A Screen with its own Sidebar shows its own Sidebar. Write the Sidebar as the first child of the Screen.",
          "A Screen with the `plain` flag shows no Sidebar.",
          "A Link can only be in a Sidebar. For a link in the page, write `Button variant=link to=...`.",
        ],
        shadcn: "An `<aside><nav>` with plain `<a>` links, or the `Link` of your router with `--router`. The active link gets `aria-current=\"page\"`. A shared Sidebar becomes `app-sidebar.tsx`, which exports `AppSidebar({ current })`. Each Screen that shows it renders `<AppSidebar current=\"screen-id\" />`.",
      },
    ],
  },
  {
    title: "Layout",
    entries: [
      {
        types: ["Stack", "Row"],
        summary: "A Stack puts its children from top to bottom. A Row puts its children from left to right.",
        example: `Stack gap=sm
  Text "A Stack puts its children from top to bottom."
  Row gap=sm justify=between align=center
    Badge "Row"
    Text "A Row puts them from left to right." muted
    Button "Action" size=sm variant=outline`,
      },
      {
        types: ["Grid"],
        summary: "Columns of equal width. A direct child can span more than one column with `span=N`.",
        example: `Grid cols=3
  Card "Revenue"
    Stat "$12,450"
  Card "Orders"
    Stat "318"
  Card "Refunds"
    Stat "4"
  Card "Traffic" span=2
    Image "Chart of daily visits" ratio=21:9
  Card "Notes"
    Text lorem=14`,
        about: { Grid: { props: { cols: "The number of columns." } } },
      },
      {
        types: ["Separator"],
        summary: "A horizontal line between groups of content.",
        example: `Text "Above the line"
Separator
Text "Below the line"`,
      },
      {
        types: ["Card"],
        summary: "A box with a border. It has an optional title and description, an `actions` slot in its header and a `footer` slot.",
        example: `Card "Team plan" desc="Billed yearly"
  actions
    Badge "Popular" variant=secondary
  Stat "$24" hint="per seat per month"
  footer
    Button "Upgrade"`,
        about: { Card: { label: "The title." } },
        shadcn: "`Card > CardHeader(CardTitle, CardDescription, CardAction) + CardContent + CardFooter`.",
      },
      {
        types: ["Tabs", "Tab"],
        summary: "Panels that you select with tabs. The children of a Tab are its panel. In the Preview, a click on a tab shows its panel.",
        example: `Tabs
  Tab "Overview"
    Text "The first Tab is active if no other Tab has the active flag."
  Tab "Activity"
    List items="Paid #1042,Refunded #1039,Paid #1038"
  Tab "Settings"
    Switch "Email alerts" checked`,
        about: { Tab: { label: "The tab title." } },
        notes: ["Tabs can contain only Tabs. A Tab can only be in Tabs."],
        shadcn: "`Tabs defaultValue > TabsList(TabsTrigger*) + TabsContent*`.",
      },
    ],
  },
  {
    title: "Content",
    entries: [
      {
        types: ["Heading"],
        summary: "A section heading. The default level is 2.",
        example: `Heading "Level 1" level=1
Heading "Level 2 (default)"
Heading "Level 3" level=3
Heading "Level 4" level=4`,
        about: { Heading: { label: "The heading text.", props: { level: "The heading level, h1 to h4." } } },
      },
      {
        types: ["Text"],
        summary: "A paragraph. A line with only a string is also a Text.",
        example: `Text "Body text. The default size is md."
Text "Small and muted text for less important information." size=sm muted
Text "Bold text." bold
"A line with only a string is a Text."
Text lorem=24`,
        about: {
          Text: {
            label: "The text. Write a Label or lorem=, not the two.",
            props: { lorem: "Shows N placeholder words instead of a Label.", muted: "Uses the muted color.", bold: "Uses bold text." },
          },
        },
      },
      {
        types: ["Stat"],
        summary: "A key number with an optional title and hint. `trend` sets the color of the hint and adds an arrow.",
        example: `Grid cols=3
  Stat "$12,450" title="Revenue" hint="+12% vs last month" trend=up
  Stat "3.4%" title="Conversion" hint="-0.3% vs last month" trend=down
  Stat "318" title="Orders"`,
        about: { Stat: { label: "The value.", props: { trend: "The direction of the change. up is green and down is red." } } },
        shadcn: "Plain markup for the title, the value and the hint. shadcn has no Stat component.",
      },
      {
        types: ["Badge"],
        summary: "A small status label.",
        example: `Row gap=sm
  Badge "Default"
  Badge "Secondary" variant=secondary
  Badge "Outline" variant=outline
  Badge "Destructive" variant=destructive`,
        about: { Badge: { label: "The badge text." } },
      },
      {
        types: ["Avatar"],
        summary: "The initials of a person in a circle.",
        example: `Row gap=sm align=center
  Avatar "Ana Souza" size=sm
  Avatar "Bruno Lima"
  Avatar "Grace Kim" size=lg`,
        about: { Avatar: { label: "The name of the person. The Avatar shows the initials. The full name is the accessible name." } },
      },
      {
        types: ["Image"],
        summary: "A placeholder box for a picture, a map or a video. For a chart, use Chart.",
        example: `Grid cols=3
  Image "Product photo" ratio=1:1
  Image "Hero banner"
  Image "Store map" ratio=4:3`,
        about: { Image: { label: "The alt text. The box shows it.", props: { ratio: "The width-to-height ratio in whole numbers, for example 16:9, 4:3 or 21:9." } } },
      },
      {
        types: ["Alert"],
        summary: "A message box with a title and optional text.",
        example: `Alert "Heads up" text="Your trial ends in 3 days."
Alert "Payment failed" text="Update your card to keep your plan." variant=destructive`,
        about: { Alert: { label: "The title.", props: { text: "The text below the title." } } },
      },
      {
        types: ["Progress"],
        summary: "A progress bar.",
        example: `Text "Uploading 3 of 5 files" size=sm
Progress value=60`,
        about: { Progress: { props: { value: "The percentage that is complete. If you do not write it, the value is 0." } } },
      },
      {
        types: ["Table"],
        summary: "A table. Write the rows as `|` lines, or use `rows=N` to get placeholder rows.",
        example: `Table cols="Order,Customer,Status,Amount"
  | #1042 | Ana Souza | Paid | $120.00
  | #1041 | Bruno Lima | Open | $64.50
Table cols="Name,Email,Date,Status,Amount" rows=3`,
        about: {
          Table: {
            props: { cols: "The column headers, separated by commas. This prop is necessary.", rows: "Shows N placeholder rows instead of `|` lines." },
          },
        },
        notes: [
          "Each `|` row must have one cell for each column.",
          "Skizo makes placeholder cells from the column name: Name, Email, Date, Status or Amount. Other columns get Item n. The cells are the same each time.",
        ],
        shadcn: "`Table > TableHeader/TableRow/TableHead* + TableBody/TableRow/TableCell*`.",
      },
      {
        types: ["List"],
        summary: "A list with bullets. Write the items with `items=`, or use `rows=N` to get placeholder items.",
        example: `List items="Organic search,Direct,Referral"
List rows=3`,
        about: { List: { props: { items: "The items, separated by commas.", rows: "Shows N placeholder items instead of items=." } } },
      },
      {
        types: ["Chart"],
        summary: "A line, bar, area or pie chart. Write the data as `|` rows, as in a Table, or use `rows=N` to get placeholder rows.",
        example: `Grid
  Chart "Revenue" cols="Month,Revenue,Costs"
    | Jan | 1200 | 800
    | Feb | 1500 | 950
    | Mar | 1350 | 1100
  Chart "Orders" type=bar cols="Day,Orders" rows=5
  Chart "Traffic" type=area cols="Date,Visits" rows=6
  Chart "Plans" type=pie cols="Plan,Users"
    | Free | 620
    | Pro | 240
    | Team | 90`,
        about: {
          Chart: {
            label: "The accessible name of the chart. The chart does not show it.",
            props: {
              type: "The kind of chart.",
              cols: "The column headers, separated by commas. The first column gives the x axis, or the slice names of a pie. Each other column is a series of numbers. This prop is necessary.",
              rows: "Shows N placeholder rows instead of `|` lines.",
            },
          },
        },
        notes: [
          "Each `|` row must have one cell for each column. The cells after the first cell are numbers, for example 1200 or 12.5.",
          "A pie has exactly two columns: the slice name and its value.",
          "A chart with two or more series shows a legend.",
          "Skizo makes placeholder x values from the column name: Month, Day, Date or Year. Other columns get Item n. The numbers are the same each time.",
          "The Preview draws the chart as an SVG image. It uses the chart colors of the shadcn theme, `--chart-1` to `--chart-5`.",
        ],
        shadcn: "`ChartContainer > LineChart, BarChart, AreaChart or PieChart` from recharts, with `ChartTooltip`. The data is a const array above the component, with the column slugs as keys, and a `ChartConfig` gives the labels and colors.",
      },
    ],
  },
  {
    title: "Actions and forms",
    entries: [
      {
        types: ["Button"],
        summary: "A button. With `opens=`, it shows a Dialog or a Sheet. With `to=`, it shows a different Screen.",
        example: `Row gap=sm
  Button "Default"
  Button "Secondary" variant=secondary
  Button "Outline" variant=outline
  Button "Ghost" variant=ghost
  Button "Destructive" variant=destructive
  Button "Link" variant=link
Row gap=sm align=center
  Button "Small" size=sm
  Button "Large" size=lg
  Button "New" icon=plus
  Button "Settings" icon=settings icon-only variant=outline
  Button "Saving" loading
  Button "Disabled" disabled`,
        about: {
          Button: {
            label: "The button text. It is necessary also with icon-only.",
            props: {
              opens: "Shows the Dialog or Sheet with this id on the same Screen.",
              to: "Shows the Screen with this id. A Button can have opens= or to=, not the two.",
              loading: "Shows a spinner and disables the Button.",
              disabled: "Shows the Button as not available. With to=, the Button has no link.",
            },
          },
        },
      },
      {
        types: ["Input"],
        summary: "A text field with a label.",
        example: `Input "Email" type=email placeholder="you@example.com"
Input "Password" type=password value="hunter2" error="Must be at least 8 characters"
Input "Search" type=search placeholder="Search..." disabled`,
        about: { Input: { label: "The field label.", props: { type: "The type of field.", error: "An error message below the field." } } },
      },
      {
        types: ["Textarea"],
        summary: "A text field with more than one line, and a label.",
        example: `Textarea "Message" placeholder="Write something..." rows=3`,
        about: { Textarea: { label: "The field label.", props: { rows: "The number of visible lines." } } },
      },
      {
        types: ["Select"],
        summary: "A dropdown list with a label. In the Preview, it opens when you click it.",
        example: `Select "Status" options="Open,Paid,Refunded" value=Paid
Select "Country" options="Brazil,Portugal,Spain" placeholder="Pick a country"`,
        about: { Select: { label: "The field label.", props: { value: "The selected option. It must be one of the options." } } },
        shadcn: "`Label + Select > SelectTrigger(SelectValue) > SelectContent > SelectItem*`.",
      },
      {
        types: ["Checkbox", "Switch"],
        summary: "Controls with a label that are on or off.",
        example: `Checkbox "Accept the terms" checked
Checkbox "Subscribe to the newsletter"
Switch "Email alerts" checked
Switch "Beta features" disabled`,
        about: { Checkbox: { label: "The control label." }, Switch: { label: "The control label." } },
      },
      {
        types: ["Radio"],
        summary: "A group of options with a label. The user can select only one option.",
        example: `Radio "Plan" options="Free,Pro,Team" value=Pro`,
        about: { Radio: { label: "The group label.", props: { value: "The selected option. It must be one of the options." } } },
      },
    ],
  },
  {
    title: "Overlays",
    entries: [
      {
        types: ["Dialog"],
        summary: "A modal window. A Button with `opens=` shows it. The `open` flag shows it when the Preview loads. It must be a direct child of its Screen.",
        example: `Row
  Button "Edit profile" opens=edit-profile
Dialog "Edit profile" id=edit-profile desc="Click Save to keep your changes." open
  Input "Name" value="Ana Souza"
  footer
    Button "Cancel" variant=outline
    Button "Save"`,
        height: 380,
        about: { Dialog: { label: "The dialog title." } },
        notes: ["These close the Dialog: a footer Button without Behavior, the close button, the backdrop and the Escape key."],
        shadcn: "`Dialog > DialogContent > DialogHeader(Title, Description) + body + DialogFooter`. The export puts each footer Button in a `DialogClose`.",
      },
      {
        types: ["Sheet"],
        summary: "A modal window at the left or right side of the Screen. The rules for a Dialog also apply to a Sheet.",
        example: `Row
  Button "Filters" icon=sliders-horizontal variant=outline opens=filters
Sheet "Filters" id=filters desc="Show fewer orders." open
  Select "Status" options="Any,Open,Paid" value=Any
  Checkbox "Only flagged orders"
  footer
    Button "Apply"`,
        height: 380,
        about: { Sheet: { label: "The sheet title.", props: { side: "The side that the Sheet comes from." } } },
        shadcn: "The same as Dialog, with the `Sheet*` components and `side`.",
      },
      {
        types: ["Menu", "Item"],
        summary: "A dropdown menu with its own trigger Button. In the Preview, it opens when you click it.",
        example: `Row gap=sm
  Menu "Actions" variant=outline
    Item "Edit"
    Item "Duplicate"
    Item "Archive" disabled
    Item "Delete" destructive
  Menu "Row actions" icon=ellipsis icon-only variant=ghost open
    Item "Copy id"
    Item "Delete" destructive`,
        height: 240,
        about: {
          Menu: {
            label: "The trigger text. With icon-only, it is the accessible name.",
            props: { variant: "The style of the trigger Button.", open: "Shows the Menu open when the Preview loads." },
          },
          Item: { label: "The item text.", props: { destructive: "Shows the item in red, for dangerous actions." } },
        },
        notes: ["A Menu can contain only Items. An Item can only be in a Menu."],
        shadcn: "`DropdownMenu > DropdownMenuTrigger(Button) > DropdownMenuContent > DropdownMenuItem*`.",
      },
    ],
  },
  {
    title: "Your components",
    entries: [
      {
        types: ["Custom"],
        summary: "A component of your app that Skizo does not have, for example a chat bubble. Use it only when no other Element type fits.",
        example: `Custom "ChatBubble" author="Ana Souza" sent-at="9:41" mine
  Text "Where is my order?"
Custom "TypingIndicator"`,
        about: { Custom: { label: "The name of the component, in PascalCase. For example, ChatBubble." } },
        notes: [
          "A Custom takes all props and flags. `skizo check` does not check them.",
          "The Preview shows a box with a dashed border. The box shows the name, the props and the children.",
        ],
        shadcn: "`import { ChatBubble } from \"@/components/chat-bubble\"` and `<ChatBubble author=\"Ana Souza\" sentAt=\"9:41\" mine>`. A prop key with a hyphen becomes camelCase. A Custom without children becomes a self-closing tag.",
      },
    ],
  },
];
