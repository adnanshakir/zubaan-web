# DESIGN.md: Zubaan web prototype

Read this before building or changing any UI. Follow it exactly. If something
is not covered, choose the quieter option.

## Feel

A calm, dark, Apple-like interface for learning to speak. Greys and blacks,
one indigo accent, generous space, content first. Motion is small, fast and
always answers something the user did. Nothing bounces, glows or drifts on
its own.

## Stack (fixed)

Next.js App Router, TypeScript, Tailwind v4, shadcn/ui (Radix), lucide-react,
torph. Do not add other UI or animation libraries without asking.

## Color

Dark only: `<html lang="en" className="dark">`. Tokens live in
`src/app/globals.css` (block at the end of this file). Never hardcode hex;
use tokens or the Tailwind neutral and indigo scales.

- Surfaces: `background` (near-black), `card` (one step lighter), `muted`
  (two steps). Separate layers with 1px low-contrast borders (`border-border`),
  not shadows.
- Text: `foreground` for primary, `muted-foreground` for secondary.
- Accent is indigo only. Filled actions use `bg-primary` (indigo-600).
  Indigo text or icons on dark use `text-indigo-400`, never indigo-600.
- Semantic colors appear only as small text, dots, or 10% tinted backgrounds,
  never as large fills: emerald-400 for success and "used" states, amber-400
  for corrections and attention, `destructive` for errors.
- No gradients, no glow shadows, no colored section backgrounds.
- Always use variant:"indigo" as the primary variant.
- Scrollbars are hidden globally.

### Speech feedback colors

- Green (`emerald-400`) means a word was said.
- Amber (`amber-400`, dotted underline) means almost.
- Red (`rose-400`, wavy underline) means missed.
- Never use color alone: always pair the underline style with text.

## Typography

Geist Sans (next/font, set up by create-next-app) for everything. Geist Mono
only for latency numbers and debug values. Lesson hints are Hindi, Tamil and
Telugu, which Geist does not cover: load Noto Sans Devanagari, Noto Sans Tamil
and Noto Sans Telugu with `next/font/google` and add them to the font stack as
fallbacks.

- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-medium`
- Body: `text-sm/6`; lesson phrases and conversation text: `text-base`
- Caption: `text-xs text-muted-foreground`
- Line length about 60 characters. Sentence case everywhere.
- No ALL-CAPS labels, no small eyebrow labels above headings, no numbered
  decoration unless the content is a real sequence (lesson steps are).

## Layout

Mobile-first, because the real product is a phone app.

- Content column: `mx-auto w-full max-w-md px-5`, also on desktop (a
  phone-width canvas).
- Spacing in multiples of 4: `gap-3` inside a group, `gap-6` between groups,
  `py-8` page padding. Pages need `pb-28` so content clears the nav island.
- Radius: buttons and the nav are fully round (pills). Cards, inputs and
  message bubbles use `rounded-2xl`. One radius per kind of element.

## Navigation

A floating island pill, fixed bottom center:
`fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/80 p-1 backdrop-blur-md`.

- 3 to 4 items with an icon and a short label: Home, Lessons, Mistakes,
  Voice lab.
- The active item has a filled `bg-accent` pill that slides to the new item
  (CSS transform transition, 200ms).
- Hidden on the conversation screen, which has its own header with a back
  button. Add safe-area padding (`pb-[env(safe-area-inset-bottom)]`).

## Lesson flow

Overview -> player (words, sentences) -> conversation -> summary.

## Components

- **Buttons:** always `Button` from `@/components/ui/button`. It is our custom
  file: never regenerate it with the shadcn CLI and never use a raw `<button>`
  for a visible action.
  - Main action: `indigo` variant. One per section.
  - Secondary: `outline`. Tertiary: `ghost`.
  - Ending a conversation: `outline` with `text-destructive`.
  - Keep the default pill radius. Sizes: `default` for primary actions, `sm`
    in dense lists, `icon` for icon-only (always with `aria-label`).
- **Cards:** shadcn `Card`, flat, `border-border bg-card`, no shadow, `p-5`.
- **Inputs:** shadcn `Input` and `Textarea`, `rounded-xl`, indigo focus ring.
- **Feedback:** `sonner` toasts for transient errors; inline text for
  section-level errors.
- **Haptics:** tap = every Button press and nav tap; select = choosing an
  option; success = onboarding done, conversation finished, a phrase said
  right; nudge = recording start/stop, a correction shown, a phrase "almost";
  error = failures (always through `notifyError`) and a missed phrase. Import
  from `@/lib/haptics` and `@/lib/notify`.
- Sounds are on by default only on devices that cannot vibrate (desktop, iOS);
  the toggle is on Home.
- **Loading:** `Skeleton` blocks that match the final layout. Spinners only
  inside buttons (the `loading` prop).
- **Icons:** lucide-react, `size-4` in buttons, `size-5` in the nav.

## Motion

Motion confirms an action or shows what changed. No ambient or looping motion
except the recording pulse.

- Durations: 120ms press and hover, 200ms enter and exit, 300ms layout.
  Easing: `var(--ease-out-soft)` for enters, `ease-out` otherwise.
- Enter animations only for things that appear because of a user action
  (a correction card, the feedback summary):
  `animate-in fade-in-0 slide-in-from-bottom-1 duration-200`. Do not animate
  every section on page load. A page gets at most one gentle entrance.
- Text that changes state uses torph:
  `import { TextMorph } from "torph/react"`. Use it for short text only (up to
  about four words, or a number): button labels (Record, Stop, Transcribing),
  status lines, the turns-remaining counter, latency numbers. It must be inside
  a client component. Use the default easing; use
  `ease={{ stiffness: 200, damping: 20 }}` only for the record button label.
- The Button already scales on press. Do not add hover animation to buttons or
  cards.
- Recording: one soft indigo ring pulse behind the mic button while recording
  (2s, opacity plus scale up to 1.15 at most).
- Respect reduced motion: `motion-reduce:` variants disable transforms and
  pulses.
- Animate only `transform` and `opacity`, never width, height, top or left.

## Copy

Sentence case, active verbs, plain words: "Start conversation", "Stop
recording", "Try again". A success message reuses the action's name. Errors say
what happened and what to do, with no apology and no jargon. Use
`describeError` from `src/lib/api/client.ts` for API errors. Empty states say
what to do next.

## Accessibility baseline

- Visible keyboard focus on every interactive element.
- Icon-only buttons have `aria-label`. Audio controls work with the keyboard.
- Text contrast at least 4.5:1. Touch targets at least 40px.
- Never rely on color alone: a correction shows an icon and text, not just
  amber.

## Screens (prototype scope)

Onboarding, Home, Lessons list, Lesson detail (learn, repeat, roleplay),
Conversation, Mistakes, Voice lab. Data for each screen: see
`docs/api/INDEX.md`.
