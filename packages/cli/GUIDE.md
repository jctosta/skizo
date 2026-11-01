# Skizo Guide

Write UI mockups in Skizo (`.skz` files) using this syntax. Output only what's on screen; never invent elements or props not listed here.

## Syntax

```
Type "Label" flag key=value key="value with spaces"
  Child "..."
```

- Nesting by indentation, **2 spaces** (no tabs).
- One element per line: its type, then an optional quoted **label**, **flags**, **props**, in any order.
- **Flags** are bare lowercase words and mean `true` (`open`, `disabled`). Anything else is a prop: write `variant=secondary`, never bare `secondary`.
- List props are comma-separated: `options="Open,Paid"`.
- A line that is only a string is a text paragraph: `"Some text"`.
- `| a | b | c` lines are Table or Chart rows. `//` starts a comment line.
- Lowercase slot words group children: `actions` (Screen/Card header actions), `footer` (Card/Dialog/Sheet footer).
- Any element can take `id=name`. Ids are the targets of `opens=` and `to=`.
- Give content one way only: a label or `lorem=N`; `|` rows or `rows=N`; `items=` or `rows=N`.
- `icon-only` (Button, Menu) shows only the `icon=`; the label is still required.

## Elements

The first enum value is the default. `size` and `gap` are always `md|sm|lg`. `icon` is a Lucide name (`plus`, `home`).

```
Screen "Title"      id subtitle plain                top level; many per file
Sidebar             children: Link                   first child of Screen, or shared (see below)
Stack / Row         gap align=start|center|end justify=start|between|end
Grid                cols=2..6 (default 2) gap; children may set span=N
Separator
Heading "Text"      level=2|1|3|4
Text "Text"         size muted bold lorem=N
Stat "$12,450"      title hint trend=none|up|down
Badge "Text"        variant=default|secondary|outline|destructive
Avatar "Name"       size
Image "Alt"         ratio=W:H (default 16:9)         placeholder box
Alert "Title"       text variant=default|destructive
Progress            value=0..100
Card "Title"        desc; slots: actions footer
Tabs > Tab "Label"  active (one Tab); Tab children = its panel
Dialog "Title"      desc open; slot: footer          direct child of Screen
Sheet "Title"       desc open side=right|left; slot: footer   direct child of Screen
Menu "Trigger"      icon variant icon-only open (as Button); children: Item "Label" (destructive disabled)
Button "Label"      variant=default|secondary|outline|ghost|destructive|link
                    size icon icon-only disabled loading opens to
Link "Label"        icon active to                   only in Sidebar
Input "Label"       type=text|email|password|number|search placeholder value error disabled
Textarea "Label"    placeholder value rows
Select "Label"      options value placeholder open
Checkbox "Label"    checked disabled             (same for Switch)
Radio "Label"       options value
Table               cols="A,B,C"; rows as | lines (one cell per col), or rows=N (placeholder)
List                items="a,b,c" or rows=N
Chart "Name"        type=line|bar|area|pie cols="Month,Sales,Costs" (x, then series of numbers);
                    rows as Table; type=pie takes 2 cols
Custom "ChatBubble" any props, flags and children    a component of the app; only when no type fits
```

Write a `Sidebar` at the top level, before the first Screen, to share it with every Screen. A Screen with its own Sidebar shows that one; a `plain` Screen shows none.

## Behavior (the only kind)

- `opens=id` on a `Button` shows a `Dialog` or `Sheet` on the same Screen.
- `to=screenId` on a `Button` or `Link` goes to another `Screen` in the file. The Sidebar `Link` whose `to` is the current Screen shows as active.
- The preview switches Tabs, opens Menus and Selects, and closes Dialogs and Sheets on its own. Don't wire these.

## Example

```
Sidebar
  Link "Dashboard" icon=home to=dashboard
  Link "Orders" icon=package to=orders

Screen "Orders" id=orders subtitle="Track customer orders"
  actions
    Button "New order" icon=plus opens=new-order
  Grid
    Card "Revenue" desc="Last 30 days"
      Stat "$12,450" hint="+12% vs last month" trend=up
    Card "Pending"
      actions
        Menu "Pending actions" icon=ellipsis icon-only variant=ghost
          Item "Cancel all" destructive
      Badge "18 orders" variant=secondary
  Table cols="Order,Customer,Amount"
    | #1042 | Ana Souza | $120.00
    | #1041 | Bruno Lima | $64.50
  Dialog "New order" id=new-order
    Input "Customer"
    Select "Status" options="Open,Paid" value=Open
    footer
      Button "Create order"

Screen "Dashboard" id=dashboard
  Chart "Sales" type=bar cols="Month,Sales" rows=6
```

Before finishing, run `skizo check <file>` and fix every reported error.
