# Feature Specification — Setlist Display Layout Settings

## Feature Summary
The Setlist Viewer layout settings feature optimizes chord sheet reading on larger screens (MacBook and desktop displays) by eliminating wasted whitespace and horizontal container constraints (`max-w-3xl`). It adds a third "Layout" tab to `SetlistSettingsModal` containing: a fine-grained line-height stepper (1.2 to 2.4, default 1.8), content width switching (Centered `max-w-3xl` vs Full Width `w-full`), and Page View mode displaying one song per screen across 1, 2, or 3 side-by-side columns (with responsive collapse on smaller viewports). In Page View mode, vertical auto-scroll is disabled, and navigation between songs and multi-page overflow sections is controlled via Space/Arrow keys or subtle on-screen edge navigation. Songs exceeding vertical height paginate across columns by default or can optionally auto-scale to fit the screen. Layout preferences persist client-side in `localStorage` without impacting mobile views.

## Acceptance Criteria
1. **Layout Tab in Settings Modal:** `SetlistSettingsModal` renders a third tab labeled "Layout" alongside the existing "Font" and "Chords" tabs.
2. **Line Spacing Stepper Range & Default:** In the Layout tab, a Line Spacing stepper allows adjusting chord sheet line spacing between `1.2` and `2.4` in increments of `0.1`. The default value is `1.8`.
3. **Line Spacing Stepper Controls:** The stepper includes a decrement (`-`) button, an increment (`+`) button, and a Reset button/action that restores line spacing to `1.8`. The decrement button is disabled at `1.2`, and the increment button is disabled at `2.4`.
4. **Line Spacing Visual Application:** Adjusting the line spacing immediately updates chord and lyric line heights in the setlist viewer without requiring a page reload (via `--chord-line-height` CSS variable).
5. **Content Width Toggle:** In the Layout tab, a Width toggle allows selecting between "Centered" (`max-w-3xl`) and "Full Width" (`w-full`). When multi-page mode (2 or 3 columns) is enabled, content width automatically defaults to Full Width.
6. **Page View Mode Selection:** In the Layout tab, the user can configure the layout mode: Continuous Scroll (standard) or Page View with column options: 1 Column, 2 Columns, or 3 Columns side-by-side.
7. **Single Song Display in Page View Mode:** When Page View mode is active, the viewer presents exactly one song per screen/view.
8. **Responsive Column Fallbacks:**
   - 3-column layout displays 3 side-by-side columns on viewports >= 1280px (`xl`). On viewports between 1024px and 1279px, it collapses to 2 columns. On viewports < 1024px, it collapses to 1 column.
   - 2-column layout displays 2 side-by-side columns on viewports >= 1024px (`lg`). On viewports < 1024px, it collapses to 1 column.
9. **Auto-Scroll Deactivation in Page View Mode:** When Page View mode is active, the vertical auto-scroll toolbar and scrolling action are disabled/hidden.
10. **Keyboard Navigation in Page View Mode:**
    - Pressing `Space` or `ArrowRight` advances to the next sub-page (if song overflows) or the next song.
    - Pressing `ArrowLeft` navigates to the previous sub-page or previous song.
    - Default browser page scroll on `Space` and Arrow keys is prevented (`e.preventDefault()`).
11. **Keyboard Shortcut Input Guard:** Keyboard navigation shortcuts (`Space`, `ArrowRight`, `ArrowLeft`) are disabled whenever focus is inside any `<input>`, `<textarea>`, `<select>`, editable element, or when any modal dialog (including `SetlistSettingsModal`) is open.
12. **On-Screen Edge Navigation:**
    - Subtle on-screen edge navigation targets (floating prev/next buttons or margin hitboxes) are provided on the left and right edges in Page View mode.
    - Clicking on chords or lyrics does NOT trigger edge navigation.
    - Previous button is disabled/inactive on the first page of the first song. Next button is disabled/inactive on the last page of the last song.
13. **Long Song Multi-Page Overflow Stepping (Default):** In Page View mode, songs that exceed the screen height are split into multi-page steps (e.g., in 2-column mode, Screen 1 shows Pages 1 & 2 of Song A, Next advances to Pages 3 & 4 of Song A, subsequent Next advances to Song B).
14. **Fit Song to Screen Mode (Optional):** In the Layout tab, toggling "Fit song to screen" dynamically scales font size to fit the entire song within the screen height without sub-pages or vertical overflow.
15. **Compact Song Header in Multi-Page Mode:** In multi-page mode (or Page View mode), the song header renders in a compact single-line format (Song Title, Artist, Key badge) with Transpose and Capo controls housed in an expandable popover.
16. **Client-Side Preference Persistence:** All layout settings (`lineHeight`, `contentWidth`, `pageColumns`, `overflowBehavior`) are persisted in client `localStorage` so desktop adjustments do not affect mobile layouts.
17. **SSR Hydration Safety:** State initialization from `localStorage` uses an SSR-safe pattern (no hydration mismatch warnings and no synchronous `setState` in `useEffect` per MEMORY.md BUG-001 and BUG-020).
18. **Artisan Theme & Dark Mode Compliance:** All controls in the Layout tab, popovers, and edge navigation buttons adhere to the Artisan palette (`--brand-cream`, `--brand-tan`, `--brand-brown`, `--brand-espresso`, `--brand-darker`) with explicit `dark:` classes paired on all named Tailwind utilities per MEMORY.md BUG-005.

## Out of Scope
- Backend persistence or user account sync for layout preferences (persisted exclusively in client `localStorage`).
- Changes to Song Viewer standalone page (`/songs/[id]`) — this task is scoped strictly to the Setlist Viewer (`/setlists/[id]`).
- Custom color picker or new chord colors (handled by existing Chords tab).
- Custom font family selection.
