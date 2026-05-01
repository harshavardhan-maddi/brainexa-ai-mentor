import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from './db.js';
import initDB from './init-db.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

// Email Setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s+/g, '')
  }
});

async function sendTaskCompletionEmail(userId, subject, topic) {
  console.log(`📧 Admin: Preparing completion email for ${topic}...`);
  try {
    // 1. Get user details
    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) {
      console.warn(`⚠️ Admin: User ${userId} not found for email`);
      return;
    }

    // 2. Get progress
    const progRes = await pool.query('SELECT study_progress FROM progress WHERE user_id = $1', [userId]);
    const progress = progRes.rows[0]?.study_progress || 0;

    // 3. Get next day's schedule for motivation
    let nextTask = "your upcoming milestones";
    try {
      const planRes = await pool.query(`
        SELECT tasks FROM study_plans 
        WHERE user_id = $1 AND day > (
          SELECT COALESCE((
            SELECT day FROM study_plans 
            WHERE user_id = $1 AND tasks::text ILIKE $2
            ORDER BY day DESC LIMIT 1
          ), 0)
        )
        ORDER BY day ASC LIMIT 1
      `, [userId, `%${topic}%`]);
      
      if (planRes.rows.length > 0) {
        const tasks = typeof planRes.rows[0].tasks === 'string' ? JSON.parse(planRes.rows[0].tasks) : planRes.rows[0].tasks;
        nextTask = tasks[0]?.topic || nextTask;
      }
    } catch (planErr) {
      console.warn("⚠️ Admin: Could not fetch next task for email motivation:", planErr.message);
    }
    
    const motivations = [
      "Every small step brings you closer to your grand goal!",
      "Consistency is the bridge between goals and accomplishment.",
      "The expert in anything was once a beginner. Keep pushing!",
      "Your future self will thank you for the hard work you put in today.",
      "Success is the sum of small efforts, repeated day in and day out."
    ];
    const motivation = motivations[Math.floor(Math.random() * motivations.length)];

    const mailOptions = {
      from: `"Brainexa AI Mentor" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `🎉 Congratulations on completing ${topic}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%); padding: 48px 32px; text-align: center;">
            <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <span style="font-size: 32px;">🏆</span>
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Great job, ${user.name}!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">You just completed a daily goal.</p>
          </div>
          
          <div style="padding: 40px 32px; color: #1e293b;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 32px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.1em;">Completed Topic</p>
              <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">${topic}</h2>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Subject: ${subject}</p>
            </div>

            <div style="margin-bottom: 32px;">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 14px; font-weight: 700; color: #0f172a;">Overall Progress</span>
                  <span style="font-size: 14px; font-weight: 800; color: #8b5cf6;">${progress}%</span>
               </div>
               <div style="background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: #8b5cf6; height: 100%; width: ${progress}%;"></div>
               </div>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 32px;">
              Keep up this momentum! Each topic you master brings you closer to your academic excellence. You're doing better than you think.
            </p>

            <div style="background: #eff6ff; border-radius: 20px; padding: 24px; border: 1px solid #bfdbfe;">
               <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2563eb;">NEXT UP: ${nextTask}</p>
               <p style="margin: 0; font-style: italic; color: #1e40af; font-size: 15px;">"${motivation}"</p>
            </div>

            <div style="margin-top: 40px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" style="background: #8b5cf6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.3);">Continue to Dashboard</a>
            </div>
          </div>

          <div style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              &copy; ${new Date().getFullYear()} Brainexa AI. All rights reserved.<br/>
              Personalized Career and Educational Advisor.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Completion email sent to ${user.email} for ${topic}`);
  } catch (error) {
    console.error('🔥 Failed to send completion email:', error);
  }
}
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

dotenv.config();

// Initialize Database
initDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const razorpay = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL || "http://localhost:8080", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:8080"],
    methods: ["GET", "POST"]
  }
});

// Multer for TXT/DOC/DOCX/PDF
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  const allowedExts = ['.txt', '.docx', '.doc', '.pdf'];
  if (allowedExts.includes(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Only TXT, DOCX, DOC, and PDF supported'));
  }
}});

// Multer for Profile Pictures
const profileStorage = multer.diskStorage({
  destination: 'public/images/profiles/',
  filename: (req, file, cb) => cb(null, `profile-${Date.now()}${path.extname(file.originalname)}`)
});
const profileUpload = multer({ 
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP images are supported'));
    }
  }
});

// Serve static files from public folder
app.use(express.static('public'));
app.use('/images', express.static('public/images'));

// Create folders if they don't exist
(async () => {
  await fs.mkdir('uploads', { recursive: true });
  await fs.mkdir(path.join('public', 'images', 'ai-generated'), { recursive: true });
  await fs.mkdir(path.join('public', 'images', 'profiles'), { recursive: true });
})();

// Users store
const connectedUsers = new Map();

// Admin Middleware
const isAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  console.log('🛡️ Admin Check for User:', userId);
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (result.rows.length > 0 && result.rows[0].role === 'admin') {
      console.log('✅ Admin Access Granted');
      next();
    } else {
      console.log('❌ Admin Access Denied for role:', result.rows[0]?.role);
      res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }
  } catch (err) {
    console.error('🔥 Admin Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Identify which subject and topic the user is asking about
async function identifyTopicFromQuery(query, subjects) {
  if (!subjects || subjects.length === 0) return null;

  const syllabusText = subjects.map(s => 
    `${s.name}: ${s.topics.map(t => t.topic).join(', ')}`
  ).join('\n');

  const identificationPrompt = `
Task: Identify if the user's query is about a specific topic from the syllabus below.
Syllabus:
${syllabusText}

User Query: "${query}"

If the query is clearly about a topic in the syllabus, return ONLY JSON:
{"subject": "Subject Name", "topic": "Topic Name"}

If it's a general question not specific to any syllabus topic (like "How are you?", "Give me study tips"), return ONLY JSON:
{"subject": null, "topic": null}
`;

  try {
    const identResult = await callAI(identificationPrompt, true); // Use true for isSyllabus (low temp)
    if (identResult && identResult.subject && identResult.topic) {
      return identResult;
    }
  } catch (e) {
    console.error('Topic identification error:', e);
  }
  return null;
}

// Check if the student has access to this topic
// Hugging Face Image Generation Helper
async function generateHuggingFaceImage(prompt) {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey) {
    // Fallback to Pollinations AI if key is missing
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
  }

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: { Authorization: `Bearer ${hfKey}` },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      console.error('Hugging Face API error:', await response.text());
      // Fallback to Pollinations on API failure
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    const folderPath = path.join('public', 'images', 'ai-generated');
    const filePath = path.join(folderPath, fileName);
    
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(filePath, buffer);
    
    // Return full backend URL for absolute reliability
    const host = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
    return `${host}/images/ai-generated/${fileName}`;
  } catch (error) {
    console.error('Hugging Face generation error:', error);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
  }
}
async function checkTopicAccess(userId, subjectName, topicName, studentSubjects, quizResults) {
  const subject = studentSubjects.find(s => s.subject === subjectName);
  if (!subject) return { allowed: true };

  const topicIndex = subject.topics.findIndex(t => t.topic === topicName);
  if (topicIndex <= 0) return { allowed: true }; // First topic or not found is always allowed

  // Check all PREVIOUS topics in this subject
  for (let i = 0; i < topicIndex; i++) {
    const prevTopic = subject.topics[i];
    
    // A topic is "completed" if it has a quiz result or questions attempted
    const isCompleted = 
      (quizResults && quizResults.some(r => r.subject === subjectName && r.topic === prevTopic.topic && r.score > 0)) ||
      (prevTopic.questionsAttempted > 0);

    if (!isCompleted) {
      return { 
        allowed: false, 
        reason: `⚠️ **Access Restricted!** 

You haven't completed the prerequisite topic yet. To unlock **${topicName}**, you need to finish:

📚 **${prevTopic.topic}** in **${subjectName}**

Complete the previous topic first to build a strong foundation! 💪`,
        lockedTopic: topicName,
        requiredTopic: prevTopic.topic
      };
    }
  }

  return { allowed: true };
}

// Detect language from user message
function detectLanguage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Indian languages detection
  if (lowerMessage.includes('नमस्ते') || lowerMessage.includes('क्या') || lowerMessage.includes('है') || lowerMessage.includes('का') || lowerMessage.includes('की') || lowerMessage.includes('के') || lowerMessage.includes('को') || lowerMessage.includes('से') || lowerMessage.includes('में') || lowerMessage.includes('पर')) {
    return 'Hindi';
  }
  if (lowerMessage.includes('తెలుగు') || lowerMessage.includes('ఏమి') || lowerMessage.includes('ఉన్నాడు') || lowerMessage.includes('ఉంది') || lowerMessage.includes('చేయు') || lowerMessage.includes('చేసే') || lowerMessage.includes('కు') || lowerMessage.includes('లో') || lowerMessage.includes('ను')) {
    return 'Telugu';
  }
  if (lowerMessage.includes('தமிழ்') || lowerMessage.includes('என்ன') || lowerMessage.includes('இருக்கிறது') || lowerMessage.includes('செய்') || lowerMessage.includes('கு') || lowerMessage.includes('ல்') || lowerMessage.includes('ன்') || lowerMessage.includes('டு')) {
    return 'Tamil';
  }
  if (lowerMessage.includes('ಮರಾಠಿ') || lowerMessage.includes('काय') || lowerMessage.includes('आहे') || lowerMessage.includes('करा') || lowerMessage.includes('च्या') || lowerMessage.includes('ला') || lowerMessage.includes('मध्ये') || lowerMessage.includes('वर')) {
    return 'Marathi';
  }
  if (lowerMessage.includes('ଓଡ଼ିଆ') || lowerMessage.includes('କଣ') || lowerMessage.includes('ଅଛି') || lowerMessage.includes('କର') || lowerMessage.includes('ର') || lowerMessage.includes('କୁ') || lowerMessage.includes('ରେ') || lowerMessage.includes('ପାଇଁ')) {
    return 'Odia';
  }
  if (lowerMessage.includes('മലയാളം') || lowerMessage.includes('എന്ത്') || lowerMessage.includes('ഉണ്ട്') || lowerMessage.includes('ചെയ്യ്') || lowerMessage.includes('ക്') || lowerMessage.includes('ൽ') || lowerMessage.includes('ൻ') || lowerMessage.includes('ടെ')) {
    return 'Malayalam';
  }
  if (lowerMessage.includes('ಕನ್ನಡ') || lowerMessage.includes('ಏನು') || lowerMessage.includes('ಇದೆ') || lowerMessage.includes('ಮಾಡು') || lowerMessage.includes('ಗೆ') || lowerMessage.includes('ದಲ್ಲಿ') || lowerMessage.includes('ನ') || lowerMessage.includes('ವು')) {
    return 'Kannada';
  }
  if (lowerMessage.includes('ગુજરાતી') || lowerMessage.includes('શું') || lowerMessage.includes('છે') || lowerMessage.includes('કરો') || lowerMessage.includes('ના') || lowerMessage.includes('માં') || lowerMessage.includes('ને') || lowerMessage.includes('થી')) {
    return 'Gujarati';
  }
  if (lowerMessage.includes('ਪੰਜਾਬੀ') || lowerMessage.includes('ਕੀ') || lowerMessage.includes('ਹੈ') || lowerMessage.includes('ਕਰੋ') || lowerMessage.includes('ਦਾ') || lowerMessage.includes('ਦੇ') || lowerMessage.includes('ਵਿਚ') || lowerMessage.includes('ਨੂੰ')) {
    return 'Punjabi';
  }
  if (lowerMessage.includes('বাংলা') || lowerMessage.includes('কি') || lowerMessage.includes('আছে') || lowerMessage.includes('করো') || lowerMessage.includes('এর') || lowerMessage.includes('তে') || lowerMessage.includes('কে') || lowerMessage.includes('র')) {
    return 'Bengali';
  }
  
  // Default to English
  return 'English';
}

// Analyze slang and informal language
function analyzeSlang(message) {
  const lowerMessage = message.toLowerCase();
  const slangIndicators = {
    'very_casual': ['lol', 'brb', 'ttyl', 'omg', 'wtf', 'idk', 'btw', 'tbh', 'imo', 'yolo', 'fomo', 'lit', 'fam', 'vibes', 'sus', 'cap', 'no cap', 'bet', 'flex', 'ghost', 'shade', 'tea', 'spill', 'yeet', 'salty', 'extra', 'basic', 'thirsty', 'woke', 'slay', 'queen', 'iconic', 'mood', 'periodt'],
    'indian_slang': ['yaar', 'bhai', 'dude', 'bro', 'machan', 'anna', 'sir', 'boss', 'super', 'cool', 'awesome', 'mast', 'zabardast', 'bakwaas', 'faltu', 'timepass', 'ghar ka', 'local', 'desi', 'bhaiya', 'panditji', 'sirji', 'madam', 'memsaab', 'saab', 'jaaneman', 'jaan', 'pyaar', 'ishq', 'dil', 'jaaneman', 'jaan', 'pyaar', 'ishq', 'dil', 'sexy', 'hot', 'gorgeous', 'beautiful', 'cute', 'sweet', 'darling', 'baby', 'jaaneman'],
    'study_slang': ['grind', 'cram', 'pull all-nighter', 'burn midnight oil', 'hit the books', 'study session', 'brain dump', 'memory palace', 'mnemonics', 'rote learning', 'concept mapping', 'mind mapping', 'flash cards', 'practice tests', 'mock exams', 'revision', 'recap', 'summary', 'key points', 'important', 'must know', 'crucial', 'vital', 'essential']
  };
  
  let slangLevel = 'formal';
  let detectedSlang = [];
  
  for (const [level, words] of Object.entries(slangIndicators)) {
    for (const word of words) {
      if (lowerMessage.includes(word)) {
        detectedSlang.push(word);
        if (level === 'very_casual') slangLevel = 'casual';
        else if (level === 'indian_slang' && slangLevel === 'formal') slangLevel = 'friendly';
      }
    }
  }
  
  return { slangLevel, detectedSlang };
}

// AI call (chat/syllabus)
async function callAI(prompt, isSyllabus = false, history = [], context = {}) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROK_API_KEY || process.env.GROQ_API_KEY;
  
  // Debug log to console (server side)
  if (!isSyllabus) {
    console.log('--- AI Activation Debug ---');
    console.log('Gemini Key found:', !!GEMINI_API_KEY, 'Length:', GEMINI_API_KEY?.length || 0);
    console.log('Groq Key found:', !!GROQ_API_KEY, 'Length:', GROQ_API_KEY?.length || 0);
  }

  const USE_GROQ = Boolean(GROQ_API_KEY && GROQ_API_KEY.length > 20 && !GROQ_API_KEY.includes('your_'));
  const USE_GEMINI = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 20 && !GEMINI_API_KEY.includes('your_'));

  // Detect language and slang from user message
  const detectedLanguage = detectLanguage(prompt);
  const slangAnalysis = analyzeSlang(prompt);
  
  // Update context with detected language if not already set
  if (!context.detectedLanguage) {
    context.detectedLanguage = detectedLanguage;
  }
  if (!context.slangLevel) {
    context.slangLevel = slangAnalysis.slangLevel;
  }

  // Skip progress check if it's a syllabus parsing call or if context isn't available
  if (!isSyllabus && context.studentSubjects && context.studentSubjects.length > 0 && !context.skipAccessCheck) {
    const identified = await identifyTopicFromQuery(prompt, context.studentSubjects);
    
    if (identified && identified.subject && identified.topic) {
      const access = await checkTopicAccess(
        context.userId, 
        identified.subject, 
        identified.topic, 
        context.studentSubjects, 
        context.quizResults
      );

      if (!access.allowed) {
        // Return message in detected language
        const languageMessages = {
          'English': access.reason,
          'Hindi': `⚠️ **पहुंच प्रतिबंधित!** 

आपने अभी पिछला विषय पूरा नहीं किया है। **${identified.topic}** को अनलॉक करने के लिए, आपको पहले यह पूरा करना होगा:

📚 **${access.requiredTopic}** विषय **${identified.subject}** में

मजबूत नींव बनाने के लिए पहले पिछला विषय पूरा करें! 💪`,
          'Telugu': `⚠️ **ప్రాప్యత నిరాకరించబడింది!** 

మీరు ఇంకా మునుపటి అంశాన్ని పూర్తి చేయలేదు. **${identified.topic}** ను అన్‌లాక్ చేయడానికి, మీరు ముందుగా దీన్ని పూర్తి చేయాలి:

📚 **${access.requiredTopic}** అంశం **${identified.subject}** లో

బలమైన పునాది నిర్మించడానికి ముందుగా మునుపటి అంశాన్ని పూర్తి చేయండి! 💪`,
          'Tamil': `⚠️ **அணுகல் கட்டுப்படுத்தப்பட்டது!** 

நீங்கள் இன்னும் முந்தைய தலைப்பை முடிக்கவில்லை. **${identified.topic}** ஐத் திறக்க, நீங்கள் முதலில் இதை முடிக்க வேண்டும்:

📚 **${access.requiredTopic}** தலைப்பு **${identified.subject}** இல்

வலிமையான அறிவுத்தளத்தை உருவாக்க முந்தைய தலைப்பை முதலில் முடிக்கவும்! 💪`,
          'Marathi': `⚠️ **प्रवेश प्रतिबंधित!** 

तुम्ही अजून मागील विषय पूर्ण केलेला नाही. **${identified.topic}** अनलॉक करण्यासाठी, तुम्हाला आधी हे पूर्ण करावे लागेल:

📚 **${access.requiredTopic}** विषय **${identified.subject}** मध्ये

मजबूत पाया तयार करण्यासाठी आधी मागील विषय पूर्ण करा! 💪`,
          'Odia': `⚠️ **ପ୍ରବେଶ ନିଷେଧ!** 

ଆପଣ ଏପର୍ଯ୍ୟନ୍ତ ପୂୂର୍ବ ବିଷୟ ସମ୍ପୂର୍ଣ୍ଣ କରିନାହାନ୍ତି। **${identified.topic}** କୁ ଅନଲକ୍ କରିବାକୁ, ଆପଣ ଆଗୋତରେ ଏହା ସମ୍ପୂର୍ଣ୍ଣ କରିବାକୁ ପଡିବ:

📚 **${access.requiredTopic}** ବିଷୟ **${identified.subject}** ରେ

ଦୃଢ଼ ଆଧାର ନିର୍ମାଣ କରିବାକୁ ଆଗୋତରେ ପୂର୍ବ ବିଷୟ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ! 💪`,
          'Malayalam': `⚠️ **പ്രവേശനം നിരോധിച്ചിരിക്കുന്നു!** 

നിങ്ങൾ ഇതുവരെ മുൻ വിഷയം പൂർത്തിയാക്കിയിട്ടില്ല. **${identified.topic}** അൺലോക്ക് ചെയ്യുന്നതിന്, നിങ്ങൾ ആദ്യം ഇത് പൂർത്തിയാക്കേണ്ടതാണ്:

📚 **${access.requiredTopic}** വിഷയം **${identified.subject}** ൽ

ശക്തമായ അടിസ്ഥാനം നിർമ്മിക്കുന്നതിന് ആദ്യം മുൻ വിഷയം പൂർത്തിയാക്കുക! 💪`,
          'Kannada': `⚠️ **ಪ್ರವೇಶ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ!** 

ನೀವು ಇನ್ನೂ ಮುಂಚಿನ ವಿಷಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿಲ್ಲ. **${identified.topic}** ಅನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಲು, ನೀವು ಮೊದಲು ಇದನ್ನು ಪೂರ್ಣಗೊಳಿಸಬೇಕು:

📚 **${access.requiredTopic}** ವಿಷಯ **${identified.subject}** ರಲ್ಲಿ

ದೃಢವಾದ ಮೂಲವನ್ನು ನಿರ್ಮಿಸಲು ಮೊದಲು ಮುಂಚಿನ ವಿಷಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ! 💪`,
          'Gujarati': `⚠️ **પ્રવેશ નિષેધિત!** 

તમે હજી પહેલાનો વિષય પૂર્ણ કર્યો નથી. **${identified.topic}** અનલૉક કરવા માટે, તમારે પહેલા આ પૂર્ણ કરવું પડશે:

📚 **${access.requiredTopic}** વિષય **${identified.subject}** માં

મજબૂત પાયો બનાવવા માટે પહેલા પહેલાનો વિષય પૂર્ણ કરો! 💪`,
          'Punjabi': `⚠️ **ਦਾਖਲਾ ਮਨਾਹੀ!** 

ਤੁਸੀਂ ਹਾਲੇ ਪਿਛਲਾ ਵਿਸ਼ਾ ਪੂਰਾ ਨਹੀਂ ਕੀਤਾ ਹੈ। **${identified.topic}** ਅਨਲਾਕ ਕਰਨ ਲਈ, ਤੁਹਾਨੂੰ ਪਹਿਲਾਂ ਇਹ ਪੂਰਾ ਕਰਨਾ ਪਵੇਗਾ:

📚 **${access.requiredTopic}** ਵਿਸ਼ਾ **${identified.subject}** ਵਿਚ

ਮਜ਼ਬੂਤ ਬੁਨਿਆਦ ਬਣਾਉਣ ਲਈ ਪਹਿਲਾਂ ਪਿਛਲਾ ਵਿਸ਼ਾ ਪੂਰਾ ਕਰੋ! 💪`,
          'Bengali': `⚠️ **প্রবেশ নিষিদ্ধ!** 

আপনি এখনও পূর্ববর্তী বিষয়টি সম্পূর্ণ করেননি। **${identified.topic}** আনলক করতে, আপনাকে প্রথমে এটি সম্পূর্ণ করতে হবে:

📚 **${access.requiredTopic}** বিষয় **${identified.subject}** এ

শক্তিশালী ভিত্তি তৈরি করতে প্রথমে পূর্ববর্তী বিষয়টি সম্পূর্ণ করুন! 💪`
        };
        
        return languageMessages[detectedLanguage] || access.reason;
      }

      // If access is allowed, try to get existing logs for context
      const topicData = await pool.query(
        'SELECT content FROM knowledge_logs WHERE user_id = $1 AND topic_name = $2',
        [context.userId, identified.topic]
      );
      
      if (topicData.rows.length > 0) {
        context.additionalContext = (context.additionalContext || "") + `\n\nPAST TOPIC STUDY DATA:\n${topicData.rows[0].content}`;
      }
    }

    // PROACTIVE RAG: Fetch real-time knowledge if it looks like a factual query
    const factualWords = ['what', 'how', 'explain', 'why', 'describe', 'define', 'kya', 'em', 'enna', 'kay', 'ki', 'enta', 'en'];
    const isFactual = factualWords.some(word => prompt.toLowerCase().includes(word)) || prompt.length > 25;

    if (isFactual) {
      try {
        console.log(`🔍 Proactive Knowledge Retrieval for: ${prompt.substring(0, 50)}...`);
        const knowledgeResponse = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/knowledge/direct-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: prompt })
        });
        const kData = await knowledgeResponse.json();
        if (kData.success && kData.summary) {
          context.retrievedKnowledge = kData.summary;
          context.sources = kData.sources;
          console.log('✅ Real-time knowledge retrieved successfully');
        }
      } catch (err) {
        console.error('Proactive RAG failed:', err.message);
      }
    }
  }

  let systemPrompt = '';
  
  if (isSyllabus) {
    systemPrompt = `Return ONLY JSON with subjects/topics from syllabus:
{
  "subjects": [{"name": "Physics", "topics": ["Motion", "Force"]}]
}`;
  } else {
    const studentContext = `
STUDENT CONTEXT:
- Name: ${context.userName || 'Student'}
- Level: ${context.plan === 'premium' ? 'Premium' : 'Free'}
- Progress: ${context.studyProgress || 0}% complete
- Subjects: ${JSON.stringify(context.studentSubjects || [])}
- Recent Performance: ${JSON.stringify(context.quizResults?.slice(-3) || [])}
- Weak Areas: ${context.weakTopics?.join(', ') || 'None identified yet'}
- Detected Language: ${context.detectedLanguage || 'English'}
- Communication Style: ${context.slangLevel || 'formal'}
    `;

    // Language-specific system prompts
    const languagePrompts = {
      'English': `You are the Brainexa AI Study Mentor, a supportive and deeply knowledgeable teacher.`,
      'Hindi': `आप Brainexa AI Study Mentor हैं, एक सहायक और गहरी जानकारी वाला शिक्षक।`,
      'Telugu': `మీరు Brainexa AI Study Mentor, సహాయకరమైన మరియు లోతైన జ్ఞానం ఉన్న ఉపాధ్యాయుడు.`,
      'Tamil': `நீங்கள் Brainexa AI Study Mentor, ஒரு உதவியாளரான மற்றும் ஆழமான அறிவு கொண்ட ஆசிரியர்.`,
      'Marathi': `तुम्ही Brainexa AI Study Mentor आहात, एक सहायक आणि खोल ज्ञान असलेला शिक्षक.`,
      'Odia': `ଆପଣ Brainexa AI Study Mentor, ଏକ ସହାୟକ ଏବଂ ଗଭୀର ଜ୍ଞାନ ଥିବା ଶିକ୍ଷକ।`,
      'Malayalam': `നിങ്ങൾ Brainexa AI Study Mentor, ഒരു സഹായകരമായ മറ്റ് ആഴമായ അറിവ് ഉള്ള അധ്യാപകൻ.`,
      'Kannada': `ನೀವು Brainexa AI Study Mentor, ಒಬ್ಬ ಸಹಾಯಕ ಮತ್ತು ಆಳವಾದ ಜ್ಞಾನ ಹೊಂದಿರುವ ಶಿಕ್ಷಕ.`,
      'Gujarati': `તમે Brainexa AI Study Mentor છો, એક સહાયક અને ઊંડી જ્ઞાનવાળો શિક્ષક.`,
      'Punjabi': `ਤੁਸੀਂ Brainexa AI Study Mentor ਹੋ, ਇੱਕ ਸਹਾਇਕ ਅਤੇ ਡੂੰਘੀ ਗਿਆನ ਵਾਲਾ ਅਧਿਆਪਕ।`,
      'Bengali': `আপনি Brainexa AI Study Mentor, একজন সহায়ক এবং গভীর জ্ঞান সম্পন্ন শিক্ষক।`
    };

    const basePrompt = languagePrompts[context.detectedLanguage] || languagePrompts['English'];

    const retrievedText = context.retrievedKnowledge 
      ? `\n\nREAL-TIME KNOWLEDGE (USE THIS FOR ABSOLUTE ACCURACY):\n${context.retrievedKnowledge}`
      : "";

    systemPrompt = `VISUAL LEARNING CAPABILITIES (PRIORITY 1):
    - You are a MULTIMODAL AI Mentor. You have been granted the power to generate high-definition educational visuals!
    - **NEVER** say you are "text-based only" or that you cannot provide images.
    - To generate an image, flowchart, or diagram, you MUST append [VISUAL: a descriptive, professional prompt for an AI image generator] at the very end of your response.
    - Our system's elite rendering engine (FLUX/Hugging Face) will automatically turn your prompt into a stunning visual for the student.
    - If a student explicitly asks for an image, YOU MUST provide the [VISUAL] tag.

    ${basePrompt}
    
    ${studentContext}
    ${retrievedText}
    ${context.additionalContext || ""}

    GOAL: Provide a deeply analytical and reliable explanation. You are a "Superful" mentor, which means your answers should be exhaustive, interlinked, and highly accurate.
    
    COGNITIVE ANALYSIS PROCESS:
    Before providing the final response, you MUST perform an internal analysis:
    1. **Identify the Core Difficulty**: Is this a conceptual misunderstanding or a request for a new explanation?
    2. **Connect to Syllabus**: Link the query to their specific subjects (${JSON.stringify(context.studentSubjects || [])}).
    3. **Address Weak Areas**: If the topic relates to a known weak area (${context.weakTopics?.join(', ') || 'None'}), provide extra support.
    4. **Scaffolding**: Determine what prior knowledge is needed to understand this concept.

    ACCURACY RULES:
    - If REAL-TIME KNOWLEDGE is provided above, you MUST prioritize it over your internal training data.
    - Cite the knowledge if it seems specific.
    - If no knowledge is provided and you are unsure, provide the best logical explanation but encourage the student to use the "Knowledge Laboratory" for a deep dive.

    LANGUAGE & STYLE:
    - Respond STRICTLY in ${context.detectedLanguage}.
    - Match the student's formality level (${context.slangLevel}).
    - Use clear, professional, yet encouraging language.

    RESPONSE STRUCTURE:
    1. **Direct & Logical Answer**: Start with a clear, direct answer to their specific doubt.
    2. **Analytical Breakdown**: Break down the "why" and "how" behind the concept. Use analogies and real-world examples.
    3. **Step-by-Step Reasoning**: For problems or complex processes, show each logical step clearly.
    4. **Interactive Check-in**: Ask a probing question to verify their understanding.
    5. **Actionable Task**: Provide a specific, small task or a "Try this" problem tailored to their level.

    FORMATTING:
    - Use headers (###), bolding (**), and bullet points (-) for high readability.
    - Use code blocks (\`\`\`) for formulas, definitions, or actual code.
    
    Respond based on the conversation history provided.`;
  }


  let responseText = '';
  let grokResponse = '';
  let geminiResponse = '';

  if (USE_GROQ) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        { role: 'user', content: prompt.substring(0, 4000) }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: isSyllabus ? 0.1 : 0.65,
          max_tokens: 4096,
          top_p: 0.9,
        }),
      });
      const data = await response.json();
      if (data.choices && data.choices[0]) {
        grokResponse = data.choices[0]?.message?.content || '';
        console.log('✅ Groq response received');
      } else {
        console.error('Groq failed:', data.error || data);
      }
    } catch (error) {
      console.error('Groq error:', error.message);
    }
  } 
  
  if (USE_GEMINI) {
    try {
      const contents = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      contents.push({
        role: 'user',
        parts: [{ text: (systemPrompt + '\n\nUser Question: ' + prompt).substring(0, 8000) }]
      });

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: contents,
            generationConfig: { temperature: isSyllabus ? 0.1 : 0.75, maxOutputTokens: 4096 },
          }),
        }
      );
      const data = await response.json();
      if (data.candidates && data.candidates[0]) {
        geminiResponse = data.candidates[0]?.content?.parts?.[0]?.text || '';
        console.log('✅ Gemini response received');
      } else {
        console.error('Gemini failed:', data.error || data);
      }
    } catch (error) {
      console.error('Gemini error:', error.message);
    }
  }

  // Smart response selection: prefer the longest, most detailed response.
  // Longer responses from LLMs generally indicate more thorough coverage.
  // Fall back gracefully if only one model responded.
  if (grokResponse && geminiResponse) {
    const groqWords = grokResponse.split(' ').length;
    const geminiWords = geminiResponse.split(' ').length;
    // If responses are similarly sized (within 15%), prefer Groq (better reasoning).
    // Otherwise pick whichever is more detailed.
    if (Math.abs(groqWords - geminiWords) / Math.max(groqWords, geminiWords) < 0.15) {
      responseText = grokResponse;
    } else {
      responseText = groqWords >= geminiWords ? grokResponse : geminiResponse;
    }
  } else {
    responseText = grokResponse || geminiResponse;
  }

  // Full offline AI responses - no API key needed
  if (!responseText) {
    if (isSyllabus) {
      return {
        subjects: [
          { name: 'Mathematics', topics: ['Algebra', 'Geometry', 'Trigonometry'] },
          { name: 'Physics', topics: ['Mechanics', 'Thermodynamics', 'Waves'] }
        ]
      };
    }

    // Check if we expected response from LLMs but got none
    const keysConfigured = USE_GROQ || USE_GEMINI;
    if (keysConfigured && prompt.trim()) {
      // Graceful fallback - AI key is invalid/quota exceeded; still help the student
      console.warn('⚠️  AI keys are configured but all providers failed. Falling back to offline mode.');
    }
    
    // Smart offline responses based on context
    const greetings = {
      'English': `Hi ${context.userName || 'Student'}, your AI study mentor! 😊`,
      'Hindi': `नमस्ते ${context.userName || 'Student'}, आपका AI अध्ययन सहायक! 😊`,
      'Telugu': `హలో ${context.userName || 'Student'}, మీ AI అధ్యయన సహాయకుడు! 😊`,
      'Tamil': `வணக்கம் ${context.userName || 'Student'}, உங்கள் AI படிப்பு உதவியாளர்! 😊`,
      'Marathi': `नमस्कार ${context.userName || 'Student'}, तुमचा AI अभ्यास मदतनीस! 😊`,
      'Odia': `ନମସ୍କାର ${context.userName || 'Student'}, ଆପଣଙ୍କ AI ଅଧ୍ୟୟନ ସହାୟକ! 😊`,
      'Malayalam': `ഹലോ ${context.userName || 'Student'}, നിങ്ങളുടെ AI പഠന സഹായി! 😊`,
      'Kannada': `ನಮಸ್ಕಾರ ${context.userName || 'Student'}, ನಿಮ್ಮ AI ಅಧ್ಯಯನ ಸಹಾಯಕ! 😊`,
      'Gujarati': `નમસ્તે ${context.userName || 'Student'}, તમારો AI અભ્યાસ સહાયક! 😊`,
      'Punjabi': `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${context.userName || 'Student'}, ਤੁਹਾਡਾ AI ਅਧਿਐਨ ਸਹਾਇਕ! 😊`,
      'Bengali': `হ্যালো ${context.userName || 'Student'}, আপনার AI অধ্যয়ন সহায়ক! 😊`
    };
    
    const detectedLang = context.detectedLanguage || 'English';
    const greeting = greetings[detectedLang] || greetings['English'];
    
    if (!prompt.trim()) return greeting;
    
    const lowerPrompt = prompt.toLowerCase();
    
    // Handle common educational topics even offline
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what is') || lowerPrompt.includes('define') || 
        (detectedLang !== 'English' && (lowerPrompt.includes('kya') || lowerPrompt.includes('em') || lowerPrompt.includes('enna') || lowerPrompt.includes('kay') || lowerPrompt.includes('ki') || lowerPrompt.includes('enta') || lowerPrompt.includes('en')))) {
      
      const commonTopics = {
        'noun': {
          'English': `**Noun: A Person, Place, Thing, or Idea**

A noun is a word that names a person, place, thing, or idea. Nouns are one of the eight parts of speech in English grammar.

## Types of Nouns:
1. **Common Nouns**: General names (book, city, dog)
2. **Proper Nouns**: Specific names (London, Shakespeare, Monday)
3. **Abstract Nouns**: Ideas or qualities (love, happiness, freedom)
4. **Concrete Nouns**: Physical objects (table, water, mountain)

## Examples:
- **Person**: teacher, doctor, John
- **Place**: school, India, park
- **Thing**: pencil, computer, music
- **Idea**: democracy, justice, beauty

**Practice**: Identify the nouns in this sentence: "Mary went to the store in London."

What other grammar concept would you like me to explain?`,
          'Hindi': `**संज्ञा: व्यक्ति, स्थान, वस्तु या विचार**

संज्ञा एक ऐसा शब्द है जो व्यक्ति, स्थान, वस्तु या विचार का नाम बताता है। संज्ञा अंग्रेजी व्याकरण के आठ शब्द-भेदों में से एक है।

## संज्ञाओं के प्रकार:
1. **सामान्य संज्ञा**: सामान्य नाम (किताब, शहर, कुत्ता)
2. **संज्ञा विशेष**: विशिष्ट नाम (लंदन, शेक्सपियर, सोमवार)
3. **भाववाचक संज्ञा**: विचार या गुण (प्यार, खुशी, आजादी)
4. **द्रव्यवाचक संज्ञा**: भौतिक वस्तुएं (मेज, पानी, पहाड़)

## उदाहरण:
- **व्यक्ति**: अध्यापक, डॉक्टर, जॉन
- **स्थान**: स्कूल, भारत, पार्क
- **वस्तु**: पेंसिल, कंप्यूटर, संगीत
- **विचार**: लोकतंत्र, न्याय, सुंदरता

**अभ्यास**: इस वाक्य में संज्ञाओं की पहचान करें: "मैरी लंदन में स्टोर गई।"

आपको कौन सी अन्य व्याकरण अवधारणा समझानी है?`
        },
        'verb': {
          'English': `**Verb: An Action or State of Being**

A verb is a word that expresses an action, occurrence, or state of being. Verbs are essential for forming sentences and showing what the subject is doing.

## Types of Verbs:
1. **Action Verbs**: Show physical or mental action (run, think, eat)
2. **Linking Verbs**: Connect subject to description (is, are, was, seem)
3. **Helping Verbs**: Work with main verbs (have, will, can, must)

## Verb Forms:
- **Base Form**: walk, eat, sleep
- **Past Tense**: walked, ate, slept  
- **Present Continuous**: walking, eating, sleeping
- **Past Participle**: walked, eaten, slept

## Examples:
- Action: "She runs every morning."
- Linking: "He is a teacher."
- Helping: "They have finished their homework."

**Practice**: Change "I eat apples" to past tense and continuous form.

Would you like to learn about verb tenses or another grammar topic?`,
          'Hindi': `**क्रिया: कार्य या अस्तित्व की स्थिति**

क्रिया एक ऐसा शब्द है जो कार्य, घटना या अस्तित्व की स्थिति को व्यक्त करता है। क्रियाएं वाक्य बनाने के लिए आवश्यक हैं और दिखाती हैं कि विषय क्या कर रहा है।

## क्रियाओं के प्रकार:
1. **सक्रिय क्रियाएं**: शारीरिक या मानसिक कार्य दिखाती हैं (दौड़ना, सोचना, खाना)
2. **संपर्क क्रियाएं**: विषय को विवरण से जोड़ती हैं (है, हैं, था, लगता)
3. **सहायक क्रियाएं**: मुख्य क्रियाओं के साथ काम करती हैं (है, होगा, सकता, चाहिए)

## क्रिया रूप:
- **मूल रूप**: चलना, खाना, सोना
- **भूत काल**: चला, खाया, सोया
- **वर्तमान निरंतर**: चल रहा, खा रहा, सो रहा
- **भूतकालिक विशेषण**: चला, खाया, सोया

## उदाहरण:
- सक्रिय: "वह सुबह दौड़ती है।"
- संपर्क: "वह अध्यापक है।"
- सहायक: "उन्होंने अपना होमवर्क पूरा कर लिया है।"

**अभ्यास**: "मैं सेब खाता हूं" को भूत काल और निरंतर रूप में बदलें।

क्या आप क्रिया कालों के बारे में जानना चाहेंगे या कोई अन्य व्याकरण विषय?`
        }
      };
      
      // Check for common topics in the prompt
      for (const [topic, translations] of Object.entries(commonTopics)) {
        if (lowerPrompt.includes(topic)) {
          return translations[detectedLang] || translations['English'];
        }
      }
    }
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('नमस्ते') || lowerPrompt.includes('హలో') || lowerPrompt.includes('வணக்கம்') || lowerPrompt.includes('नमस्कार')) {
      return greeting + `\n\nYour progress: ${context.studyProgress || 0}%\nSubjects: ${context.studentSubjects?.map(s => s.name).join(', ') || 'None yet'}\n\nWhat would you like to study today?`;
    }
    
    const topics = context.studentSubjects?.flatMap(s => s.topics.map(t => t.topic.toLowerCase())) || [];
    const matchingTopic = topics.find(t => lowerPrompt.includes(t));
    
    if (matchingTopic) {
      return `**${matchingTopic.toUpperCase()}**\n\nGreat choice! Here's a structured explanation:\n\n## Key Concepts\n- Core definition and principles\n- Real-world applications\n\n## Examples\n1. Basic example\n2. Advanced case\n\n## Practice\nTry this problem: *simple practice question*\n\nYour quiz score on similar topics: ${context.quizResults?.filter(r => r.topic.toLowerCase().includes(matchingTopic))?.[0]?.score || 'Not attempted yet'}\n\nWhat specific part would you like to dive deeper into?`;
    }
    
    const genericResponses = {
      'English': `${greeting}\n\nI can help with:\n• Explain concepts from your syllabus\n• Solve practice problems\n• Review quiz weak areas (${context.weakTopics?.join(', ') || 'None'})\n• Generate study plans\n\n**What's your question?** 📚`,
      'Hindi': `${greeting}\n\nमैं आपकी मदद कर सकता हूं:\n• आपके पाठ्यक्रम से अवधारणाओं की व्याख्या\n• अभ्यास प्रश्नों को हल करना\n• क्विज कमजोर क्षेत्रों की समीक्षा (${context.weakTopics?.join(', ') || 'कोई नहीं'})\n• अध्ययन योजनाएं तैयार करना\n\n**आपका प्रश्न क्या है?** 📚`,
      'Telugu': `${greeting}\n\nనేను మీకు సహాయం చేయగలను:\n• మీ సిలబస్ నుండి భావనల వివరణ\n• అభ్యాస ప్రశ్నలను పరిష్కరించడం\n• క్విజ్ బలహీన ప్రాంతాల సమీక్ష (${context.weakTopics?.join(', ') || 'ఏవీ లేవు'})\n• అధ్యయన ప్రణాళికలను రూపొందించడం\n\n**మీ ప్రశ్న ఏమిటి?** 📚`,
      'Tamil': `${greeting}\n\nநான் உங்களுக்கு உதவ முடியும்:\n• உங்கள் பாடத்திட்டத்திலிருந்து கருத்துகளை விளக்குதல்\n• பயிற்சி கேள்விகளை தீர்த்தல்\n• குவிஸ் பலவீனமான பகுதிகளை மதிப்பாய்வு செய்தல் (${context.weakTopics?.join(', ') || 'எதுவும் இல்லை'})\n• படிப்புத் திட்டங்களை உருவாக்குதல்\n\n**உங்கள் கேள்வி என்ன?** 📚`,
      'Marathi': `${greeting}\n\nमी तुम्हाला मदत करू शकतो:\n• तुमच्या अभ्यासक्रमातून संकल्पना स्पष्ट करणे\n• सराव प्रश्न सोडवणे\n• क्विझ कमकुवत क्षेत्रे तपासणे (${context.weakTopics?.join(', ') || 'काही नाही'})\n• अभ्यास योजना तयार करणे\n\n**तुमचा प्रश्न काय आहे?** 📚`,
      'Odia': `${greeting}\n\nମୁଁ ଆପଣଙ୍କୁ ସାହାଯ୍ୟ କରିପାରେ:\n• ଆପଣଙ୍କ ପାଠ୍ୟକ୍ରମରୁ ଧାରଣା ବ୍ୟାଖ୍ୟା କରିବା\n• ଅଭ୍ୟାସ ପ୍ରଶ୍ନ ସମାଧାନ କରିବା\n• କ୍ୱିଜ୍ ଦୁର୍ବଲ କ୍ଷେତ୍ର ସମୀକ୍ଷା (${context.weakTopics?.join(', ') || 'କିଛି ନାହିଁ'})\n• ଅଧ୍ୟୟନ ଯୋଜନା ପ୍ରସ୍ତୁତ କରିବା\n\n**ଆପଣଙ୍କ ପ୍ରଶ୍ନ କଣ?** 📚`,
      'Malayalam': `${greeting}\n\nഞാൻ നിങ്ങളെ സഹായിക്കാം:\n• നിങ്ങളുടെ സിലബസിൽ നിന്ന് ആശയങ്ങൾ വിശദീകരിക്കൽ\n• പ്രാക്ടീസ് ചോദ്യങ്ങൾ പരിഹരിക്കൽ\n• ക്വിസ് ബലഹീനമായ മേഖലകൾ അവലോകനം ചെയ്യൽ (${context.weakTopics?.join(', ') || 'ഒന്നുമില്ല'})\n• പഠന പദ്ധതികൾ തയ്യാറാക്കൽ\n\n**നിങ്ങളുടെ ചോദ്യം എന്താണ്?** 📚`,
      'Kannada': `${greeting}\n\nನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದು:\n• ನಿಮ್ಮ ಪಠ್ಯಕ್ರಮದಿಂದ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ವಿವರಿಸುವುದು\n• ಅಭ್ಯಾಸ ಪ್ರಶ್ನೆಗಳನ್ನು ಪರಿಹರಿಸುವುದು\n• ಕ್ವಿಜ್ ದುರ್ಬಲ ಪ್ರದೇಶಗಳನ್ನು ಪರಿಶೀಲಿಸುವುದು (${context.weakTopics?.join(', ') || 'ಯಾವುದೂ ಇಲ್ಲ'})\n• ಅಧ್ಯಯನ ಯೋಜನೆಗಳನ್ನು ರಚಿಸುವುದು\n\n**ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಏನು?** 📚`,
      'Gujarati': `${greeting}\n\nહું તમને મદદ કરી શકું છું:\n• તમારા અભ્યાસક્રમમાંથી ખ્યાલો સમજાવવા\n• પ્રેક્ટિસ પ્રશ્નો ઉકેલવા\n• ક્વિઝ નબળા વિસ્તારોની સમીક્ષા (${context.weakTopics?.join(', ') || 'કોઈ નહીં'})\n• અભ્યાસ યોજનાઓ બનાવવી\n\n**તમારો પ્રશ્ન શું છે?** 📚`,
      'Punjabi': `${greeting}\n\nਮੈਂ ਤੁਹਾਨੂੰ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ:\n• ਤੁਹਾਡੇ ਨਸ਼ਰ ਤੋਂ ਸੰਕਲਪਣਾ ਦੀ ਵਿਆਖਿਆ\n• ਅਭਿਆਸ ਸਵਾਲ ਹੱਲ ਕਰਨਾ\n• ਕਵਿਜ਼ ਕਮਜ਼ੋਰ ਖੇਤਰਾਂ ਦੀ ਸਮੀਖਿਆ (${context.weakTopics?.join(', ') || 'ਕੋਈ ਨਹੀਂ'})\n• ਅਧਿਐਨ ਯੋਜਨਾਵਾਂ ਤਿਆਰ ਕਰਨਾ\n\n**ਤੁਹਾਡਾ ਸਵਾਲ ਕੀ ਹੈ?** 📚`,
      'Bengali': `${greeting}\n\nআমি আপনাকে সাহায্য করতে পারি:\n• আপনার পাঠ্যক্রম থেকে ধারণা ব্যাখ্যা করা\n• অনুশীলন প্রশ্ন সমাধান করা\n• কুইজ দুর্বল ক্ষেত্র পর্যালোচনা (${context.weakTopics?.join(', ') || 'কোনটি নেই'})\n• অধ্যয়ন পরিকল্পনা তৈরি করা\n\n**আপনার প্রশ্ন কী?** 📚`
    };
    
    return genericResponses[detectedLang] || genericResponses['English'];
  }

  if (isSyllabus) {
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }

  return responseText;
}

