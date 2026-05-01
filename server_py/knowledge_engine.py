import os
import requests
import urllib.parse
from bs4 import BeautifulSoup
import json
import time
import base64
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Ensure we load .env from the root directory
basedir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(basedir, "..", ".env")
load_dotenv(dotenv_path=env_path, override=True)

class KnowledgeEngine:
    def __init__(self):
        self.serp_api_key = os.getenv("SERP_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
        self.grok_api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY")
        self.hf_api_key = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_API_KEY")
        self.image_dir = os.path.join(os.path.dirname(__file__), "generated_images")
        if not os.path.exists(self.image_dir):
            os.makedirs(self.image_dir)

    async def generate_image(self, prompt: str) -> Optional[str]:
        """Generates an image using Hugging Face and returns the filename."""
        if not self.hf_api_key:
            return None
            
        API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
        headers = {"Authorization": f"Bearer {self.hf_api_key}"}
        
        try:
            payload = {"inputs": f"Educational illustration: {prompt}, detailed, high quality, 4k"}
            response = requests.post(API_URL, headers=headers, json=payload, timeout=40)
            
            if response.status_code == 200:
                filename = f"img_{int(time.time())}.png"
                filepath = os.path.join(self.image_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(response.content)
                return filename
            else:
                print(f"HF Image Generation Failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Image Generation Error: {e}")
            return None

    def get_image_base64(self, filename: str) -> Optional[str]:
        """Reads a generated image and returns it as a base64 string."""
        filepath = os.path.join(self.image_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')
        return None

    # ──────────────────────────────────────────────
    # Module 1: Search + Retrieval
    # ──────────────────────────────────────────────
    async def optimize_search_query(self, student_request: str) -> str:
        """Use AI to turn a natural language request into a keyword-rich search query."""
        prompt = f"""
Convert the following student request into a single, optimized search engine query that will find the most accurate educational content.
Focus on keywords, concepts, and technical terms. Do not use quotes or complex operators.

STUDENT REQUEST: "{student_request}"

OUTPUT ONLY THE QUERY STRING.
"""
        optimized = await self.call_ai(prompt)
        if optimized.startswith("Error:"):
            return student_request
        return optimized.strip().strip('"')

    async def search_content(self, topic: str) -> List[Dict[str, str]]:
        """Try SerpAPI first, then fall back to DuckDuckGo (free, no key)."""
        optimized_query = await self.optimize_search_query(topic)
        
        if self.serp_api_key:
            results = self._search_serpapi(optimized_query)
            if results:
                return results

        # Free fallback – always works
        return self._search_duckduckgo(optimized_query)

    def _search_serpapi(self, topic: str) -> List[Dict[str, str]]:
        try:
            from serpapi import GoogleSearch
            query = f"{topic} site:w3schools.com OR site:geeksforgeeks.org OR site:tutorialspoint.com"
            params = {"q": query, "api_key": self.serp_api_key, "num": 5}
            search = GoogleSearch(params)
            results = search.get_dict()
            organic = results.get("organic_results", [])
            return [
                {"title": r.get("title", ""), "link": r.get("link", ""), "snippet": r.get("snippet", "")}
                for r in organic
            ]
        except Exception as e:
            print(f"SerpAPI Error: {e}")
            return []

    def _search_duckduckgo(self, topic: str) -> List[Dict[str, str]]:
        """
        Use DuckDuckGo's HTML search (no API key required).
        Prioritizes educational sites but allows broader results.
        """
        # We search broadly but the AI will help pick the best ones later
        query = urllib.parse.quote(topic)
        url = f"https://html.duckduckgo.com/html/?q={query}"

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            resp = requests.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            results = []
            for item in soup.select(".result")[:6]:
                title_tag = item.select_one(".result__title a")
                snippet_tag = item.select_one(".result__snippet")
                if not title_tag:
                    continue

                title = title_tag.get_text(strip=True)
                href = title_tag.get("href", "")

                # DuckDuckGo wraps redirect URLs – extract the real URL
                if "uddg=" in href:
                    parsed = urllib.parse.urlparse(href)
                    qs = urllib.parse.parse_qs(parsed.query)
                    href = qs.get("uddg", [href])[0]
                    href = urllib.parse.unquote(href)

                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ""
                if href and title:
                    results.append({"title": title, "link": href, "snippet": snippet})

            # If DDG returned nothing useful, build AI-generated result cards
            if not results:
                return self._generate_ai_result_cards(topic)

            return results
        except Exception as e:
            print(f"DuckDuckGo search error: {e}")
            return self._generate_ai_result_cards(topic)

    def _generate_ai_result_cards(self, topic: str) -> List[Dict[str, str]]:
        """
        Last-resort fallback: return curated static links for the topic
        so the UI always shows SOMETHING meaningful.
        """
        encoded = urllib.parse.quote(topic)
        return [
            {
                "title": f"{topic} – GeeksforGeeks",
                "link": f"https://www.geeksforgeeks.org/?s={encoded}",
                "snippet": f"Comprehensive tutorials and examples on {topic} from GeeksforGeeks.",
            },
            {
                "title": f"{topic} – W3Schools",
                "link": f"https://www.w3schools.com/search/search_result.php?keyword={encoded}",
                "snippet": f"Learn {topic} with easy-to-follow tutorials and interactive examples.",
            },
            {
                "title": f"{topic} – Wikipedia",
                "link": f"https://en.wikipedia.org/wiki/Special:Search?search={encoded}",
                "snippet": f"Encyclopedia article covering the key concepts of {topic}.",
            },
            {
                "title": f"{topic} – Khan Academy",
                "link": f"https://www.khanacademy.org/search?page_search_query={encoded}",
                "snippet": f"Free video lessons and exercises to master {topic}.",
            },
        ]

    # ──────────────────────────────────────────────
    # Module 2: Content Extraction
    # ──────────────────────────────────────────────
    def extract_content(self, url: str) -> Dict[str, any]:
        """Extract readable content from a URL using BeautifulSoup."""
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            }
            response = requests.get(url, headers=headers, timeout=12)
            soup = BeautifulSoup(response.content, "html.parser")

            content: Dict = {"headings": [], "paragraphs": [], "code_snippets": [], "images": []}

            for h in soup.find_all(["h1", "h2", "h3"]):
                content["headings"].append(h.get_text(strip=True))

            main_content = (
                soup.find("main")
                or soup.find("article")
                or soup.find("div", class_="content")
                or soup.find("div", class_="entry-content")
                or soup.find("div", id="content")
                or soup.find("div", class_="post-content")
                or soup.body
            )

            if main_content:
                for p in main_content.find_all("p", recursive=True):
                    text = p.get_text(strip=True)
                    if len(text) > 50:
                        content["paragraphs"].append(text)

                for pre in main_content.find_all(["pre", "code"]):
                    content["code_snippets"].append(pre.get_text())

                for img in main_content.find_all("img"):
                    src = img.get("src")
                    if src and (src.startswith("http") or src.startswith("//")):
                        content["images"].append(src)

            return content
        except Exception as e:
            print(f"Extraction Error for {url}: {e}")
            return None

    # ──────────────────────────────────────────────
    # Module 2.5: Direct Answer Flow
    # ──────────────────────────────────────────────
    async def get_direct_answer(self, topic: str) -> Dict:
        """One-shot flow: search, extract top results, and summarize."""
        print(f"Generating Direct Answer for: {topic}")
        
        # 1. Search
        results = await self.search_content(topic)
        if not results:
            return {"success": False, "error": "No search results found."}
        
        # 2. Pick top 3 results for extraction
        top_results = results[:3]
        extracted_contents = []
        
        for res in top_results:
            print(f"Extracting: {res['link']}")
            data = self.extract_content(res['link'])
            if data:
                extracted_contents.append(data)
        
        if not extracted_contents:
            # Fall back to just snippets if full extraction failed
            raw_text = "\n".join([f"{r['title']}: {r['snippet']}" for r in top_results])
        else:
            raw_text = self.filter_and_rank(extracted_contents)
            
        # 3. Summarize with focus on student request
        summary = await self.summarize_content(raw_text, topic)
        
        return {
            "success": True, 
            "summary": summary, 
            "sources": [{"title": r['title'], "link": r['link']} for r in top_results]
        }

    # ──────────────────────────────────────────────
    # Module 3: Content Filtering
    # ──────────────────────────────────────────────
    def filter_and_rank(self, contents: List[Dict]) -> str:
        if not contents:
            return ""
        combined_text = ""
        for item in contents:
            if not item:
                continue
            combined_text += "\n".join(item["headings"]) + "\n"
            combined_text += "\n".join(item["paragraphs"][:10]) + "\n"
            if item["code_snippets"]:
                combined_text += "Code Examples:\n" + "\n".join(item["code_snippets"][:2]) + "\n"
        return combined_text

    # ──────────────────────────────────────────────
    # Module 4: AI call helper
    # ──────────────────────────────────────────────
    async def call_ai(self, prompt: str) -> str:
        # 1. Try Groq (Llama 3.3 70B) - Fastest and very capable
        if self.grok_api_key:
            headers = {
                "Authorization": f"Bearer {self.grok_api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
            }
            try:
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    print(f"Groq API Error: {response.status_code}")
            except Exception as e:
                print(f"Groq Exception: {e}")

        # 2. Try Gemini 1.5 Flash - Highly reliable and smart
        if self.gemini_api_key:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
            )
            payload = {"contents": [{"parts": [{"text": prompt}]}]}
            try:
                response = requests.post(url, json=payload, timeout=30)
                data = response.json()
                if response.status_code == 200:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    print(f"Gemini API Error: {response.status_code}")
            except Exception as e:
                print(f"Gemini Exception: {e}")

        if self.hf_api_key:
            headers = {"Authorization": f"Bearer {self.hf_api_key}"}
            hf_prompt = prompt.strip()
            payload = {
                "inputs": hf_prompt,
                "parameters": {
                    "max_new_tokens": 1024,
                    "temperature": 0.6,
                    "top_p": 0.9,
                    "repetition_penalty": 1.1,
                    "return_full_text": False,
                },
                "options": {
                    "wait_for_model": True,
                    "use_cache": True,
                },
            }
            try:
                response = requests.post(
                    f"https://router.huggingface.co/hf-inference/models/{self.hf_model}",
                    headers=headers,
                    json=payload,
                    timeout=60,
                )
                data = response.json()
                if isinstance(data, dict):
                    if "error" in data:
                        return f"Error: {data['error']}"
                    if "generated_text" in data:
                        return data["generated_text"]
                if isinstance(data, list) and data:
                    return data[0].get("generated_text", "")
            except Exception as e:
                print(f"Hugging Face Error: {e}")

        return "Error: No AI API keys configured or service unavailable."

    # ──────────────────────────────────────────────
    # Module 4: AI Summarisation
    # ──────────────────────────────────────────────
    async def summarize_content(self, raw_content: str, topic: str) -> str:
        prompt = f"""
You are the Brainexa AI Knowledge Engine, a world-class analytical Study Mentor. 
A student is deeply exploring the topic: "{topic}"

Your goal is to provide a "Superful" (extremely detailed, insightful, and authoritative) explanation based on the retrieved educational content provided below. 

GUIDELINES for a "Superful" Response:
1. **Analytical Depth**: Do not just summarize. Analyze the "why" and "how". Break down complex mechanisms.
2. **Interlinking**: Connect this topic to related concepts. How does it fit into the broader subject?
3. **Multi-dimensional Breakdown**: 
   - **Foundational Concept**: Define it clearly.
   - **Core Mechanisms**: Explain the process step-by-step.
   - **Analogies**: Use a powerful, relatable analogy to make it stick.
   - **Real-world Application**: Why does this matter in the real world?
4. **Scaffolding**: If there are prerequisite concepts mentioned, briefly explain them.
5. **Interactive Element**: End with a "Self-Check Question" for the student.

FORMATTING:
- Use clear headers (###) and bolding (**).
- Use bullet points for readability.
- Keep the tone supportive yet academically rigorous.

RETRIEVED CONTENT:
{raw_content[:9000]}

Provide the most accurate and high-precision response possible:
"""
        return await self.call_ai(prompt)

    # ──────────────────────────────────────────────
    # Module 5: Active Learning Questions
    # ──────────────────────────────────────────────
    async def generate_questions(self, topic: str, explanation: str) -> List[Dict]:
        prompt = f"""
Generate 3-5 conceptual questions based on the topic "{topic}" and the explanation below to test understanding.
Include a mix of MCQ and conceptual short answers.

EXPLANATION:
{explanation}

Return ONLY a JSON array with the following structure:
[
    {{
        "type": "mcq",
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "...",
        "explanation": "..."
    }},
    {{
        "type": "short_answer",
        "question": "...",
        "correct_info": "...",
        "explanation": "..."
    }}
]
"""
        response = await self.call_ai(prompt)
        try:
            clean_res = response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_res)
        except Exception:
            return []

    # ──────────────────────────────────────────────
    # Module 6: Answer Evaluation
    # ──────────────────────────────────────────────
    async def evaluate_answer(self, question: str, student_answer: str, correct_info: str) -> Dict:
        prompt = f"""
Evaluate the student's answer based on correctness, clarity, and understanding.

Question: {question}
Student Answer: {student_answer}
Correct Information/Reference: {correct_info}

Return ONLY a JSON object:
{{
    "score": 0-100,
    "feedback": "...",
    "correct": true/false
}}
"""
        response = await self.call_ai(prompt)
        try:
            clean_res = response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_res)
        except Exception:
            return {"score": 0, "feedback": "Evaluation error", "correct": False}

    # ──────────────────────────────────────────────
    # Module 7: Study Material Generation
    # ──────────────────────────────────────────────
    def determine_performance(self, quiz_results: List[Dict]) -> str:
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

    async def generate_study_material(self, subject: str, topics: List[str], custom_instructions: Optional[str] = None) -> str:
        topics_str = ", ".join(topics)
        custom_block = f"\n========================\nCUSTOM STUDENT REQUIREMENTS\n========================\n{custom_instructions}\n" if custom_instructions else ""
        
        prompt = f"""
You are an expert academic content generator and structured output system.
Your job is to generate high-quality study material AND structured metadata for saving in history.
{custom_block}

========================
OUTPUT FORMAT (STRICT JSON)
========================
Return output ONLY in this JSON format. IMPORTANT: All strings must be valid JSON strings. Newlines inside "content", "preview" or "quick_revision" MUST be escaped as \\n.

{{
  "topic_name": "{topics_str}",
  "subject": "{subject}",
  "difficulty_level": "beginner",
  "created_at": "{self._get_current_date()}",
  "preview": "A short summary...",
  "index": [
    {{ "section": "1. Introduction", "subsections": ["1.1 Definition", "1.2 Importance"] }}
  ],
  "content": "Full markdown content...",
  "exam_questions": ["Q1", "Q2", "Q3", "Q4", "Q5"],
  "short_answers": ["A1", "A2", "A3"],
  "quick_revision": "Crisp summary..."
}}

========================
CONTENT RULES
========================
1. Language:
- Use very simple English (easy for Indian students)
- Avoid complex words
- Explain like teaching a beginner

2. Structure (inside "content"):
For each topic include:
A. Definition (2–3 lines)
B. Detailed Explanation
C. Key Points (bullets)
D. Diagram Explanation (describe in words if needed)
E. Example (if applicable)
F. Advantages & Disadvantages (if applicable)
G. Important Exam Points

3. Headings:
- Use clear section headings
- Maintain proper hierarchy (1, 1.1, 1.2 etc.)
- Ensure headings match the index exactly

4. Coverage:
- Cover all subtopics completely
- Maintain logical flow
- Do not skip important concepts

5. Special Handling:
- Algorithms → step-by-step + example
- Concepts → include real-life analogy
- Comparisons → use table format

========================
INDEX RULES
========================
- Generate index dynamically based on content headings
- Include all major sections and subtopics
- Keep numbering clear (1, 1.1, 1.2…)
- Index must match content exactly (no mismatch)
- If student asked for "images" or "visuals" in CUSTOM STUDENT REQUIREMENTS, you MUST include image tags in the "content" section.
- Use this EXACT format for images: ![VISUAL: detailed prompt for image generation]
- Place the image tag immediately after a heading (##) where it is relevant.
- If student asked for "flowcharts" or "diagrams", use Mermaid syntax inside a code block.
- Example: 
```mermaid
graph TD
A[Start] --> B[Process]
B --> C{{Decision}}
C -- Yes --> D[Result]
C -- No --> E[End]
```
- Place visuals at the top of sections to maximize educational impact.

========================
HISTORY + METADATA RULES
========================
- topic_name → exact topic given
- subject → detect from input (e.g., Operating Systems)
- difficulty_level → beginner / medium / advanced
- created_at → {self._get_current_date()}
- preview → 2-line short summary of topic
- content → full study material in Markdown
- exam_questions → generate 5 important questions
- short_answers → generate 3 answers (max 4 lines each)
- quick_revision → crisp summary for last-day revision

========================
STRICT RULES
========================
- MANDATORY: You MUST cover ALL topics provided: {topics_str}
- If multiple topics are provided, ensure the "index" and "content" sections reflect ALL of them individually and in detail.
- Output ONLY JSON (no extra text)
- No unnecessary explanation outside JSON
- Keep content clean, structured, and exam-ready
- Ensure index and content are perfectly aligned

========================
INPUT
========================
Topics to cover: {topics_str}
Subject: {subject}
"""
        return await self.call_ai(prompt)

    def _get_current_date(self) -> str:
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d")

