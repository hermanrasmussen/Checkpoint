# Checkpoint

A personal game library tracker inspired by Letterboxd. Search games, add them to your library, track play status, and rate them. Clean, modern UI with retro gaming touches.

## Live Demo

> TODO: Add your deployed URL here (for example: `https://checkpoint-frontend-gold.vercel.app/`).

## Features

- **Game discovery**: Search the RAWG catalog and view rich game detail pages.
- **Personal library**: Add games to your library, track status (backlog/playing/finished), and set ratings.
- **Collections**: Group games into custom collections with cover art.
- **Activity feed**: Optionally share updates to a social-style feed.
- **Profile stats**: See play stats and library breakdowns on your profile.
- **Steam integration**: Connect Steam to import games and achievements (where supported).
- **Responsive UI**: Pixel-inspired layout that works well on laptop/desktop screens.

## Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React + TypeScript + Tailwind CSS (Vite) |
| Backend  | FastAPI (Python)                         |
| Database | PostgreSQL via Supabase                  |
| Auth     | Supabase Auth                            |
| Game API | RAWG                                     |
| Artwork  | SteamGridDB                              |

## Project Structure

```
Checkpoint/
  backend/          # FastAPI app
    api/v1/         # Versioned API routers (games, library, stats)
    integrations/   # RAWG + SteamGridDB clients
    main.py         # App entrypoint
    config.py       # Settings via env vars
    auth.py         # Supabase JWT verification
    db.py           # Async SQLAlchemy engine
    models.py       # ORM models
    schemas.py      # Pydantic request/response schemas
    db_schema.sql   # SQL to create tables in Supabase
  frontend/         # React + Vite SPA
    src/
      components/   # Shared UI components
      context/      # Auth context
      hooks/        # Custom hooks (useDebounce)
      lib/          # Supabase client, API helper
      pages/        # Route pages
```

## Local Setup

### 1. Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL editor and paste the contents of `backend/db_schema.sql`. Run it.
3. In **Project Settings > API**, note:
   - **Project URL** (for the frontend `VITE_SUPABASE_URL`)
   - **anon public key** (for `VITE_SUPABASE_ANON_KEY`)
   - **JWT Secret** (for `SUPABASE_JWT_SECRET` in the backend)
4. In **Settings > Database > Connection string**, copy the **URI** (switch to `postgresql+asyncpg://...` for the backend `DATABASE_URL`).

### 2. RAWG API Key

Sign up at [rawg.io/apidocs](https://rawg.io/apidocs) and get a free API key.

### 2b. SteamGridDB API Key (optional but recommended)

Sign up at [steamgriddb.com](https://www.steamgriddb.com) and grab your API key from **Profile > Preferences > API**. This provides high-quality vertical cover art (grids) and banner images (heroes) for game pages.

### 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create `backend/.env` (see `.env.example`):

```
RAWG_API_KEY=your_key
STEAMGRIDDB_API_KEY=your_key
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your_jwt_secret
```

Run:

```bash
uvicorn backend.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (see `.env.example`):

```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Run:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `localhost:8000`.

## Deployment

See `DEPLOYMENT.md` for step‑by‑step instructions for deploying the backend (Railway/Render) and frontend (Vercel/Netlify), plus the required Supabase configuration.

## API Routes

| Method | Path                       | Auth | Description                     |
| ------ | -------------------------- | ---- | ------------------------------- |
| GET    | `/api/v1/health`           | No   | Health check                    |
| GET    | `/api/v1/games/search?q=`  | Yes  | Search RAWG for games           |
| GET    | `/api/v1/games/{api_id}`   | Yes  | Get game detail (cached)        |
| GET    | `/api/v1/library`          | Yes  | List user's library entries     |
| POST   | `/api/v1/library`          | Yes  | Add game to library             |
| PATCH  | `/api/v1/library/{id}`     | Yes  | Update status/rating            |
| DELETE | `/api/v1/library/{id}`     | Yes  | Remove from library             |
| GET    | `/api/v1/stats`            | Yes  | User stats summary              |
