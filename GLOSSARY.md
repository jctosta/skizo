# Skizo

A tiny, indentation-based language that agents use to sketch UI mockups, plus the tools that check a sketch and turn it into a clickable preview or framework code.

## Language

### Source

**Screen**:
A top-level Element standing for one page of the mocked-up app. A Skizo file holds one or more Screens.
_Avoid_: Page, view

**Overlay**:
A Dialog, Sheet or Menu: content hidden until opened, then shown above its Screen. A Dialog or Sheet belongs to exactly one Screen; a Menu always carries its own trigger.
_Avoid_: Modal, popup, popover

**Behavior**:
A click effect the author declares on an Element: `opens=` shows an Overlay, `to=` goes to another Screen. Built-in interactions such as switching Tabs, opening a Menu or closing an Overlay are not Behavior.
_Avoid_: Interaction, action, event

**Element**:
One line of Skizo source that puts something on screen, such as `Card "Revenue"`, together with everything nested under it.
_Avoid_: Component, node, widget

**Element type**:
The kind of an Element, such as Card, Button or Screen. The fixed set of Element types is the whole vocabulary an agent may use.
_Avoid_: Component, widget

**Guide**:
The short, self-contained description of the language that an agent reads before writing Skizo. It holds everything an agent needs and nothing about how the tools work inside.
_Avoid_: Agent reference, prompt, docs

**Label**:
The optional quoted string on an Element line. Its meaning depends on the Element type: a button's text, a heading's text, a stat's value, an image's alt text.
_Avoid_: Content, text, title

### Output

**Backend**:
Anything that turns a checked Skizo file into output. The preview and every Export target are Backends.
_Avoid_: Renderer, compiler

**Preview**:
The Backend that turns a Skizo file into one clickable HTML page holding every Screen, for a human to look at and steer.
_Avoid_: Render, mockup (for the output)

**Export target**:
A Backend that produces framework code meant to be kept and edited by hand, such as shadcn React. The preview is not an Export target.
_Avoid_: Target (for the preview), backend (when only code output is meant)
