import os
from typing import Optional
from .main import get_db_connection

def is_subscribed(user_id: int) -> bool:
    """Return True if the user has a non‑free subscription plan."""
    conn = get_db_connection()
    if not conn:
        return False
    cur = conn.cursor()
    try:
        cur.execute('SELECT plan FROM users WHERE id = %s', (user_id,))
        row = cur.fetchone()
        return bool(row and row[0] != 'free')
    finally:
        cur.close()
        conn.close()
