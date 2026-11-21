# Doctype migration

Apps without `<!DOCTYPE html>` render in quirks mode. Adding it switches to standards mode, which changes how some things look. This guide covers what to look for, how nitro fixed it in the example app, and how to check nothing changed.

## What changes

1. Page height: in quirks mode the body always fills the screen. In standards mode it's only as tall as its content, so short pages stop partway down and percentage heights like `min-h-full` or `min-h-[100%]` no longer resolve.
2. Tables: in quirks mode tables don't inherit font size or line height (they use the browser default, 16px and `normal`). In standards mode they inherit from the page.
3. Line heights: in quirks mode a line holding only an icon, checkbox, spinner or inline block shrinks to fit it. In standards mode it always reserves the parent's full line height, adding a few pixels.
4. Labels: a label above an input gets the same extra line height, pushing the input down.
5. Unitless lengths: quirks mode reads `min-h-[150]` as 150px. Standards mode ignores it.
6. Table cells: quirks mode counts padding and border inside a fixed height on `display: table-cell` elements. Standards mode adds them on top.

## Fixes used in nitro

These are guidelines from the example app, Tracform and Crosby, not fixed rules. Each app's markup differs, so use whichever fix keeps the pixels identical there.

1. Page height: use `min-h-screen` on the layout wrapper instead of `min-h-full` or `min-h-[100%]`.
2. Tables: set the size on the table itself, e.g. the calendar's `text-[16px] leading-[normal]` in `calendar.tsx`.
3. Line heights: make the wrapper `flex`, or the element `block`, so there's no line box, e.g. the checkbox input and the spinner wrappers.
4. Labels: `label { display: block; }` is in core `components.css`, so apps don't need their own rule. Classes on a label (`flex`, `block truncate`) still override it. The text and inputs render the same, only the invisible label box changes: it spans the full row and is the full line height (e.g. 19px instead of 17px).
5. Unitless lengths: add the unit, e.g. `min-h-[150px]`. Search for them with:
   ```bash
   grep -rnoE "\b(m|p|w|h|min-w|min-h|max-w|max-h|top|left|gap)[a-z-]*-\[-?[0-9.]+\]" components client
   ```
6. Table cells: take the padding and border off the height, e.g. `h-[38px] py-[6px] border-b` becomes `h-[25px] py-[6px] border-b`. Where some rows drop the border (e.g. a dragged row with `!border-b-0`), putting the height on the `table-row` instead can work better, as Crosby does.
7. Chips and tags: an inline block chip alone on a line can take `align-top`. An `inline-flex` tag in a table cell can become `flex w-fit`, though a right aligned column then needs a wrapper like `innerClassName: '[&>div]:flex [&>div]:justify-end'`. A textarea in a bordered box usually wants `block`.
8. Small dots in a table cell: `align-top` won't shrink the line below the parent's line height, so a flex wrapper is easier, e.g. `innerClassName: '[&>div]:flex [&>div]:justify-center'`.
9. Inline blocks inside a link in a flex heading, e.g. Crosby's order number badge in the breadcrumb: making the link `flex` keeps it in place.
10. Text in a different font alone in a cell, e.g. a `font-mono` code: making the span `block` stops it sitting 1px lower.

Known differences:
- A chip plus text label that wraps in a narrow select menu gets rows 1.42px taller. We kept this, since the quirks spacing was the uneven one.
- A `<br />` on its own empty line gets a 0x18 box (0x0 in quirks). Pixels are the same, e.g. the 404 page.
- Spans made `block` (point 10) get a taller, full width box, like labels. Pixels are the same.

Most of these render the same in quirks mode, so they can land before the doctype. The table cell heights only work in standards mode, so they land with it.

## Checking nothing changed

Use a visual regression loop: capture every page before the change, make the change, then compare with zero tolerance and keep fixing until nothing differs. For example, a Claude Code skill like `visual-qa-loop` paired with a reviewer agent.

1. Baseline: run the app without the doctype and capture every page.
2. Noise check: capture again with no change. Anything that differs (clocks, random data) gets frozen or hidden, then retake the baseline.
3. Change: add the doctype and the fixes above.
4. Compare: capture again and diff against the baseline. Repeat fixing until it passes.
5. Review: have a separate reviewer click through both versions side by side for anything the capture missed.

What to capture:
- Every route, with real ids from the dev database. List them from the code (e.g. grep the `.route` objects), since nested pages like purchase orders are easy to miss.
- Interactive states: open dropdowns, selects, date and time pickers, modals, drawers, notifications, form errors, row selection, hovers.
- Three widths, e.g. 1440, 768 and 375.
- Short pages and tall pages, to check backgrounds and sidebars still reach the bottom.

How to compare:
- 2x lossless screenshots, pixel diff with zero tolerance.
- Every element's exact box (unrounded) and computed styles: font size, line height, colour, padding, margin.
- Freeze the browser clock so date and time pickers render the same.
- Disable animations and move the mouse away after clicks.
- To baseline a page or state you missed, check out the original app code, capture it, then put your changes back. To quickly compare one element, strip the doctype from the HTML response instead (e.g. a Playwright route), so the same build renders in both modes.

Shared core changes must also be checked in every app still in quirks mode, so they stay identical there too.
