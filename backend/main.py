import numpy as np
import json
import os
import requests
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from pydantic import BaseModel
from passlib.context import CryptContext
from transformers import pipeline
from sklearn.metrics.pairwise import cosine_similarity
import bcrypt
import lyricsgenius
import re
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = f"postgresql://postgres:{os.getenv('DB_PASSWORD')}@localhost:5432/music_app"
HISTORY_FILE = "history.json"

EMOTIONS_ORDER = [
    "admiration", "amusement", "anger", "annoyance", "approval",
    "caring", "confusion", "curiosity", "desire", "disappointment",
    "disapproval", "disgust", "embarrassment", "excitement",
    "fear", "gratitude", "grief", "joy", "love", "nervousness",
    "optimism", "pride", "realization", "relief",
    "remorse", "sadness", "surprise", "neutral"
]
MOOD_GROUPS = {

    "romantic": [
        "love", "admiration", "caring", "desire", "gratitude"
    ],

    "melancholic": [
        "sadness", "grief", "remorse", "disappointment",
        "nervousness", "embarrassment"
    ],

    "happy": [
        "joy", "amusement", "optimism", "approval"
    ],

    "energetic": [
        "excitement", "surprise", "pride"
    ],

    "dark": [
        "anger", "fear", "disgust", "annoyance", "disapproval"
    ],

    "calm": [
        "relief", "neutral"
    ],

    "deep": [
        "realization", "curiosity", "confusion"
    ]
}

MUSIC_MOOD_ORDER = list(MOOD_GROUPS.keys())

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

GENIUS_ACCESS_TOKEN = os.getenv("GENIUS_API_KEY")
genius = lyricsgenius.Genius(GENIUS_ACCESS_TOKEN)
genius.verbose = False
genius.remove_section_headers = True

classifier = pipeline(
    "text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=None
)

def clean_youtube_title(title):
    title = re.sub(r"\(.*?\)|\[.*?\]", "", title)
    junk = ["official video", "music video", "lyrics", "hd", "4k", "remastered", "topic"]
    for word in junk:
        title = re.sub(word, "", title, flags=re.IGNORECASE)
    return title.strip()

def fetch_lyrics(title, artist):
    try:
        clean_artist = artist.replace("- Topic", "").strip()
        clean_title = clean_youtube_title(title)
        song = genius.search_song(clean_title, clean_artist)

        if song:
            found_art = song.artist.lower()
            target_art = clean_artist.lower()

            if target_art in found_art or found_art in target_art:
                return song.lyrics[:1500]

    except Exception as e:
        print(f"Genius Error: {e}")

    return ""

def normalize_scores(score_dict):
    total = sum(score_dict.values())
    if total == 0:
        return score_dict
    return {k: round(v / total, 4) for k, v in score_dict.items()}

def analyze_mood(text):
    noise_patterns = [
        r"\bha(ha)+\b",
        r"\bla(la)+\b",
        r"\bye(ah)+\b",
        r"\bo(h)+\b",
        r"\bna(na)+\b"
    ]

    clean_text = text.lower()

    for pattern in noise_patterns:
        clean_text = re.sub(pattern, "", clean_text, flags=re.IGNORECASE)

    clean_text = clean_text[:1500]

    raw_results = classifier(clean_text)
    results = raw_results[0] if isinstance(raw_results[0], list) else raw_results

    emotion_dict = {emo: 0.0 for emo in EMOTIONS_ORDER}

    for r in results:
        label = r["label"]
        score = float(r["score"])
        if label in emotion_dict:
            emotion_dict[label] = score

    total = sum(emotion_dict.values())
    if total > 0:
        emotion_dict = {k: v / total for k, v in emotion_dict.items()}

    return emotion_dict

def map_to_music_moods(emotion_scores):
    music_moods = {}

    for mood, emotion_list in MOOD_GROUPS.items():
        score = sum(emotion_scores.get(e, 0.0) for e in emotion_list)
        music_moods[mood] = score

    return normalize_scores(music_moods)

def get_vector(mood_dict):
    return np.array(
        [mood_dict.get(mood, 0.0) for mood in MUSIC_MOOD_ORDER]
    ).reshape(1, -1)

def save_history(entry):
    history = []

    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)
        except:
            history = []

    history.insert(0, entry)

    history = history[:3]

    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=4)

class UserAuth(BaseModel):
    username: str
    password: str

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)

class Song(Base):
    __tablename__ = "songs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    artist = Column(String)
    url = Column(String)
    mood = Column(JSONB)

Base.metadata.create_all(bind=engine)

def hash_password(password: str):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str):
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/recommend")
def recommend(data: dict, db: Session = Depends(get_db)):
    text = data.get("text")

    emotion_scores = analyze_mood(text)
    user_mood = map_to_music_moods(emotion_scores)
    user_vec = get_vector(user_mood)

    songs = db.query(Song).all()
    if len(songs) < 3:
        raise HTTPException(status_code=400, detail="Add at least 3 songs first!")

    results = []

    for s in songs:
        score = cosine_similarity(user_vec, get_vector(s.mood))[0][0]
        results.append({
            "id": s.id,
            "title": s.title,
            "artist": s.artist,
            "url": s.url,
            "score": round(float(score) * 100, 2),
            "mood": s.mood
        })

    top_3 = sorted(results, key=lambda x: x["score"], reverse=True)[:3]
    save_history({
        "text": text,
        "user_mood": user_mood,
        "recommendations": [
            {"title": s["title"], "score": s["score"]}
            for s in top_3
        ]
    })
    return {
        "user_mood": user_mood,
        "recommendations": top_3
    }

@app.post("/add-song-by-url")
def add_song_url(data: dict, db: Session = Depends(get_db)):
    url = data.get("url")
    user_id = data.get("user_id")

    title, artist = fetch_youtube_metadata(url)
    title = clean_youtube_title(title)
    artist = artist.replace("- Topic", "").strip()

    lyrics = fetch_lyrics(title, artist)
    text_to_analyze = lyrics if lyrics else f"{title} {artist}"
    
    emotion_scores = analyze_mood(text_to_analyze)
    print(f"Emotion scores for '{title}': {emotion_scores}")
    mood = map_to_music_moods(emotion_scores)
    print(f"Mapped music mood for '{title}': {mood}")

    new_song = Song(
        title=title,
        artist=artist,
        url=url,
        user_id=user_id,
        mood=mood
    )

    db.add(new_song)
    db.commit()
    db.refresh(new_song)

    return new_song

@app.get("/history")
def get_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f: return json.load(f)
    return []

@app.get("/my-songs/{user_id}")
def my_songs(user_id: int, db: Session = Depends(get_db)):
    return db.query(Song).filter(Song.user_id == user_id).all()

@app.post("/signup")
def signup(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=user.username,
        password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()

    return {"message": "Account created successfully!"}

@app.post("/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"username": db_user.username, "id": db_user.id}

@app.delete("/delete-song/{song_id}")
def delete_song(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    db.delete(song)
    db.commit()

    return {"message": "Song deleted successfully"}

def fetch_youtube_metadata(url):
    try:
        api_url = f"https://www.youtube.com/oembed?url={url}&format=json"
        response = requests.get(api_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get("title", "Unknown Title"), data.get("author_name", "YouTube Artist")
    except:
        pass

    return "New Song", "Unknown Artist"