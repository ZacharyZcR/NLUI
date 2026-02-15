"""Kelper 测试用 Demo API — 用户管理 + SQLite3 + Session Auth"""

import hashlib
import secrets
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import Cookie, FastAPI, HTTPException, Response
from pydantic import BaseModel

DB_PATH = Path(__file__).parent / "demo.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT NOT NULL,
            email    TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            age      INTEGER,
            role     TEXT DEFAULT 'user'
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    # 预置几条测试数据（密码都是 "password123"）
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        pw = hash_password("password123")
        conn.executemany(
            "INSERT INTO users (name, email, password, age, role) VALUES (?, ?, ?, ?, ?)",
            [
                ("张三", "zhangsan@example.com", pw, 28, "admin"),
                ("李四", "lisi@example.com", pw, 32, "user"),
                ("王五", "wangwu@example.com", pw, 25, "user"),
            ],
        )
        conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Demo User API",
    description="Kelper 测试用的用户管理 API",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------- auth helpers ----------


def get_current_user(session_token: str | None) -> dict | None:
    """从 session token 获取当前用户，token 过期返回 None"""
    if not session_token:
        return None
    conn = get_db()
    row = conn.execute(
        """
        SELECT u.* FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ?
        """,
        (session_token, datetime.utcnow().isoformat()),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def require_auth(session_token: str | None) -> dict:
    """要求认证，否则抛出 401"""
    user = get_current_user(session_token)
    if not user:
        raise HTTPException(401, "Unauthorized: please login first")
    return user


# ---------- schemas ----------


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: int | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    age: int | None = None
    role: str = "user"


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    age: int | None = None
    role: str | None = None


# ---------- auth routes ----------


@app.post("/auth/register", operation_id="register", summary="注册新账号", status_code=201)
def register(body: RegisterRequest):
    """注册新用户，返回用户信息（不自动登录）"""
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO users (name, email, password, age, role) VALUES (?, ?, ?, ?, 'user')",
            (body.name, body.email, hash_password(body.password), body.age),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(409, "Email already exists")
    user_id = cur.lastrowid
    row = conn.execute("SELECT id, name, email, age, role FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)


@app.post("/auth/login", operation_id="login", summary="登录（返回 session cookie）")
def login(body: LoginRequest, response: Response):
    """验证邮箱密码，设置 session cookie（30天有效）"""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        (body.email, hash_password(body.password)),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(401, "Invalid email or password")

    user = dict(row)
    # 生成 session token
    token = secrets.token_urlsafe(32)
    created = datetime.utcnow()
    expires = created + timedelta(days=30)
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user["id"], created.isoformat(), expires.isoformat()),
    )
    conn.commit()
    conn.close()

    # 设置 cookie（httponly, 30天）
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=30 * 24 * 3600,
        httponly=True,
        samesite="lax",
    )
    return {"user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}


@app.post("/auth/logout", operation_id="logout", summary="登出（清除 session）")
def logout(response: Response, session_token: str | None = Cookie(default=None)):
    """删除当前 session，清除 cookie"""
    if session_token:
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE token = ?", (session_token,))
        conn.commit()
        conn.close()
    response.delete_cookie("session_token")
    return {"message": "Logged out"}


@app.get("/auth/me", operation_id="get_current_user", summary="获取当前登录用户")
def get_me(session_token: str | None = Cookie(default=None)):
    """需要认证，返回当前用户信息"""
    user = require_auth(session_token)
    return {"id": user["id"], "name": user["name"], "email": user["email"], "age": user["age"], "role": user["role"]}


# ---------- user routes ----------


@app.get("/users", operation_id="list_users", summary="列出所有用户")
def list_users():
    conn = get_db()
    rows = conn.execute("SELECT * FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/users/{user_id}", operation_id="get_user", summary="根据 ID 获取用户")
def get_user(user_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "user not found")
    return dict(row)


@app.post("/users", operation_id="create_user", summary="创建用户（需要登录）", status_code=201)
def create_user(body: UserCreate, session_token: str | None = Cookie(default=None)):
    require_auth(session_token)  # 需要登录
    conn = get_db()
    # 创建用户时需要 password 字段，这里生成一个默认密码
    default_password = hash_password("changeme123")
    try:
        cur = conn.execute(
            "INSERT INTO users (name, email, password, age, role) VALUES (?, ?, ?, ?, ?)",
            (body.name, body.email, default_password, body.age, body.role),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(409, "email already exists")
    user_id = cur.lastrowid
    row = conn.execute("SELECT id, name, email, age, role FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/users/{user_id}", operation_id="update_user", summary="更新用户信息（需要登录）")
def update_user(user_id: int, body: UserUpdate, session_token: str | None = Cookie(default=None)):
    require_auth(session_token)  # 需要登录
    conn = get_db()
    existing = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "user not found")

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        conn.close()
        user_dict = dict(existing)
        user_dict.pop("password", None)  # 不返回密码字段
        return user_dict

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    conn.execute(
        f"UPDATE users SET {set_clause} WHERE id = ?",
        (*fields.values(), user_id),
    )
    conn.commit()
    row = conn.execute("SELECT id, name, email, age, role FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/users/{user_id}", operation_id="delete_user", summary="删除用户（需要登录）")
def delete_user(user_id: int, session_token: str | None = Cookie(default=None)):
    require_auth(session_token)  # 需要登录
    conn = get_db()
    cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "user not found")
    return {"deleted": user_id}


@app.get("/users/search/{keyword}", operation_id="search_users", summary="按名字搜索用户")
def search_users(keyword: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM users WHERE name LIKE ?", (f"%{keyword}%",)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/stats", operation_id="get_stats", summary="获取用户统计信息")
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    by_role = conn.execute(
        "SELECT role, COUNT(*) as count FROM users GROUP BY role"
    ).fetchall()
    avg_age = conn.execute("SELECT AVG(age) FROM users WHERE age IS NOT NULL").fetchone()[0]
    conn.close()
    return {
        "total_users": total,
        "by_role": {r["role"]: r["count"] for r in by_role},
        "average_age": round(avg_age, 1) if avg_age else None,
    }
