# Research — Setlist Viewer Settings Modal

## Open Questions

### Blocking (user input required)

1. **Chord color presets — Artisan palette vs. general readability colors?**
   Should the 5 preset chord background colors and 5 preset chord font colors be drawn from the Artisan palette (cream `#FDF8F3`, tan `#BC8E5C`, brown `#835B43`, espresso `#2D1F1B`, plus a 5th derived or accent color), or should they be general-purpose readability colors (e.g. yellow highlight, blue, green, pink, white) chosen for visual contrast against chord sheet backgrounds?
   This is a design/product decision. The answer determines the exact color values written into the component — it cannot be inferred from the existing codebase.
   **Status: Awaiting user answer.**

### Pending Reconciliation (resolved by @task-logger against context.md)

2. What are the 5 preset chord background colors and chord font colors, once the blocking question above is answered?
   (Suggested resolution source: after user answers Q1, derive from Artisan CSS variables in `src/styles/` or use general palette as directed.)

3. What is the current default chord token color (`.chord-item` CSS class)?
   (Suggested resolution source: `src/styles/globals.css` or the chord sheet component for `.chord-item` color rule.)

4. What are the existing min/max font size bounds in `src/hooks/useFontSize.ts`?
   (Suggested resolution source: `src/hooks/useFontSize.ts`, look for constants like `MIN_FONT_SIZE`, `MAX_FONT_SIZE`.)

5. What `localStorage` key does the existing `useFontSize` hook use?
   (Suggested resolution source: `src/hooks/useFontSize.ts`, look for the string literal passed to `localStorage.getItem` / `localStorage.setItem`.)

6. Which component file is the existing font size adjuster UI (the component to be reused in the Font tab)?
   (Suggested resolution source: search `src/components/client/` for a slider or stepper labeled "font size".)

7. Which file is the setlist viewer header that must receive the new gear icon?
   (Suggested resolution source: `src/app/setlists/[id]/` and associated layout or viewer client components.)
