import os
import smtplib
import secrets
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import bcrypt
import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
import pypdf
import io
import re
import urllib.parse
import requests

print("[STARTUP] Initializing FastAPI...")
try:
    app = FastAPI(title="Brainexa Auth & Knowledge Service")
    print("[STARTUP] FastAPI initialized.")
except Exception as e:
    print(f"[CRITICAL] FastAPI failed: {e}")
    raise

# CORS configuration (MUST be before mounting)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the generated images directory
image_dir = os.path.join(os.path.dirname(__file__), "generated_images")
if not os.path.exists(image_dir):
    os.makedirs(image_dir)
app.mount("/images", StaticFiles(directory=image_dir), name="images")

# Load environment variables
basedir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(basedir, "..", ".env")
load_dotenv(dotenv_path=env_path, override=True)

print("[STARTUP] Loading KnowledgeEngine...")
try:
    from knowledge_engine import KnowledgeEngine
    engine = KnowledgeEngine()
    print("[STARTUP] KnowledgeEngine loaded.")
except Exception as e:
    print(f"[CRITICAL] KnowledgeEngine failed: {e}")
    import traceback
    print(traceback.format_exc())
    raise

@app.post("/knowledge/search")
async def search_knowledge(topic: str = Body(..., embed=True)):
    results = await engine.search_content(topic)
    return {"success": True, "results": results}

@app.post("/knowledge/direct-answer")
async def direct_answer(topic: str = Body(..., embed=True)):
    data = await engine.get_direct_answer(topic)
    return data

@app.post("/knowledge/content")
async def extract_knowledge(url: str = Body(..., embed=True), topic: str = Body(..., embed=True)):
    data = engine.extract_content(url)
    if not data:
        return {"success": False, "error": "Failed to extract content"}
    
    raw_text = engine.filter_and_rank([data])
    summary = await engine.summarize_content(raw_text, topic)
    return {"success": True, "summary": summary, "data": data}

@app.post("/knowledge/questions")
async def generate_questions(topic: str = Body(..., embed=True), explanation: str = Body(..., embed=True)):
    questions = await engine.generate_questions(topic, explanation)
    return {"success": True, "questions": questions}

@app.post("/knowledge/evaluate")
async def evaluate_answer(
    question: str = Body(..., embed=True), 
    answer: str = Body(..., embed=True), 
    correct_info: str = Body(..., embed=True)
):
    evaluation = await engine.evaluate_answer(question, answer, correct_info)
    return {"success": True, "evaluation": evaluation}

# Helper to check subscription status
def is_subscribed(user_id: str) -> bool:
    conn = get_db_connection()
    if not conn:
        return False
    cur = conn.cursor()
    try:
        cur.execute('SELECT plan FROM users WHERE id = %s::uuid', (user_id,))
        row = cur.fetchone()
        if row and row[0] != 'free':
            return True
        return False
    finally:
        cur.close()
        conn.close()

@app.post("/knowledge/generate-material")
async def generate_material(
    subject: str = Body(..., embed=True),
    topics: list[str] = Body(..., embed=True),
    customInstructions: Optional[str] = Body(None, embed=True),
    performance: str = Body(None, embed=True),
    userId: Optional[str] = Body(None, embed=True)
):
    # Only subscribed users can generate material
    if userId is None or not is_subscribed(userId):
        raise HTTPException(status_code=403, detail="Access denied: subscription required")
    # Determine performance if not supplied and userId provided
    if not performance and userId:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute('SELECT score FROM quiz_results WHERE user_id = %s::uuid', (userId,))
            rows = cur.fetchall()
            quiz_results = [{'score': r[0]} for r in rows]
            cur.close()
            conn.close()
            performance = engine.determine_performance(quiz_results)
        else:
            performance = "Weak"
    # Generate material
    content = await engine.generate_study_material(subject, topics, customInstructions)
    if content and not content.startswith("Error:"):
        try:
            import json
            import re
            # Clean possible markdown code blocks
            clean_json = content.replace("```json", "").replace("```", "").strip()
            
            # Robust JSON Repair logic (already present)
            try:
                material_data = json.loads(clean_json)
            except json.JSONDecodeError:
                def fix_newlines(match):
                    return match.group(0).replace('\n', '\\n')
                repaired_json = re.sub(r'":\s*"([^"]*?)"', fix_newlines, clean_json, flags=re.DOTALL)
                material_data = json.loads(repaired_json)

            # Process Visual Tags
            if "content" in material_data:
                content_str = material_data["content"]
                # Flexible regex to catch variations like ![VISUAL:prompt] or ![VISUAL: prompt]
                visual_tags = re.findall(r'!\[VISUAL:\s*(.*?)\]', content_str)
                
                print(f"DEBUG: Found {len(visual_tags)} visual tags in content.")
                
                for prompt in visual_tags:
                    print(f"DEBUG: Generating image for prompt: {prompt}")
                    # Generate the image
                    filename = await engine.generate_image(prompt)
                    if filename:
                        # Convert to Base64 to bypass all port/CORS issues
                        b64_data = engine.get_image_base64(filename)
                        if b64_data:
                            image_url = f"data:image/png;base64,{b64_data}"
                            content_str = content_str.replace(f"![VISUAL: {prompt}]", f"![{prompt}]({image_url})")
                            content_str = content_str.replace(f"![VISUAL:{prompt}]", f"![{prompt}]({image_url})")
                            print(f"DEBUG: Image embedded as Base64.")
                    else:
                        print(f"DEBUG: Image generation failed for: {prompt}. Falling back to Unsplash.")
                        # Fallback to a high-quality educational image from Unsplash
                        fallback_url = f"https://source.unsplash.com/featured/?{urllib.parse.quote(prompt)},education"
                        content_str = content_str.replace(f"![VISUAL: {prompt}]", f"![{prompt}]({fallback_url})")
                        content_str = content_str.replace(f"![VISUAL:{prompt}]", f"![{prompt}]({fallback_url})")
                
                material_data["content"] = content_str

            return {"success": True, "material": material_data, "performance": performance}
        except Exception as e:
            print(f"JSON Parse Error: {e}")
            return {"success": True, "content": content, "performance": performance}
    return {"success": False, "error": content, "performance": performance if performance else None}

