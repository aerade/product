"""Small same-origin API for accounts, saved practice and leaderboards."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("APP_DB_PATH", str(ROOT / "data" / "typing.db")))
DIST = ROOT / "dist"
COOKIE = "hero_session"
SESSION_DAYS = 30

app = FastAPI(title="Печать героя API", version="0.1.0")


@contextmanager
def database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.on_event("startup")
def initialize() -> None:
    with database() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE COLLATE NOCASE,
              name TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              xp INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
              token_hash TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              expires_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS practice_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              mode TEXT NOT NULL,
              language TEXT NOT NULL,
              difficulty INTEGER NOT NULL,
              elapsed_ms INTEGER NOT NULL,
              correct_chars INTEGER NOT NULL,
              errors INTEGER NOT NULL,
              wpm REAL NOT NULL,
              cpm REAL NOT NULL,
              accuracy REAL NOT NULL,
              points INTEGER NOT NULL,
              xp_earned INTEGER NOT NULL,
              mistake_map TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS achievements (
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              key TEXT NOT NULL,
              unlocked_at TEXT NOT NULL,
              PRIMARY KEY (user_id, key)
            );
            CREATE INDEX IF NOT EXISTS idx_practice_user_date ON practice_sessions(user_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_practice_date ON practice_sessions(created_at);
            """
        )


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "xp": row["xp"], "level": row["xp"] // 250 + 1}


def lookup_user(token: str | None) -> dict | None:
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with database() as db:
        row = db.execute(
            """SELECT u.* FROM auth_sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (token_hash, utc_now()),
        ).fetchone()
    return public_user(row) if row else None


def optional_user(hero_session: Annotated[str | None, Cookie()] = None) -> dict | None:
    return lookup_user(hero_session)


def require_user(user: Annotated[dict | None, Depends(optional_user)]) -> dict:
    if user is None:
        raise HTTPException(401, "Войдите, чтобы сохранить прогресс")
    return user


def set_session(response: Response, user_id: int) -> None:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    with database() as db:
        db.execute(
            "INSERT INTO auth_sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hashlib.sha256(token.encode()).hexdigest(), user_id, expires.isoformat()),
        )
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="lax", max_age=SESSION_DAYS * 86400,
        secure=os.getenv("COOKIE_SECURE") == "1", path="/",
    )


class RegisterBody(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: str
    password: str


class PracticeBody(BaseModel):
    mode: Literal["words", "sentences", "code", "symbols"]
    language: Literal["ru", "en"]
    difficulty: int = Field(ge=1, le=3)
    elapsed_ms: int = Field(ge=500, le=3_600_000)
    correct_chars: int = Field(ge=1, le=20_000)
    errors: int = Field(ge=0, le=20_000)
    points: int = Field(ge=0, le=1_000_000)
    mistake_map: dict[str, int] = Field(default_factory=dict)


@app.get("/api/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterBody, response: Response):
    email = body.email.strip().lower()
    name = body.name.strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(name) < 2:
        raise HTTPException(422, "Укажите корректное имя и email")
    with database() as db:
        try:
            cursor = db.execute(
                "INSERT INTO users(email, name, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (email, name, hash_password(body.password), utc_now()),
            )
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Этот email уже зарегистрирован") from None
    set_session(response, user_id)
    with database() as db:
        return public_user(db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


@app.post("/api/auth/login")
def login(body: LoginBody, response: Response):
    with database() as db:
        row = db.execute("SELECT * FROM users WHERE email = ?", (body.email.strip().lower(),)).fetchone()
    if row is None or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Неверный email или пароль")
    set_session(response, row["id"])
    return public_user(row)


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response, hero_session: Annotated[str | None, Cookie()] = None):
    if hero_session:
        with database() as db:
            db.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (hashlib.sha256(hero_session.encode()).hexdigest(),))
    response.delete_cookie(COOKIE, path="/")


@app.get("/api/auth/me")
def me(user: Annotated[dict | None, Depends(optional_user)]):
    return {"user": user}


ACHIEVEMENTS = {
    "first": "Первый шаг",
    "clean": "Безупречно",
    "speed": "Скоростной набор",
    "streak": "Стальной палец",
    "thousand": "Тысяча символов",
    "regular": "Привычка",
}


def unlock_achievements(db: sqlite3.Connection, user_id: int, body: PracticeBody, cpm: float, accuracy: float) -> list[str]:
    rows = db.execute("SELECT correct_chars, created_at FROM practice_sessions WHERE user_id = ?", (user_id,)).fetchall()
    lifetime = sum(row["correct_chars"] for row in rows)
    days = {row["created_at"][:10] for row in rows}
    candidates = {"first"}
    if body.errors == 0 and body.correct_chars >= 25:
        candidates.add("clean")
    if cpm >= 200 and body.correct_chars >= 25:
        candidates.add("speed")
    if body.errors == 0 and body.correct_chars >= 100:
        candidates.add("streak")
    if lifetime >= 1000:
        candidates.add("thousand")
    if len(days) >= 3:
        candidates.add("regular")
    unlocked = []
    for key in candidates:
        result = db.execute(
            "INSERT OR IGNORE INTO achievements(user_id, key, unlocked_at) VALUES (?, ?, ?)",
            (user_id, key, utc_now()),
        )
        if result.rowcount:
            unlocked.append(key)
    return unlocked


@app.post("/api/practice", status_code=201)
def save_practice(body: PracticeBody, user: Annotated[dict, Depends(require_user)]):
    clean_map = {key[:12]: min(int(value), 1000) for key, value in body.mistake_map.items() if key and int(value) > 0}
    elapsed_minutes = body.elapsed_ms / 60_000
    cpm = round(body.correct_chars / elapsed_minutes, 1)
    if cpm > 1200 or body.points > body.correct_chars * 100:
        raise HTTPException(422, "Показатели тренировки выходят за допустимые пределы")
    wpm = round(cpm / 5, 1)
    accuracy = round(body.correct_chars / (body.correct_chars + body.errors) * 100, 1)
    xp = max(10, round(body.correct_chars * (accuracy / 100) / 3 + body.points / 40))
    with database() as db:
        db.execute(
            """INSERT INTO practice_sessions
               (user_id, mode, language, difficulty, elapsed_ms, correct_chars, errors, wpm, cpm,
                accuracy, points, xp_earned, mistake_map, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user["id"], body.mode, body.language, body.difficulty, body.elapsed_ms,
             body.correct_chars, body.errors, wpm, cpm, accuracy, body.points, xp,
             json.dumps(clean_map, ensure_ascii=False), utc_now()),
        )
        db.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (xp, user["id"]))
        unlocked = unlock_achievements(db, user["id"], body, cpm, accuracy)
        row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return {"xp_earned": xp, "user": public_user(row), "unlocked": unlocked, "wpm": wpm, "cpm": cpm, "accuracy": accuracy}


