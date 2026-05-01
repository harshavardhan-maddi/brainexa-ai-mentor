import os
from typing import List, Dict


def determine_performance(quiz_results: List[Dict]) -> str:
    """Determine performance category based on average quiz score.
    Returns one of: 'Perfect', 'High', 'Better', 'Weak'.
    """
    if not quiz_results:
        return "Weak"
    total = sum(r.get('score', 0) for r in quiz_results)
    avg = total / len(quiz_results)
    if avg >= 90:
        return "Perfect"
    if avg >= 75:
        return "High"
    if avg >= 50:
        return "Better"
    return "Weak"
