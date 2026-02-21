# PES Tracker

A personal football statistics tracker built for PES (Pro Evolution Soccer). Log your matches, manage your squad, track performance across seasons and competitions, and study your record against every opponent — all stored locally in your browser with no account or server required.

## Features

### Dashboard
- Season-aware win/draw/loss record and win rate
- Form guide showing results from your last 5 matches
- Top scorers and top assisters leaderboard
- Competition breakdown with per-competition records
- Current and best win/unbeaten streaks
- Recent match results at a glance
- Player milestone tracking (appearances, goals, assists)

### Squad
- Add, edit, and remove players with name, age, rating, and position
- Mark players as starters, loaned, sold, or retired
- Sort by name, rating, goals, assists, or appearances
- Filter by position group, starter status, or search by name
- Per-player stats (goals, assists, appearances) filtered by season and competition

### Matches
- Log matches with opponent, score, competition, and matchday
- Assign goal scorers and assisters for every goal
- Visual formation pitch — place all 11 players into formation slots
- Bench support for up to 5 substitutes
- Multiple competition formats: league, knockout, group-knockout, or freetext
- Auto-generated matchday labels based on competition format and round
- Filter and browse match history by season and competition

### Opponents
- Full head-to-head record against every opponent you have faced
- Stats include played, wins, draws, losses, goals for, goals against, and goal difference
- Sortable columns and search by opponent name
- Drill into any opponent for a detailed match-by-match breakdown

### Seasons & Competitions
- Create and manage multiple seasons; switch active season at any time
- All stats pages respect the active season filter
- Custom competitions with configurable formats and round structures
- Season filter available across squad, matches, opponents, and dashboard

### Settings
- Set a custom team name displayed across the app
- Manage seasons (create, rename, set active, archive)
- Manage teams — archive the current team and start fresh
- Export all data to a JSON file and import it back to restore or transfer saves

## Tech Stack

| Technology | Version |
|---|---|
| [Next.js](https://nextjs.org) | 16 |
| [React](https://react.dev) | 19 |
| [TypeScript](https://www.typescriptlang.org) | 5 |
| [Tailwind CSS](https://tailwindcss.com) | 4 |

All data is persisted in `localStorage` — no backend, no database, no login required.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Data & Privacy

All data is stored exclusively in your browser's `localStorage`. Nothing is sent to any server. Use the **Export** option in Settings to back up your data or move it to another browser or device.