@app.get("/api/progress")
def progress(user: Annotated[dict, Depends(require_user)]):
    with database() as db:
        rows = db.execute("SELECT * FROM practice_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 60", (user["id"],)).fetchall()
        aggregate = db.execute(
            """SELECT COUNT(*) AS sessions, COALESCE(SUM(elapsed_ms), 0) AS total_ms,
               COALESCE(SUM(correct_chars), 0) AS total_chars, COALESCE(MAX(wpm), 0) AS best_wpm,
               COALESCE(AVG(accuracy), 0) AS avg_accuracy FROM practice_sessions WHERE user_id = ?""",
            (user["id"],),
        ).fetchone()
        earned = db.execute("SELECT key, unlocked_at FROM achievements WHERE user_id = ?", (user["id"],)).fetchall()
    mistakes: dict[str, int] = {}
    for row in rows:
        for char, count in json.loads(row["mistake_map"]).items():
            mistakes[char] = mistakes.get(char, 0) + count
    return {
        "summary": dict(aggregate),
        "sessions": [{key: row[key] for key in ("id", "mode", "language", "difficulty", "wpm", "cpm", "accuracy", "errors", "points", "xp_earned", "created_at")} for row in rows],
        "mistakes": dict(sorted(mistakes.items(), key=lambda item: -item[1])[:8]),
        "achievements": [dict(row) for row in earned],
        "achievement_names": ACHIEVEMENTS,
    }


@app.get("/api/leaderboard")
def leaderboard(metric: Literal["wpm", "accuracy", "xp"] = "wpm", period: Literal["today", "week", "all"] = "week"):
    cutoff = None
    now = datetime.now(timezone.utc)
    if period == "today":
        cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == "week":
        cutoff = (now - timedelta(days=7)).isoformat()
    with database() as db:
        if metric == "xp":
            rows = db.execute(
                """SELECT u.id, u.name, COALESCE(SUM(p.xp_earned), 0) AS value,
                   COUNT(p.id) AS sessions FROM users u JOIN practice_sessions p ON p.user_id = u.id
                   WHERE (? IS NULL OR p.created_at >= ?) GROUP BY u.id ORDER BY value DESC, sessions DESC LIMIT 30""",
                (cutoff, cutoff),
            ).fetchall()
        else:
            operation = "MAX(p.wpm)" if metric == "wpm" else "AVG(p.accuracy)"
            rows = db.execute(
                f"""SELECT u.id, u.name, ROUND({operation}, 1) AS value,
                    COUNT(p.id) AS sessions FROM users u JOIN practice_sessions p ON p.user_id = u.id
                    WHERE p.correct_chars >= 25 AND p.elapsed_ms >= 15000
                    AND (? IS NULL OR p.created_at >= ?) GROUP BY u.id ORDER BY value DESC, sessions DESC LIMIT 30""",
                (cutoff, cutoff),
            ).fetchall()
    return {"metric": metric, "period": period, "rows": [dict(row) for row in rows]}


@app.get("/{full_path:path}", include_in_schema=False)
def frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(404)
    requested = (DIST / full_path).resolve()
    if DIST.exists() and requested.is_relative_to(DIST.resolve()) and requested.is_file():
        return FileResponse(requested)
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(404, "Сначала соберите интерфейс: npm run build")