# ... existing routes ...

# New endpoint: Get performance status for a user
@app.post("/knowledge/performance")
async def get_performance(
    userId: str = Body(..., embed=True)
):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    cur = conn.cursor()
    try:
        cur.execute('SELECT score FROM quiz_results WHERE user_id = %s::uuid', (userId,))
        rows = cur.fetchall()
        quiz_results = [{'score': r[0]} for r in rows]
        performance = engine.determine_performance(quiz_results)
        return {"success": True, "performance": performance}
    finally:
        cur.close()
        conn.close()


# Database Connection
def get_db_connection():
    try:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            return psycopg2.connect(db_url, sslmode='require')
            
        conn = psycopg2.connect(
            user=os.getenv("PGUSER", "postgres"),
            password=os.getenv("PGPASSWORD", "123456789"),
            host=os.getenv("PGHOST", "localhost"),
            port=os.getenv("PGPORT", "5432"),
            database=os.getenv("PGDATABASE", "brainexa")
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerificationOTPRequest(BaseModel):
    email: EmailStr
    otp: str

# Email service
def send_reset_email(to_email: str, token: str):
    sender_email = os.getenv("EMAIL_USER", "brainexa.ai.support@gmail.com")
    password = os.getenv("EMAIL_PASS", "").replace(' ', '')
    if not password:
        print("ERROR: EMAIL_PASS environment variable is missing.")
        return False
    smtp_server = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("EMAIL_PORT", 587))

    subject = "Reset Your Brainexa Password"
    # Frontend URL (standard port 8080/3000 depends on user env, but the prompt said 3000)
    reset_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:8080')}/reset-password?token={token}"

    body = f"""Hello,

You requested to reset your Brainexa account password.

Click the link below to reset your password:

{reset_link}

This link will expire in 15 minutes.

If you did not request this request, please ignore this email.

– Brainexa Team
"""

    msg = MIMEMultipart()
    msg['From'] = f"Brainexa AI Mentor <{sender_email}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        try:
            server.login(sender_email, password)
        except smtplib.SMTPAuthenticationError:
            print("ERROR: SMTP Authentication Error: Username and Password not accepted.")
            print("TIP: If using Gmail, you likely need a 'Google App Password' instead of your regular password.")
            return "AUTH_FAILED"
        
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"ERROR: Email sending error: {e}")
        return False

@app.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cur = conn.cursor()
    try:
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE email = %s", (req.email,))
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate token and expiry
        token = secrets.token_urlsafe(32)
        expiry = datetime.now() + timedelta(minutes=15)
        
        # Store in DB
        cur.execute(
            "UPDATE users SET reset_token = %s, token_expiry = %s WHERE email = %s",
            (token, expiry, req.email)
        )
        conn.commit()
        
        # Send email
        result = send_reset_email(req.email, token)
        if result == True:
            return {"message": "Reset link sent to email"}
        elif result == "AUTH_FAILED":
            raise HTTPException(
                status_code=500, 
                detail="SMTP Authentication failed. Please use a Google App Password if using Gmail."
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to send email. Check server logs.")
            
    finally:
        cur.close()
        conn.close()

@app.post("/send-verification-otp")
async def send_verification_otp(req: VerificationOTPRequest):
    sender_email = os.getenv("EMAIL_USER", "brainexa.ai.support@gmail.com")
    password = os.getenv("EMAIL_PASS", "").replace(' ', '')
    if not password:
        raise HTTPException(status_code=500, detail="EMAIL_PASS environment variable is missing")
    smtp_server = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("EMAIL_PORT", 587))

    subject = "Verify Your Brainexa Account"
    body = f"""Hello,

Your verification code for Brainexa is:

{req.otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

– Brainexa Team
"""

    msg = MIMEMultipart()
    msg['From'] = f"Brainexa AI Mentor <{sender_email}>"
    msg['To'] = req.email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            
        try:
            server.login(sender_email, password)
        except smtplib.SMTPAuthenticationError:
            raise HTTPException(status_code=500, detail="SMTP Authentication failed. Check your App Password.")
        
        server.send_message(msg)
        server.quit()
        return {"message": "Verification code sent"}
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(f"ERROR: Verification email error: {e}\n{trace}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cur = conn.cursor()
    try:
        # Validate token and expiry
        cur.execute(
            "SELECT id, token_expiry FROM users WHERE reset_token = %s",
            (req.token,)
        )
        user = cur.fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid token")
        
        expiry = user[1]
        if datetime.now() > expiry:
            raise HTTPException(status_code=400, detail="Token has expired")
        
        # Hash new password
        # Note: bcrypt expects bytes
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(req.new_password.encode('utf-8'), salt).decode('utf-8')
        
        # Update user
        cur.execute(
            "UPDATE users SET password = %s, reset_token = NULL, token_expiry = NULL WHERE id = %s",
            (hashed_pw, user[0])
        )
        conn.commit()
        
        return {"message": "Password updated successfully"}
            
    finally:
        cur.close()
        conn.close()

@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        reader = pypdf.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return {"success": True, "text": text}
    except Exception as e:
        print(f"ERROR: PDF extraction error: {e}")
        return {"success": False, "error": str(e)}


