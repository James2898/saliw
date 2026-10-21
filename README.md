# Saliw (sa·líw) — Music Portal & Setlist Manager

> **Saliw** *(Tagalog: accompaniment, to harmonize with melody)* is a modern, web-based chord sheet and setlist management portal tailored for worship leaders, church musicians, and live bands. Built with an artisan aesthetic, real-time stage sync, and robust musical transposition.

[![Next.js](https://img.shields.io/badge/Next.js-15_(App_Router)-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Auth_%2B_Realtime-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit_Tests-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)

---

## ✨ Features

### 🎵 Dynamic Chord Sheet Engine
- **Live Transposition**: Seamlessly shift song keys up or down in real time using a standard 12-note chromatic scale (`C, C#, D, D#, E, F, F#, G, G#, A, Bb, B`) with enharmonic awareness.
- **Performance Keys**: Set custom keys per song in a setlist without altering the original master song key in the database.
- **Capo Calculation**: Computes and displays capo fret positions based on performance key vs. chord shape key.
- **Chord Helper (CAGED Voicings)**: Integrated drawer (`ChordDrawer`) displaying interactive chord voicings and fretboard fingerings for guitarists and keyboardists.
- **Smooth Auto-Scroll**: Hands-free stage scrolling with customizable scroll speeds, hotkey toggles, and floating controls positioned to clear mobile viewports.
- **Dual-View Mobile Editor**: Responsive segmented editor with live side-by-side editing and preview, preserving form state without unmounting.
- **YouTube Integration**: Embed sandboxed tutorial or reference performance videos alongside chord sheets.

### 📋 Setlist Builder & Live Rehearsal
- **Drag-and-Drop Ordering**: Reorder songs quickly using intuitive `@dnd-kit` drag-and-drop handles.
- **Musician Lineup & Roles**: Assign worship leaders, vocalists, and band members with their respective instruments per setlist.
- **Service Navigator**: Instant navigation drawer and deck for switching between songs during rehearsals or live Sunday services.
- **Public vs. Private Visibility**: Fine-grained visibility toggles with PostgreSQL Row Level Security (RLS) enforcement.

### ⚡ Realtime Band Sync
- **"Go Live" Broadcast**: Worship leaders can broadcast real-time setlist state (active song, selected key, and scroll position) via Supabase Realtime channels.
- **"Follow Leader" Mode**: Band members can lock into the worship leader's live session, automatically following song transitions and key changes during performance.

### 🛡️ Security & Role-Based Access Control (RBAC)
- **Granular Permissions**:
  - `guest` / `member`: Read-only access to song library and public setlists.
  - `music_director` / `admin`: Full mutation rights for adding/editing songs, building setlists, and managing musician rosters.
- **Database Hardening**: Enforced PostgreSQL Row Level Security (RLS) policies, safe auth redirect validation, and column tampering protections.

### 🎨 Artisan Design System
- **Warm Stage Palette**: Thoughtfully designed with warm artisan tones:
  - Cream: `#FDF8F3` (`--brand-cream`)
  - Tan: `#BC8E5C` (`--brand-tan`)
  - Brown: `#835B43` (`--brand-brown`)
  - Espresso: `#2D1F1B` (`--brand-espresso`)
- **Stage-Ready Dark Mode**: High-contrast, glare-free dark theme engineered for low-light stage and sanctuary environments.
- **Typography**: Clean hierarchy with *Plus Jakarta Sans* for UI navigation and monospaced *JetBrains Mono* for chord sheet alignment.

---

## 🛠️ Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | App Router, React Server Components (RSC), Server Actions, Turbopack |
| **Frontend Library** | [React 19](https://react.dev/) | Client & Server Component architecture, Hooks |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type checking, domain musical types, Supabase DB generics |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | CSS-first configuration, CSS variables, dark mode support |
| **Backend & DB** | [Supabase](https://supabase.com/) | PostgreSQL, GoTrue Auth, Realtime Broadcast, Row Level Security (RLS) |
| **UI Components & Icons**| [Lucide React](https://lucide.dev/) | Clean, consistent icons |
| **Interactivity** | [@dnd-kit](https://dndkit.com/) | Accessible drag-and-drop for setlist builder |
| **Testing** | [Vitest](https://vitest.dev/) | Fast unit testing for parsers and musical logic |
| **Deployment** | [Vercel](https://vercel.com/) | Edge network, automatic preview deployments |

---

## 📂 Project Structure

```
saliw/
├── docs/                       # Project architecture, guidelines, and tech stack
│   ├── coding-guidelines.md    # Design system, styling, and musical logic standards
│   ├── tech-stack.md           # Locked architectural decisions
│   ├── structure.md            # Directory structure conventions
│   └── api-discovery.md        # Supabase Server Action contracts & discovery protocol
├── public/                     # Static assets, fonts, icons, and brand graphics
├── scripts/                    # Automation and migration scripts
│   ├── import-hymns.ts         # OpenHymnal chord sheet batch importer
│   └── parsers/                # Markdown and chord parsing utilities & unit tests
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, forgot password, and reset password routes
│   │   ├── actions/            # Next.js Server Actions (Supabase mutations)
│   │   ├── auth/callback/      # OAuth & auth redirect handler with open-redirect guards
│   │   ├── library/            # Song catalog, song details, creator, and editor
│   │   ├── musicians/          # Musician directory and roster management
│   │   ├── profile/            # User account settings and role inspection
│   │   └── setlists/           # Setlist overview, live viewer, and setlist builder
│   ├── components/             # Reusable UI component library
│   │   ├── client/             # Interactive client components (drawers, modals, forms)
│   │   ├── dashboard/          # Dashboard greeting, quick actions, and recent feeds
│   │   ├── server/             # Pure Server Components (cards, layouts, breadcrumbs)
│   │   ├── setlists/           # Setlist-specific widgets and builder sections
│   │   └── SongViewer/         # Chord sheet rendering engine (ChordSheetClient)
│   ├── hooks/                  # Custom React hooks (useTranspose, useAutoScroll, useSetlistSync)
│   ├── services/               # Supabase browser and server SSR clients
│   ├── styles/                 # Global styles and Tailwind v4 theme definitions
│   ├── types/                  # TypeScript domain types and Supabase database definitions
│   └── utils/                  # Musical transposition math, YouTube parser, chord regex
├── supabase/
│   └── migrations/             # Timestamped SQL migration scripts for PostgreSQL schema & RLS
├── tasks/                      # Project task tracking specifications (TASK-NNN.md)
├── CHANGELOG.md                # Detailed release notes and task implementation logs
├── CLAUDE.md                   # AI agent conventions and multi-agent workflow guide
└── MEMORY.md                   # Root cause learnings and anti-pattern documentation
```

---

## 🎼 Chord Notation Format

Song lyrics and chords in Saliw use bracketed inline notation. Place chord symbols inside square brackets directly before or above the syllable where the chord change occurs:

```text
[VERSE 1]
[G]Amazing grace, how [C]sweet the [G]sound
That [G]saved a wretch like [D]me
I [G]once was lost, but [C]now am [G]found
Was [Em]blind, but [D]now I [G]see

[CHORUS]
My [G]chains are [C]gone, I've been set [G]free
My [C]God, my Savior has ransomed [D]me
```

### Supported Section Tags
- `[INTRO]`, `[VERSE]`, `[VERSE 1]`, `[VERSE 2]`, `[CHORUS]`, `[BRIDGE]`, `[PRE-CHORUS]`, `[OUTRO]`, `[INSTRUMENTAL]`, `[TAG]`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher recommended
- **npm**: `v10.x` or higher
- **Supabase Account**: A Supabase project with PostgreSQL database

### 1. Clone the Repository
```bash
git clone https://github.com/James2898/saliw.git
cd saliw
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local  # or create manually
```

Populate the required Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

### 4. Apply Database Migrations
Apply the migrations in `supabase/migrations/` to your Supabase PostgreSQL instance:
```bash
# Using Supabase CLI:
supabase db push

# Or apply migration SQL files sequentially in the Supabase SQL Editor dashboard
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch Saliw.

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Starts the Next.js development server with Turbopack |
| `build` | `npm run build` | Compiles and optimizes the app for production |
| `start` | `npm run start` | Runs the compiled production server |
| `lint` | `npm run lint` | Runs ESLint validation across all code |
| `format` | `npm run format` | Runs Prettier to auto-format files in `src/` |
| `test:unit` | `npm run test:unit` | Executes unit tests with Vitest |
| `import:hymns` | `npm run import:hymns` | Parses and imports OpenHymnal chord charts into the database |

---

## 🤝 Contributing & Workflow

Saliw uses a structured multi-agent and task specification workflow:
- Tasks are defined and archived under `tasks/TASK-NNN.md`.
- Architectural conventions and coding standards are documented in `docs/coding-guidelines.md`.
- All notable updates and completed tasks are tracked in [`CHANGELOG.md`](./CHANGELOG.md).
- Root-cause resolutions and lessons learned are preserved in [`MEMORY.md`](./MEMORY.md).

---

## 📄 License

This project is licensed for personal and church ministry use. All rights reserved.
