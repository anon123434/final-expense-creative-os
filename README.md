# Final Expense Creative OS

A Next.js application for generating direct-response insurance ad creative — from concept ideation through scripts, visual plans, scene prompts, and voiceover scripts.

## Architecture

- **Next.js 16** (App Router + Turbopack)
- **Supabase** for auth and database
- **Dual LLM providers**:
  - **Claude** (Anthropic) — concepts, scripts, variations, transforms
  - **OpenAI** — voiceover scripts, visual plans, scene prompts
- API keys resolve **settings-first**: Settings page → environment variables → mock fallback

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- API keys for Claude and/or OpenAI (optional — mock fallback is available)

## Local Setup

```bash
# 1. Clone the repo
git clone git@github.com:<your-username>/final-expense-creative-os.git
cd final-expense-creative-os

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# 4. Run the Supabase migration (if you have the Supabase CLI)
supabase db push

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | No | Claude API key (or set via Settings page) |
| `OPENAI_API_KEY` | No | OpenAI API key (or set via Settings page) |

API keys can also be configured at runtime via the **Settings** page (`/settings`), which stores them in Supabase with row-level security.

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (concepts, script, visual-plan, etc.)
│   └── (authenticated)/  # Protected routes
│       ├── campaigns/    # Campaign pages (concepts, script, visual plan, prompts)
│       └── settings/     # API key management
├── components/           # UI components (script, voiceover, visual-plan, prompts, settings)
├── lib/
│   ├── config/           # Environment & settings resolution
│   ├── llm/              # LLM providers (Claude, OpenAI)
│   ├── repositories/     # Supabase data access
│   └── services/         # AI generators (concepts, scripts, visual plans, prompts, VO)
└── types/                # TypeScript domain types
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
