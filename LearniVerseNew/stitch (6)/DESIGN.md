# Design System Specification: The Academic Luminary

## 1. Overview & Creative North Star
**Creative North Star: "The Modern Scholar’s Horizon"**

This design system moves away from the rigid, sterile "LMS" (Learning Management System) look. Instead, it adopts an **Editorial Tech** aesthetic—merging the authoritative weight of a traditional high-end academy with the fluid, airy feel of a premium SaaS product. 

To break the "template" look, designers must embrace **Intentional Asymmetry**. Hero sections should utilize "The Floating Horizon"—where content is anchored on a `surface` background while supplemental imagery or data cards overlap onto `surface-container` sections. This layering creates a sense of kinetic energy, reflecting a school that is moving forward.

---

## 2. Colors & Surface Architecture

### The "No-Line" Rule
Traditional borders are forbidden. To achieve a premium, high-end feel, section boundaries must be defined solely through **background color shifts**. For example, a student’s dashboard might sit on a `background` (#f5f7f9), while the "Next Assignment" module uses a `surface-container-lowest` (#ffffff) to naturally lift from the page.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of high-quality paper.
- **Base Layer:** `background` (#f5f7f9)
- **Primary Content Blocks:** `surface-container-low` (#eef1f3)
- **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **Overlays/Modals:** `surface-bright` (#f5f7f9) with a 24px blur.

### Signature Textures: The "Deep Sea" Gradient
For primary CTAs and Hero backgrounds, do not use flat hex codes. Use a linear gradient (135°) from `primary` (#40589c) to `primary_container` (#8ea6f0). This adds "soul" and depth, moving the brand from "standard blue" to "authoritative navy."

---

## 3. Typography: Authority Meets Approachability

The type system uses a dual-font strategy to balance academic rigor with student-friendly accessibility.

*   **Display & Headlines (Plus Jakarta Sans):** This is our "Tech-Forward" voice. Use it with generous letter-spacing (-0.02em) for `display-lg` to create a bold, editorial impact. It feels modern and crisp.
*   **Body & Titles (Manrope):** This is our "Human" voice. Manrope's open apertures make long-form curriculum content highly readable even on small screens.

**Hierarchy as Identity:**
- **The Power Gap:** Use a high contrast between `headline-lg` (2rem) and `body-md` (0.875rem). The large headings act as anchors, while the body text breathes in the negative space.

---

## 4. Elevation & Depth: The Layering Principle

### Tonal Layering
Avoid shadows where possible. Instead, "stack" your tokens:
1.  **Level 0:** `background`
2.  **Level 1:** `surface-container` (For sidebar or secondary navigation)
3.  **Level 2:** `surface-container-lowest` (For the main content card)

### Ambient Shadows
When a component must float (e.g., a "New Message" popover), use an **Ambient Shadow**:
- `Color`: `on-surface` (#2c2f31) at 6% opacity.
- `Blur`: 40px.
- `Y-Offset`: 12px.
- This creates a soft, natural lift rather than a harsh, dated drop shadow.

### Glassmorphism & Ghost Borders
For tech-forward elements like "In-Progress" badges or floating navigation bars, use `surface-container-lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. If a border is required for accessibility, use a **Ghost Border**: `outline-variant` (#abadaf) at 15% opacity.

---

## 5. Components

### Buttons: The "Soft Kinetic" Style
- **Primary:** Gradient (`primary` to `primary_container`), `on-primary` text. Border radius: `md` (0.75rem).
- **Secondary:** `secondary_container` background with `on-secondary_container` text.
- **Tertiary:** No background. `primary` text.
- *Interaction:* On hover, the button should lift slightly (Y-offset -2px) using an Ambient Shadow.

### Cards: The "Invisible Container"
- **Rules:** No 1px borders. Use `surface-container-lowest` against a `surface-container` background.
- **Padding:** Always use `xl` (1.5rem) internal padding to maintain the "Soft Minimalist" feel.
- **Header:** Use `title-md` in `primary` to anchor the card’s purpose.

### Input Fields: The "Quiet Entry"
- **Style:** Background `surface-container-high`, no border.
- **Focus State:** A 2px "Ghost Border" of `primary` at 40% opacity.
- **Roundedness:** `sm` (0.25rem) to signify precision and data entry.

### Additional Signature Component: The "Progress Aura"
For student progress tracking, use a circular gauge with the `secondary` (#006668) teal. Surround the gauge with a soft glow using `secondary_container` at 20% opacity to symbolize "vibrant energy" and achievement.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use `secondary` (Teal) sparingly as a "success" or "action" signal to contrast the Navy.
- **Do** maximize white space. If you think there’s enough space, add 8px more.
- **Do** overlap elements. Place a small image or badge 25% outside its parent container to break the grid.

### Don't:
- **Don’t** use black (#000000). Use `on-surface` (#2c2f31) for all text to keep the palette sophisticated.
- **Don’t** use "Alert Red" for everything. Use `error` (#b31b25) only for critical system failures; use `tertiary` (Purple) for "Needs Attention" to avoid stressing students.
- **Don't** use lines to separate list items. Use 16px of vertical space or a 5% opacity `surface-variant` background shift.