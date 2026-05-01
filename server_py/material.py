import os
from typing import List, Dict, Optional
from fastapi import Body, HTTPException
from .knowledge_engine import KnowledgeEngine
from .performance_analyzer import determine_performance
from .main import get_db_connection

engine = KnowledgeEngine()

async def generate_material_with_performance(
    subject: str = Body(..., embed=True),
    topics: List[str] = Body(..., embed=True),
    userId: Optional[str] = Body(None, embed=True),
    uploaded_results: Optional[List[Dict]] = Body(None, embed=True)
) -> Dict:
    """Generate study material based on student performance.
    - If `uploaded_results` is provided, use it directly.
    - Otherwise, fetch past quiz scores for `userId` from the DB.
    The performance categories are:
        * "Perfect" / "High"   -> concise, suitable material
        * "Better" / "Medium"  -> medium‑level explanations
        * "Weak"               -> very simple, step‑by‑step material
    """
    # Determine performance
    if uploaded_results is not None:
        quiz_results = uploaded_results
    elif userId is not None:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        cur = conn.cursor()
        cur.execute('SELECT score FROM quiz_results WHERE user_id = %s::uuid', (userId,))
        rows = cur.fetchall()
        quiz_results = [{'score': r[0]} for r in rows]
        cur.close()
        conn.close()
    else:
        quiz_results = []

    performance = determine_performance(quiz_results)

    # Adjust prompt based on performance
    base_prompt = f"""
Act as an expert educator and textbook author.
Create a study guide for the subject \"{subject}\" covering the following topics:
{"\n".join([f"- {t}" for t in topics])}
"""
    if performance in ("Perfect", "High"):
        # Concise material suitable for high performers
        extra = "Provide a concise overview, focusing on key concepts only."
    elif performance == "Better":
        # Medium level explanations
        extra = "Provide clear explanations with examples, suitable for a solid understanding."
    else:  # Weak
        # Very simple, step‑by‑step material
        extra = "Provide very simple, step‑by‑step explanations with plenty of examples and analogies."
    prompt = base_prompt + "\n" + extra

    content = await engine.call_ai(prompt)
    if content.startswith("Error:"):
        return {"success": False, "error": content, "performance": performance}
    return {"success": True, "content": content, "performance": performance}
