# Codebase Structure

> **Read when:** creating new files or navigating the Next.js project.

## Directory Layout

```
/
├── CLAUDE.md                # Entry point
├── CHANGELOG.md             # Updated by @release-manager after each verified task
├── MEMORY.md                # Written by @debug-memory; read by all agents for known bug patterns
├── tasks/                   # Generated TASK-NNN.md files (one per Tier 1/2 task)
├── docs/                    # Context files
│   ├── tech-stack.md
│   ├── coding-guidelines.md
│   ├── structure.md         # This file
│   └── api-discovery.md
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Login/Signup routes
│   │   ├── dashboard/       # Dashboard View
│   │   ├── library/         # Song Database
│   │   ├── setlists/        # Setlist Viewer & Archive
│   │   └── actions/         # Server Actions (Mutations)
│   ├── components/          # React Components
│   │   ├── client/          # 'use client' components
│   │   └── server/          # Pure Server components
│   ├── hooks/               # useTranspose, useAuth, etc.
│   ├── services/            # Supabase client (Server & Client versions)
│   ├── types/               # TypeScript interfaces & Supabase types
│   ├── utils/               # shiftChord, musicMath, chordRegex
│   └── styles/              # Global CSS & Tailwind v4 Theme
├── public/                  # Fonts and brand assets
└── tailwind.config.js       # Brand theme extensions
```

## Where Does It Go?

| Type of code                  | Location                                      |
| :---------------------------- | :-------------------------------------------- |
| Page Route / Data Fetch       | `src/app/<route>/page.tsx` (Server Component) |
| Database Mutation             | `src/app/actions/<feature>Actions.ts`         |
| Interactive UI (Button/Modal) | `src/components/client/`                      |
| Static UI (Layout shell)      | `src/components/server/`                      |
| Musical Math / Regex          | `src/utils/`                                  |
| Shared State / Context        | `src/hooks/` or `src/context/`                |
| Database Types                | `src/types/`                                  |
