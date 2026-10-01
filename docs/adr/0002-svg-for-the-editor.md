# ADR 0002: SVG instead of canvas for the net editor

Status: accepted

## Context
The editor draws places, transitions and arcs and must be usable with keyboard and screen reader.

## Decision
Render the net as SVG elements managed by React. Every node is a focusable element with
`role="button"` and a descriptive `aria-label`.

## Consequences
- Nodes are real DOM elements, so focus, keyboard handling and testing with Testing Library work out of the box.
- Every structural change also has a form-based path (Structure and Selection panels), so nothing requires dragging.
- SVG gets slow with many thousands of elements. Nets of that size are out of scope for now;
  if they become relevant, the canvas could switch to `<canvas>` while keeping the forms as the accessible path.
