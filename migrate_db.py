# -*- coding: utf-8 -*-
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'database.db')

try:
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 检查 user_id 列是否存在
    cursor.execute("PRAGMA table_info(password_entries)")
    columns = [column[1] for column in cursor.fetchall()]

    if 'user_id' not in columns:
        print("Adding user_id column...")
        # 添加 user_id 列，默认值为 1（关联到第一个用户）
        cursor.execute("ALTER TABLE password_entries ADD COLUMN user_id INTEGER DEFAULT 1")
        print("[OK] user_id column added")
    else:
        print("[OK] user_id column already exists")

    # 检查 users 表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print("Creating users table...")
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] users table created")

    conn.commit()
    conn.close()
    print("[OK] Database migration completed!")

except Exception as e:
    print(f"[ERROR] Migration failed: {e}")
    if 'conn' in locals():
        conn.close()