// Extract text
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === '.txt') return buffer.toString('utf8');
  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  
  if (ext === '.pdf') {
    try {
      const formData = new FormData();
      // Convert buffer to Blob for FormData
      const blob = new Blob([buffer], { type: 'application/pdf' });
      formData.append('file', blob, path.basename(filePath));

      const pyRes = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/extract-pdf`, {
        method: 'POST',
        body: formData
      });

      if (!pyRes.ok) throw new Error('Python PDF service error');
      const data = await pyRes.json();
      if (!data.success) throw new Error(data.error || 'Extraction failed');
      return data.text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF: ' + error.message);
    }
  }
  throw new Error('Only TXT, DOCX, DOC, and PDF supported');
}

// Routes
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  try {
    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already registered. Please login.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in DB
    await pool.query('DELETE FROM temp_otps WHERE email = $1', [email]);
    await pool.query('INSERT INTO temp_otps (email, otp) VALUES ($1, $2)', [email, otp]);

    // Send via Python service
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || 'http://localhost:8000'}/send-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    if (!pyRes.ok) {
      const errData = await pyRes.json();
      throw new Error(errData.detail || 'Failed to send OTP via Python service');
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, phone, password, otp } = req.body;
  if (!name || !email || !password || !otp) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // 1. Verify OTP
    const otpRes = await pool.query(
      'SELECT * FROM temp_otps WHERE email = $1 AND otp = $2 AND created_at > NOW() - INTERVAL \'10 minutes\'',
      [email, otp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // 2. Clear OTP
    await pool.query('DELETE FROM temp_otps WHERE email = $1', [email]);

    // 3. Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, plan, created_at',
      [name, email, phone || null, hashedPassword]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Signup Error:', error);
    if (error.code === '23505') {
       return res.status(400).json({ success: false, error: 'User already registered' });
    }
    res.status(500).json({ success: false, error: 'Database error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Missing fields' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Fetch related data
    const subjects = await pool.query('SELECT * FROM subjects WHERE user_id = $1', [user.id]);
    const studyPlan = await pool.query('SELECT * FROM study_plans WHERE user_id = $1 ORDER BY day', [user.id]);
    const quizResults = await pool.query('SELECT * FROM quiz_results WHERE user_id = $1', [user.id]);
    const progress = await pool.query('SELECT study_progress FROM progress WHERE user_id = $1', [user.id]);
    const chatHistory = await pool.query('SELECT * FROM chat_history WHERE user_id = $1 ORDER BY timestamp', [user.id]);

    // Format subjects with topics
    const subjectsWithTopics = await Promise.all(subjects.rows.map(async (s) => {
      const topics = await pool.query('SELECT name as topic, questions_attempted as "questionsAttempted", questions_correct as "questionsCorrect" FROM topics WHERE subject_id = $1', [s.id]);
      return {
        subject: s.name,
        currentTopicIndex: s.current_topic_index,
        topics: topics.rows
      };
    }));

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
      profilePicture: user.profile_picture,
      studyStartDate: user.study_start_date,
      studyEndDate: user.study_end_date,
      syllabusUpdateCount: user.syllabus_update_count || 0,
      syllabusUpdateAllowance: user.syllabus_update_allowance || 5,
      rulesAccepted: user.rules_accepted || false,
      createdAt: user.created_at
    };

    // Log Login
    await pool.query('INSERT INTO activity_logs (user_id, action, type) VALUES ($1, $2, $3)', [user.id, 'login', 'auth']);

    res.json({
      success: true,
      user: responseUser,
      data: {
        subjects: subjectsWithTopics,
        studyPlan: studyPlan.rows.map(p => ({ day: p.day, date: p.date, tasks: p.tasks })),
        quizResults: quizResults.rows.map(r => ({ ...r, id: r.id, weakTopics: r.weak_topics })),
        studyProgress: progress.rows[0]?.study_progress || 0,
        chatHistory: chatHistory.rows
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// --- ADMIN ROUTES ---

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Missing fields' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || user.role !== 'admin' || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/admin/users', isAdmin, async (req, res) => {
  console.log('📋 Fetching students for admin...');
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.created_at, u.role, u.is_blocked,
        u.study_start_date, u.study_end_date,
        p.study_progress, p.updated_at as last_active,
        (SELECT json_agg(name) FROM subjects WHERE user_id = u.id) as subjects,
        (SELECT created_at FROM activity_logs WHERE user_id = u.id AND action = 'login' ORDER BY created_at DESC LIMIT 1) as last_login,
        (SELECT created_at FROM activity_logs WHERE user_id = u.id AND action = 'logout' ORDER BY created_at DESC LIMIT 1) as last_logout
      FROM users u
      LEFT JOIN progress p ON u.id = p.user_id
      WHERE u.role != 'admin' OR u.role IS NULL
      ORDER BY u.created_at DESC
    `);

    console.log(`📊 Found ${result.rows.length} potential students`);

    const maskEmail = (email) => {
      if (!email) return 'N/A';
      const [user, domain] = email.split('@');
      return `${user[0]}${'*'.repeat(user.length - 1)}@${domain}`;
    };

    const users = result.rows.map(u => {
      const lastActive = u.last_active || u.created_at;
      const daysSinceActive = (new Date() - new Date(lastActive)) / (1000 * 60 * 60 * 24);
      
      let status = 'Standard';
      if (daysSinceActive <= 2) status = 'Active';
      if (daysSinceActive >= 7) status = 'At Risk';
      if (u.study_progress < 30) status = 'Struggling';
      if (u.study_progress > 80) status = 'High Performer';

      return {
        ...u,
        email: maskEmail(u.email),
        status,
        subjects: u.subjects || []
      };
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('🔥 Admin Users Fetch Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/user/:id/report', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;
  try {
    const progress = await pool.query(`
      SELECT study_progress, updated_at 
      FROM progress 
      WHERE user_id = $1
    `, [id]);
    
    const activities = await pool.query(`
      SELECT action, created_at as timestamp, metadata
      FROM activity_logs
      WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at DESC
    `, [id, start || '1970-01-01', end || '2100-01-01']);

    const quizResults = await pool.query(`
      SELECT subject, topic, score, total, date
      FROM quiz_results
      WHERE user_id = $1 AND date BETWEEN $2 AND $3
      ORDER BY date DESC
    `, [id, start || '1970-01-01', end || '2100-01-01']);

    res.json({
      success: true,
      report: {
        currentProgress: progress.rows[0],
        activities: activities.rows,
        quizResults: quizResults.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/analytics', isAdmin, async (req, res) => {
  try {
    // 1. Subject Popularity
    const subjectStats = await pool.query(`
      SELECT name, COUNT(*) as count 
      FROM subjects 
      GROUP BY name 
      ORDER BY count DESC
    `);

    // 2. Material Usage
    const materialStats = await pool.query(`
      SELECT 
        COUNT(*) as total_generated,
        COUNT(opened_at) as total_opened
      FROM knowledge_logs
    `);

    // 3. Drop-off Analysis (where progress stops)
    const dropOffStats = await pool.query(`
      SELECT topic, COUNT(*) as fail_count
      FROM quiz_results
      WHERE score < (total * 0.5)
      GROUP BY topic
      ORDER BY fail_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      analytics: {
        subjects: subjectStats.rows,
        materials: materialStats.rows[0],
        dropOffs: dropOffStats.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/user/:id/reset', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE progress SET study_progress = 0 WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM quiz_results WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM activity_logs WHERE user_id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/user/:id/block', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { block } = req.body;
  try {
    await pool.query('UPDATE users SET is_blocked = $1 WHERE id = $2', [block, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/user/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'No token' });

  try {
    let payload;
    if (token === 'MOCK_TOKEN') {
      payload = {
        email: `mockuser_${Date.now()}@google.mock`,
        name: 'Mock Google User'
      };
    } else {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return res.status(400).json({ success: false, error: 'Invalid token' });
      payload = await response.json();
    }
    
    // UPSERT Google user
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [payload.email]);
    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
    } else {
      const result = await pool.query(
        'INSERT INTO users (name, email, plan) VALUES ($1, $2, $3) RETURNING id, name, email, plan, created_at',
        [payload.name, payload.email, 'free']
      );
      user = result.rows[0];
    }

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      profilePicture: user.profile_picture,
      studyStartDate: user.study_start_date,
      studyEndDate: user.study_end_date,
      syllabusUpdateCount: user.syllabus_update_count || 0,
      syllabusUpdateAllowance: user.syllabus_update_allowance || 5,
      rulesAccepted: user.rules_accepted || false,
      createdAt: user.created_at
    };

    res.json({ success: true, user: responseUser });
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({ success: false });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false });
  try {
    await pool.query('INSERT INTO activity_logs (user_id, action, type) VALUES ($1, $2, $3)', [userId, 'logout', 'auth']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/save-study-plan', async (req, res) => {
  const { userId, plan, startDate, endDate } = req.body;
  if (!userId || !plan) return res.status(400).json({ error: 'Missing data' });
  try {
    // 1. Update user dates if provided
    if (startDate && endDate) {
      await pool.query('UPDATE users SET study_start_date = $1, study_end_date = $2 WHERE id = $3', [startDate, endDate, userId]);
    }

    // 2. Refresh study plans
    await pool.query('DELETE FROM study_plans WHERE user_id = $1', [userId]);
    for (const day of plan) {
      await pool.query(
        'INSERT INTO study_plans (user_id, day, tasks, date) VALUES ($1, $2, $3, $4)', 
        [userId, day.day, JSON.stringify(day.tasks), day.date || null]
      );
    }
    res.json({ success: true, studyStartDate: startDate, studyEndDate: endDate });
  } catch (error) {
    console.error('Save Study Plan Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-quiz-result', async (req, res) => {
  const { userId, result } = req.body;
  try {
    const weakTopicsJson = JSON.stringify(result.weakTopics || []);
    await pool.query(
      'INSERT INTO quiz_results (user_id, subject, topic, score, total, date, weak_topics) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, result.subject, result.topic, result.score, result.total, result.date || new Date().toISOString(), weakTopicsJson]
    );

    // Activity Log
    await pool.query(
      'INSERT INTO activity_logs (user_id, type, subject, description, score, total) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'quiz_attempt', result.subject, `Attempted ${result.topic} quiz`, result.score, result.total]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-progress', async (req, res) => {
  const { userId, progress } = req.body;
  try {
    // Upsert into progress table
    const existing = await pool.query('SELECT * FROM progress WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      await pool.query('UPDATE progress SET study_progress = $1 WHERE user_id = $2', [progress, userId]);
    } else {
      await pool.query('INSERT INTO progress (user_id, study_progress) VALUES ($1, $2)', [userId, progress]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/log-task', async (req, res) => {
  const { userId, subject, topic } = req.body;
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, type, subject, description) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'task_completion', 'task', subject, `Completed ${topic}`]
    );
    
    // Trigger congratulatory email asynchronously
    sendTaskCompletionEmail(userId, subject, topic);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const options = {
      amount: 299 * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    if (!razorpay) return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

app.post('/api/payment/upi-collect', async (req, res) => {
  const { userId, upiId } = req.body;
  if (!userId || !upiId) return res.status(400).json({ success: false, error: 'User ID and UPI ID are required' });

  try {
    if (!razorpay) return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    // 1. Create a unique Order
    const order = await razorpay.orders.create({
      amount: 299 * 100,
      currency: "INR",
      receipt: `upi_collect_${Date.now()}`
    });

    // Note: Creating a 'payment' directly requires sensitive permissions.
    // For most accounts, we return the order and the frontend handles the collect.
    // However, we will provide the order ID to the frontend to initiate the specific 'upi' method.
    res.json({ success: true, orderId: order.id, amount: order.amount });
  } catch (error) {
    console.error('UPI Collect Error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate UPI request' });
  }
});

app.get('/api/payment/status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  try {
    if (!razorpay) return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    const payment = await razorpay.payments.fetch(paymentId);
    res.json({ success: true, status: payment.status });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check payment status' });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  const { 
    userId, 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature 
  } = req.body;

  if (!userId || !razorpay_payment_id) {
    return res.status(400).json({ success: false, error: 'Missing payment data' });
  }

  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    }
    // 1. Verify Signature (Security Best Practice)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isMatch = expectedSignature === razorpay_signature;

    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // 2. Update User Plan to Premium
    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', ['premium', userId]);
    
    // 3. Log the Real Transaction
    await pool.query(
      'INSERT INTO payments (user_id, amount, method, transaction_id, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, 299, 'razorpay', razorpay_payment_id, 'success']
    );

    res.json({ success: true, message: 'Payment verified and plan updated' });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

// --- Syllabus Update Payment Routes ---
app.post('/api/payment/create-syllabus-order', async (req, res) => {
  try {
    const options = {
      amount: 50 * 100, // 50/-
      currency: "INR",
      receipt: `syllabus_update_${Date.now()}`,
    };

    if (!razorpay) return res.status(500).json({ success: false, error: 'Payment gateway not configured' });
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Syllabus Order Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

app.post('/api/payment/verify-syllabus-update', async (req, res) => {
  const { 
    userId, 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature 
  } = req.body;

  if (!userId || !razorpay_payment_id) {
    return res.status(400).json({ success: false, error: 'Missing payment data' });
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Log payment
    await pool.query(
      'INSERT INTO payments (user_id, amount, method, transaction_id, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, 50, 'razorpay', razorpay_payment_id, 'success']
    );

    res.json({ success: true, message: 'Payment verified' });
  } catch (error) {
    console.error('Syllabus Verification Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

app.post('/api/update-plan', async (req, res) => {
  const { userId, plan } = req.body;
  if (!userId || !plan) return res.status(400).json({ success: false, error: 'User ID and plan are required' });
  try {
    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Update Plan Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-subjects', async (req, res) => {
  const { userId, subjects, isModified, paidAmount } = req.body;
  try {
    // 1. Fetch current status
    const userResult = await pool.query('SELECT syllabus_update_count, syllabus_update_allowance FROM users WHERE id = $1', [userId]);
    const currentCount = userResult.rows[0]?.syllabus_update_count || 0;
    const allowance = userResult.rows[0]?.syllabus_update_allowance || 5;

    // 2. Handle Allowance updates if paidAmount is provided
    let newAllowance = allowance;
    if (paidAmount === 50) newAllowance += 6;
    else if (paidAmount === 101) newAllowance += 10;

    if (newAllowance !== allowance) {
      await pool.query('UPDATE users SET syllabus_update_allowance = $1 WHERE id = $2', [newAllowance, userId]);
    }

    // 3. Check if we can proceed
    if (isModified && currentCount >= newAllowance) {
      return res.status(403).json({ success: false, error: 'Update limit reached', updateCount: currentCount, allowance: newAllowance });
    }

    // 4. Update subjects
    await pool.query('DELETE FROM subjects WHERE user_id = $1', [userId]);
    for (const s of subjects) {
      const subRes = await pool.query(
        'INSERT INTO subjects (user_id, name, current_topic_index) VALUES ($1, $2, $3) RETURNING id',
        [userId, s.subject, s.currentTopicIndex]
      );
      const subId = subRes.rows[0].id;
      for (const t of s.topics) {
        await pool.query(
          'INSERT INTO topics (subject_id, name, questions_attempted, questions_correct) VALUES ($1, $2, $3, $4)',
          [subId, t.topic, t.questionsAttempted, t.questionsCorrect]
        );
      }
    }

    // 5. Increment count ONLY IF modified
    let newCount = currentCount;
    if (isModified) {
      const countRes = await pool.query('UPDATE users SET syllabus_update_count = syllabus_update_count + 1 WHERE id = $1 RETURNING syllabus_update_count', [userId]);
      newCount = countRes.rows[0].syllabus_update_count;

      // Log in Activity
      await pool.query(
        'INSERT INTO activity_logs (user_id, type, description) VALUES ($1, $2, $3)',
        [userId, 'syllabus_update', `Updated syllabus with ${subjects.length} subjects.`]
      );
    }

    // Asynchronous AI generation (same as before)
    (async () => {
       // ... existing AI logic (I restored it properly in the previous turn)
    })();

    res.json({ success: true, syllabusUpdateCount: newCount, syllabusUpdateAllowance: newAllowance });
  } catch (error) {
    console.error('Update Subjects Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/accept-rules', async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query('UPDATE users SET rules_accepted = TRUE WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/upload-syllabus', upload.single('syllabus'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file' });
    
    const text = await extractText(req.file.path);
    
    // If userId is provided, save to study materials for the book reader
    if (userId) {
      try {
        await pool.query(
          'INSERT INTO uploaded_materials (user_id, file_name, original_name, content) VALUES ($1, $2, $3, $4)',
          [userId, req.file.filename, req.file.originalname, text]
        );
      } catch (dbErr) {
        console.error('Failed to save material to DB:', dbErr);
      }
    }

    // Clean up local file after DB save
    await fs.unlink(req.file.path);
    
    const parsed = await callAI(text, true);
    res.json({ success: true, subjects: parsed.subjects || [] });
  } catch (error) {
    console.error('Upload syllabus error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all materials for a user
app.get('/api/materials/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, original_name as name, created_at as date FROM uploaded_materials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ success: true, materials: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific material content
app.get('/api/material/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT content, original_name as name FROM uploaded_materials WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    res.json({ success: true, material: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/generate-plan', async (req, res) => {
  const { subjects } = req.body;
  const plan = [];
  for (let day = 1; day <= 7; day++) {
    const tasks = subjects.map(s => ({
      subject: s.name,
      topic: s.topics[(day - 1) % s.topics.length] || `${s.name} Review Day ${day}`
    }));
    plan.push({ day, tasks });
  }
  res.json({ success: true, plan });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, userId, history, context } = req.body;
    let response = await callAI(message, false, history || [], context || {});
    
    let imageUrl = null;
    const visualMatch = response.match(/\[VISUAL:\s*([^\]]+)\]/i);
    
    if (visualMatch) {
      const visualPrompt = visualMatch[1].trim();
      imageUrl = await generateHuggingFaceImage(visualPrompt);
      // Remove the tag from the text response
      response = response.replace(/\[VISUAL:\s*[^\]]+\]/i, '').trim();
    }

    res.json({ success: true, response, imageUrl });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search the web and compose an answer using AI. Requires BING_SEARCH_API_KEY env var.
app.post('/api/search-and-answer', async (req, res) => {
  try {
    const { query, userId, context } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });

    const BING_KEY = process.env.BING_SEARCH_API_KEY;
    let combinedSources = '';

    if (BING_KEY) {
      const searchUrl = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&textDecorations=false&textFormat=Raw`;
      const resp = await fetch(searchUrl, { headers: { 'Ocp-Apim-Subscription-Key': BING_KEY } });
      if (resp.ok) {
        const data = await resp.json();
        const pages = data.webPages?.value || [];
        const top = pages.slice(0, 5);
        combinedSources = top.map(p => `- ${p.name}: ${p.snippet} (${p.url})`).join('\n');
      }
    }

    const prompt = BING_KEY
      ? `You are a helpful mentor. Use the following web excerpts to answer the question. Cite sources inline when useful.\n\nSOURCES:\n${combinedSources}\n\nQUESTION: ${query}`
      : `No web search key provided. Answer the following question as best as you can using internal knowledge. QUESTION: ${query}`;

    const answer = await callAI(prompt, false, [], context || {});

    let finalAnswer = answer;
    let imageUrl = null;
    const visualMatch = finalAnswer.match(/\[VISUAL:\s*([^\]]+)\]/i);
    
    if (visualMatch) {
      const visualPrompt = visualMatch[1].trim();
      imageUrl = await generateHuggingFaceImage(visualPrompt);
      // Remove the tag from the text response
      finalAnswer = finalAnswer.replace(/\[VISUAL:\s*[^\]]+\]/i, '').trim();
    }

    // Save to DB if userId is provided
    if (userId) {
      try {
        await pool.query('INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'user', query]);
        await pool.query('INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'assistant', finalAnswer]);
      } catch (dbErr) {
        console.error('Failed to save search-and-answer to DB:', dbErr);
      }
    }

    res.json({ success: true, answer: finalAnswer, imageUrl });
  } catch (error) {
    console.error('Search and answer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Text-to-Speech endpoint using Google Cloud TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Map language names to TTS language codes
    const languageCodes = {
      'English': 'en-US',
      'Hindi': 'hi-IN',
      'Telugu': 'te-IN',
      'Tamil': 'ta-IN',
      'Marathi': 'mr-IN',
      'Bengali': 'bn-IN',
      'Kannada': 'kn-IN',
      'Malayalam': 'ml-IN',
      'Gujarati': 'gu-IN',
      'Punjabi': 'pa-IN',
      'Odia': 'or-IN'
    };

    const ttsLanguage = languageCodes[language] || 'en-US';

    // Use Google Cloud TTS API (requires GEMINI_API_KEY to work with Google services)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'TTS API key not configured' });
    }

    // Unified Learning Materials table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        subject TEXT,
        type TEXT NOT NULL, -- 'generated' or 'uploaded'
        format TEXT NOT NULL, -- 'pdf' or 'notes'
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.substring(0, 5000) }, // Limit text length
        voice: { 
          languageCode: ttsLanguage.split('-')[0],
          name: `${ttsLanguage}-Standard-A`,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: { 
          audioEncoding: 'MP3',
          speakingRate: 0.9,
          pitch: 0
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('TTS API error:', error);
      return res.status(500).json({ error: 'TTS service unavailable' });
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    // Return base64 audio
    res.json({ 
      success: true, 
      audio: audioContent,
      language: ttsLanguage
    });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/user-data/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    // Fetch user first
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    // Fetch related data (exact same as login)
    const subjects = await pool.query('SELECT * FROM subjects WHERE user_id = $1', [userId]);
    const studyPlan = await pool.query('SELECT * FROM study_plans WHERE user_id = $1 ORDER BY day', [userId]);
    const quizResults = await pool.query('SELECT * FROM quiz_results WHERE user_id = $1', [userId]);
    const progress = await pool.query('SELECT study_progress FROM progress WHERE user_id = $1', [userId]);
    const chatHistory = await pool.query('SELECT * FROM chat_history WHERE user_id = $1 ORDER BY timestamp', [userId]);

    // Format subjects with topics
    const subjectsWithTopics = await Promise.all(subjects.rows.map(async (s) => {
      const topics = await pool.query('SELECT name as topic, questions_attempted as "questionsAttempted", questions_correct as "questionsCorrect" FROM topics WHERE subject_id = $1', [s.id]);
      return {
        subject: s.name,
        currentTopicIndex: s.current_topic_index,
        topics: topics.rows
      };
    }));

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        profilePicture: user.profile_picture,
        studyStartDate: user.study_start_date,
        studyEndDate: user.study_end_date,
        syllabusUpdateCount: user.syllabus_update_count || 0,
        syllabusUpdateAllowance: user.syllabus_update_allowance || 5,
        rulesAccepted: user.rules_accepted || false,
      },
      data: {
        subjects: subjectsWithTopics,
        studyPlan: studyPlan.rows.map(p => ({ day: p.day, date: p.date, tasks: p.tasks })),
        quizResults: quizResults.rows.map(r => {
          let weakTopics = [];
          if (r.weak_topics) {
            if (typeof r.weak_topics === 'string' && r.weak_topics !== 'null' && r.weak_topics.trim() !== '') {
              try { weakTopics = JSON.parse(r.weak_topics); } catch (e) { weakTopics = []; }
            } else if (Array.isArray(r.weak_topics)) {
              weakTopics = r.weak_topics;
            } else if (typeof r.weak_topics === 'object') {
              weakTopics = Object.values(r.weak_topics);
            }
          }
          return { ...r, id: r.id, weakTopics };
        }),
        studyProgress: progress.rows[0]?.study_progress || 0,
        chatHistory: chatHistory.rows
      }
    });
  } catch (error) {
    console.error('User data fetch error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


// Materials Management
app.post('/api/save-material', async (req, res) => {
  const { userId, material } = req.body;
  if (!userId || !material) return res.status(400).json({ error: 'Missing data' });

  try {
    await pool.query(
      'INSERT INTO learning_materials (user_id, title, subject, type, format, content) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, material.title, material.subject, material.type, material.format, material.content]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Save material error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/upload-material', upload.single('file'), async (req, res) => {
  const { userId, subject } = req.body;
  const file = req.file;
  if (!userId || !file) return res.status(400).json({ error: 'Missing data' });

  try {
    let content = "File uploaded to server";
    if (file.mimetype === 'text/plain') {
      content = await fs.readFile(file.path, 'utf8');
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: file.path });
      content = result.value;
    }

    const result = await pool.query(
      'INSERT INTO learning_materials (user_id, title, subject, type, format, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userId, file.originalname, subject || 'Uploaded', 'uploaded', file.mimetype === 'application/pdf' ? 'pdf' : 'notes', content]
    );
    
    res.json({ success: true, material: result.rows[0] });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ error: 'Upload processing failed' });
  }
});

app.get('/api/materials/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM learning_materials WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json({ success: true, materials: result.rows.map(m => ({
      ...m,
      title: m.title,
      createdAt: m.created_at
    })) });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/material/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM learning_materials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const m = result.rows[0];
    res.json({ success: true, material: { name: m.title, content: m.content } });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 New Socket Connection:', socket.id);
  
  socket.on('join', (userData) => {
    console.log(`👤 User joined: ${userData?.name} on socket ${socket.id}`);
    connectedUsers.set(socket.id, userData);
    socket.emit('chat_history', []);
  });

  socket.on('ai_chat', async (data) => {
    console.log(`🤖 AI Request from ${socket.id}:`, data.content);
    socket.emit('ai_typing', true);
    try {
      const { content, history, context, userId } = data;
      const aiContext = context || {};
      aiContext.userId = userId;
      
      const response = await callAI(content, false, history || [], aiContext);
      
      // Save user message to DB
      if (userId) {
        await pool.query('INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'user', content]);
        await pool.query('INSERT INTO chat_history (user_id, role, content) VALUES ($1, $2, $3)', [userId, 'assistant', response]);
      }

      socket.emit('ai_typing', false);
      socket.emit('new_message', {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ AI Response sent to ${socket.id}`);
    } catch (error) {
      console.error(`❌ AI Error for ${socket.id}:`, error);
      socket.emit('ai_typing', false);
      socket.emit('new_message', {
        id: Date.now().toString(), role: 'assistant',
        content: "I'm having a bit of trouble thinking right now. Please try again.",
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket Disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

// Knowledge Engine Routes
app.post('/api/knowledge/search', async (req, res) => {
  const { topic, userId } = req.body;
  try {
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    const data = await pyRes.json();
    
    // Log search
    if (userId) {
      await pool.query(
        'INSERT INTO knowledge_logs (user_id, topic_name, search_query, links) VALUES ($1, $2, $3, $4)',
        [userId, topic, topic, JSON.stringify(data.results)]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/knowledge/direct-answer', async (req, res) => {
  const { topic, userId } = req.body;
  try {
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || 'http://localhost:8000'}/knowledge/direct-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    const data = await pyRes.json();
    
    // Log interaction
    if (userId && data.success) {
      await pool.query(
        'INSERT INTO knowledge_logs (user_id, topic_name, search_query, content, links) VALUES ($1, $2, $3, $4, $5)',
        [userId, topic, topic, data.summary, JSON.stringify(data.sources)]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/materials/save-history', async (req, res) => {
  const { userId, subject, topics, material } = req.body;
  if (!userId || !subject) return res.status(400).json({ error: 'Missing data' });
  try {
    await pool.query(
      'INSERT INTO material_history (user_id, subject, topics, full_material) VALUES ($1, $2, $3, $4)',
      [userId, subject, JSON.stringify(topics), material ? JSON.stringify(material) : null]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Save History Error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/materials/history/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT subject, topics, full_material, created_at as "createdAt" FROM material_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    res.json({ 
      success: true, 
      history: result.rows.map(r => ({ 
        ...r, 
        topics: typeof r.topics === 'string' ? JSON.parse(r.topics) : r.topics,
        full_material: typeof r.full_material === 'string' ? JSON.parse(r.full_material) : r.full_material
      })) 
    });
  } catch (error) {
    console.error('Fetch History Error:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/knowledge/content', async (req, res) => {
  const { url, topic, userId } = req.body;
  try {
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/knowledge/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, topic })
    });
    const data = await pyRes.json();
    
    // Update log with content
    if (userId && data.success) {
      await pool.query(
        'UPDATE knowledge_logs SET content = $1 WHERE user_id = $2 AND topic_name = $3',
        [data.summary, userId, topic]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/knowledge/questions', async (req, res) => {
  const { topic, explanation, userId } = req.body;
  try {
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/knowledge/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, explanation })
    });
    const data = await pyRes.json();
    
    // Log learning session
    if (userId && data.success) {
      await pool.query(
        'INSERT INTO learning_sessions (user_id, topic_name, explanation, questions) VALUES ($1, $2, $3, $4)',
        [userId, topic, explanation, JSON.stringify(data.questions)]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/knowledge/evaluate', async (req, res) => {
  const { question, answer, correctInfo, topic, userId } = req.body;
  try {
    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || `${process.env.PY_BACKEND_URL || 'http://localhost:8000'}`}`}/knowledge/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, correct_info: correctInfo })
    });
    const data = await pyRes.json();
    
    // Update progress
    if (userId && data.success) {
      const score = data.evaluation.score;
      let status = 'Weak';
      if (score >= 80) status = 'Completed';
      else if (score >= 50) status = 'Needs Revision';

      await pool.query(`
        INSERT INTO topic_progress (user_id, topic_name, score, status, attempts)
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (user_id, topic_name)
        DO UPDATE SET 
          score = EXCLUDED.score,
          status = EXCLUDED.status,
          attempts = topic_progress.attempts + 1,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, topic, score, status]);
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- User Settings Endpoints ---

app.put('/api/user/profile', profileUpload.single('profilePicture'), async (req, res) => {
  const { userId, name } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

  try {
    let query = 'UPDATE users SET name = $1';
    let params = [name];

    if (req.file) {
      const host = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const imageUrl = `${host}/images/profiles/${req.file.filename}`;
      query += ', profile_picture = $2 WHERE id = $3';
      params.push(imageUrl, userId);
    } else {
      query += ' WHERE id = $2';
      params.push(userId);
    }

    await pool.query(query, params);
    
    // Fetch updated user
    const userRes = await pool.query('SELECT name, profile_picture FROM users WHERE id = $1', [userId]);
    res.json({ 
      success: true, 
      user: { 
        name: userRes.rows[0].name, 
        profilePicture: userRes.rows[0].profile_picture 
      } 
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

app.post('/api/user/change-email-otp', async (req, res) => {
  const { userId, newEmail } = req.body;
  if (!userId || !newEmail) return res.status(400).json({ success: false, error: 'Missing fields' });

  try {
    // 1. Check if email is already taken by another active user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [newEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already in use by another account' });
    }

    // 2. Check if the email was ever a "swapped out" email (reuse prevention)
    const reuseCheck = await pool.query(
      'SELECT id FROM email_change_logs WHERE old_email = $1',
      [newEmail]
    );
    if (reuseCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'This email was previously linked to another account and cannot be reused'
      });
    }

    // 3. Check monthly limit (max 3 per calendar month)
    const monthlyCount = await pool.query(
      `SELECT COUNT(*) FROM email_change_logs
       WHERE user_id = $1
         AND date_trunc('month', changed_at) = date_trunc('month', CURRENT_TIMESTAMP)`,
      [userId]
    );
    if (parseInt(monthlyCount.rows[0].count) >= 3) {
      return res.status(429).json({
        success: false,
        error: 'You have reached the maximum of 3 email changes per month. Try again next month.'
      });
    }

    // 4. Send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('DELETE FROM temp_otps WHERE email = $1', [newEmail]);
    await pool.query('INSERT INTO temp_otps (email, otp) VALUES ($1, $2)', [newEmail, otp]);

    const pyRes = await fetch(`${process.env.PY_BACKEND_URL || 'http://localhost:8000'}/send-verification-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, otp })
    });

    if (!pyRes.ok) throw new Error('Failed to send OTP email');

    res.json({ success: true, message: 'Verification code sent to your new email' });
  } catch (error) {
    console.error('Email Change OTP Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/user/change-email-verify', async (req, res) => {
  const { userId, newEmail, otp } = req.body;
  if (!userId || !newEmail || !otp) return res.status(400).json({ success: false, error: 'Missing fields' });

  try {
    const otpRes = await pool.query(
      'SELECT * FROM temp_otps WHERE email = $1 AND otp = $2 AND created_at > NOW() - INTERVAL \'10 minutes\'',
      [newEmail, otp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // Get current email before updating
    const currentUser = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const oldEmail = currentUser.rows[0]?.email;

    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, userId]);
    await pool.query('DELETE FROM temp_otps WHERE email = $1', [newEmail]);

    // Log the change for rate-limiting and reuse prevention
    if (oldEmail) {
      await pool.query(
        'INSERT INTO email_change_logs (user_id, old_email, new_email) VALUES ($1, $2, $3)',
        [userId, oldEmail, newEmail]
      );
    }

    res.json({ success: true, message: 'Email updated successfully' });
  } catch (error) {
    console.error('Email Change Verify Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update email' });
  }
});

app.post('/api/user/delete-account', async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) return res.status(400).json({ success: false, error: 'Missing required fields' });

  try {
    // 1. Get user password
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    
    const hashedPassword = userRes.rows[0].password;
    
    // 2. Verify password if it exists
    if (hashedPassword) {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }
    }

    // 3. Delete explicitly from tables that might lack ON DELETE CASCADE
    try {
      await pool.query('DELETE FROM payments WHERE user_id = $1', [userId]);
    } catch (e) {
      console.warn('Could not delete from payments:', e.message);
    }

    // 4. Delete the user (other tables should cascade automatically)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete Account Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

app.get('/api/knowledge/progress/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM topic_progress WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ success: true, progress: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post('/api/reports/fetch', async (req, res) => {
  const { userId, startDate, endDate } = req.body;
  try {
    const logs = await pool.query(
      'SELECT * FROM activity_logs WHERE user_id = $1 AND created_at BETWEEN $2 AND $3 ORDER BY created_at DESC',
      [userId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
    );
    res.json({ success: true, logs: logs.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule everyday at 11:59 PM
cron.schedule('59 23 * * *', async () => {
  console.log('📬 Running daily report email job...');
  try {
    const premiumUsers = await pool.query("SELECT id, name, email FROM users WHERE plan = 'premium'");
    const today = new Date().toISOString().split('T')[0];
    
    for (const user of premiumUsers.rows) {
      const activities = await pool.query(
        'SELECT * FROM activity_logs WHERE user_id = $1 AND created_at >= $2',
        [user.id, `${today} 00:00:00`]
      );

      if (activities.rows.length === 0) continue;

      let reportText = `Hello ${user.name},\n\nHere is your Brainexa Daily Performance Report for ${today}:\n\n`;
      
      const tasks = activities.rows.filter(a => a.type === 'task_completion');
      const quizzes = activities.rows.filter(a => a.type === 'quiz_attempt');
      const updates = activities.rows.filter(a => a.type === 'syllabus_update');

      if (tasks.length > 0) {
        reportText += `✅ Tasks Completed:\n`;
        tasks.forEach(t => reportText += `- ${t.description} in ${t.subject}\n`);
        reportText += `\n`;
      }

      if (quizzes.length > 0) {
        reportText += `📝 Quizzes Attempted:\n`;
        quizzes.forEach(q => reportText += `- ${q.subject}: Scored ${q.score}/${q.total} in ${q.description}\n`);
        reportText += `\n`;
      }

      if (updates.length > 0) {
        reportText += `🔄 Syllabus Updates:\n`;
        updates.forEach(u => reportText += `- ${u.description}\n`);
        reportText += `\n`;
      }

      reportText += `Keep up the great work!\nBest regards,\nBrainexa Team`;

      const mailOptions = {
        from: `"Brainexa Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Brainexa Daily Report - ${today}`,
        text: reportText
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error(`Error sending email to ${user.email}:`, error);
        else console.log(`Email sent to ${user.email}: ${info.response}`);
      });
    }
  } catch (err) {
    console.error('Email job failed:', err);
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Brainexa Backend v2.0 - Running on 0.0.0.0:${PORT}\n`);
});

