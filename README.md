# MusicMood

MusicMood is an AI-powered web app that recommends songs based on a short text describing a user's mood or day. The app combines emotion classification, a small mapping of emotions to music moods, and similarity comparison against a user's saved song library to produce personalized recommendations. Users can sign up, save songs (YouTube links), analyze songs for mood, request recommendations, and play songs in a floating player.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Quick Start](#quick-start)
	- [Backend](#backend)
	- [Frontend](#frontend)
- [API Endpoints](#api-endpoints)
- [Data files](#data-files)
- [Usage / UX flow](#usage--ux-flow)

## Features
- Sign up / Log in (simple username/password)
- Save songs to a user library (YouTube links are analyzed)
- Analyze text input to infer mood and get top-4 matching songs from the user's library
- Play songs in an embedded floating YouTube player
- View recent mood history and song mood details

## Architecture
- Backend: FastAPI application (`backend/main.py`) that runs the mood analysis, stores users and songs in PostgreSQL via SQLAlchemy, and keeps a small `history.json` for quick recent-history access.
- Model: Hugging Face `SamLowe/roberta-base-go_emotions` text-classification pipeline used to extract emotion scores from text/lyrics.
- Lyrics: `lyricsgenius` is used to fetch song lyrics (when available) to analyze song mood.
- Frontend: React + Vite app (`front/`) with routes for Login, Register, Home (mood input + results) and Profile (library + history).

## Requirements
- Python 3.10+ (backend)
- Node.js 18+ / npm (frontend)
- PostgreSQL (local or remote). A database named `music_app` is expected by default.
- A Genius API key (optional but recommended for better song analysis): set `GENIUS_API_KEY` in your environment.

## Environment variables
- `DB_PASSWORD` — password for the `postgres` user used in the connection string. The backend constructs a DB URL like `postgresql://postgres:<DB_PASSWORD>@localhost:5432/music_app`.
- `GENIUS_API_KEY` — optional Genius API token used by `lyricsgenius` to fetch lyrics.

Store these in a `.env` file at the project root (backend loads environment variables using `python-dotenv`). Example `.env`:

```
DB_PASSWORD=your_postgres_password
GENIUS_API_KEY=your_genius_key
```

## Quick Start

### Backend
1. Create and activate a Python virtual environment:

```
python -m venv .venv
# On Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies (example list):

```
pip install fastapi uvicorn sqlalchemy psycopg2-binary passlib[bcrypt] bcrypt transformers torch scikit-learn numpy lyricsgenius python-dotenv requests
```

3. Create a PostgreSQL database named `music_app` and ensure access for `postgres` user with `DB_PASSWORD` set.

4. Run the backend server (from repo root):

```
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Notes:
- The first model load (Hugging Face) will download weights and requires internet and disk space.
- If you don't have PostgreSQL available for quick testing, you can still run the backend but most endpoints will fail when they try to access the DB; consider mocking DB calls for isolated testing.

### Frontend
1. Install frontend dependencies and start dev server:

```
cd front
npm install
npm run dev
```

2. The React app is served by Vite (default port 5173). Open your browser at the URL shown by Vite (usually `http://localhost:5173`).

## API Endpoints
All backend endpoints are defined in `backend/main.py`. Main endpoints used by the frontend:

- `POST /signup` — body `{ username, password }` → creates a user (returns success message)
- `POST /login` — body `{ username, password }` → returns `{ username, id }` on success; the frontend stores `userId` and `username` in `localStorage`.
- `POST /recommend` — body `{ text, user_id }` → analyzes `text` and returns `{ user_mood, recommendations }`. Requires the user to have at least 4 saved songs.
- `POST /add-song-by-url` — body `{ url, user_id }` → fetches YouTube metadata, attempts to fetch lyrics via Genius, analyzes mood, stores song and its mood in DB, returns the saved song.
- `GET /history/{user_id}` — returns the recent `history.json` entries for the user.
- `GET /my-songs/{user_id}` — returns the user's saved songs from the DB.
- `DELETE /delete-song/{song_id}` — removes a saved song.

## Data files
- `backend/history.json` — local JSON file used to store short recent history per user for the UI (keeps up to 3 recent history entries per user).

## Usage / UX flow
1. Start backend and frontend as described above.
2. In the browser create an account (Register) and log in.
3. Open `Profile` to add songs via YouTube link (the backend will try to fetch lyrics to analyze; if lyrics are not found it will use the title+artist text).
4. Add at least 4 songs to your library (the recommendation algorithm requires at least 4 songs to compare against).
5. Go to `Home`, type how you feel, click `Find my mood music` and the app will display the top matches with a match score and mood mini-tags. Click a card to open the floating player.
