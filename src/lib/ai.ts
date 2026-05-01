// AI Service for Chat and Study Plan generation
// Supports both Gemini and Grok APIs

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY;

// Determine which AI to use based on available keys
const USE_GROK = Boolean(GROK_API_KEY && GROK_API_KEY !== 'your_grok_api_key_here');
const USE_GEMINI = Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here');

export interface ChatContext {
  subject?: string;
  topic?: string;
  previousMessages?: { role: string; content: string }[];
}

export interface StudyPlanContext {
  classLevel: string;
  subjects: string[];
  goals?: string;
  duration?: number; // days
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

// Gemini API call with conversation history support
async function callGemini(prompt: string, history: { role: string; content: string }[] = []): Promise<string> {
  // Build multi-turn contents array from history
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  // Add the current user prompt
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  const data = await response.json();
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error('Gemini API error: ' + JSON.stringify(data));
}

// Grok API call with conversation history support
async function callGrok(
  prompt: string,
  history: { role: string; content: string }[] = [],
  systemPrompt: string = ''
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  // Include previous conversation turns for context
  history.forEach(m =>
    messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })
  );
  messages.push({ role: 'user', content: prompt });

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-2-1212',
      messages,
      temperature: 0.65,
      max_tokens: 4096,
      top_p: 0.9,
    }),
  });

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error('Grok API error: ' + JSON.stringify(data));
}

// Main AI chat function
export async function generateChatResponse(
  message: string,
  context?: ChatContext
): Promise<string> {
  const history = context?.previousMessages || [];

  const focusLine = context?.subject || context?.topic
    ? `Current Focus: ${context.subject || 'General Studies'}${context.topic ? ` – Topic: ${context.topic}` : ''}`
    : '';

  const systemPrompt = `You are Brainexa AI, a world-class analytical Study Mentor designed to provide "Superful" (extremely detailed and insightful) responses, comparable to ChatGPT-4 or Gemini 1.5 Pro.

${focusLine}

COGNITIVE ANALYSIS PROCESS:
Perform a deep analysis before responding:
1. Identify the core conceptual struggle or direct question.
2. Link the query to the specific subject/topic syllabus (${context.subject || 'General'} / ${context.topic || 'General'}).
3. Cross-reference previous conversation turns to ensure continuity.

RESPONSE GUIDELINES:
- **Exhaustive Insight**: Do not provide surface-level answers. Explain EVERY part, sub-component, and nuance of the topic in great depth.
- **Analytical Rigor**: Explain the "why" and "how" using advanced analogies and real-world applications.
- **Accuracy**: Ensure 100% factual correctness.
- **Interlinking**: Explicitly mention how this current topic connects to the next logical concept in the syllabus.

RESPONSE STRUCTURE:
1. **Direct Answer**: A clear, powerful opening that answers the query directly.
2. **Comprehensive Breakdown**: Use headers and detailed explanations for ALL parts of the concept.
3. **Step-by-Step Reasoning**: If applicable, show the logic behind each step.
4. **Practice Task**: A small, challenging task for the student to try.
5. **Mandatory Closing**: You MUST conclude by asking: "Do you have any further doubts regarding this topic? I'm here to help you study more effectively!"

FORMATTING:
- Use clear markdown: ### for headers, ** for importance, and code blocks for formulas.
- Maintain an encouraging, partnership-oriented tone.`;

  if (USE_GROK) {
    return callGrok(message, history, systemPrompt);
  } else if (USE_GEMINI) {
    // For Gemini, prepend system prompt into the first user turn
    const fullPrompt = `${systemPrompt}\n\nStudent question: ${message}`;
    return callGemini(fullPrompt, history);
  } else {
    return getSimulatedResponse(message);
  }
}

// Study Plan Generation
export async function generateStudyPlan(
  classLevel: string,
  subjects: string[],
  duration: number = 7,
  startDate: string = new Date().toISOString(),
  goals: string = ""
): Promise<{ day: number; date: string; tasks: { subject: string; topic: string; description: string }[] }[]> {
  const subjectsList = subjects.join(', ');
  const startAt = new Date(startDate);
  
  let prompt = `Create a ${duration}-day study plan for a ${classLevel} student studying: ${subjectsList}.
  Starting From: ${startAt.toLocaleDateString()}
  Specific Goals/Context: ${goals || "General study and improvement"}
  
For each day, provide:
- 2-3 study tasks covering different subjects
- Each task should have: subject, specific topic, and a brief description
- Include the actual date for each day starting from ${startAt.toLocaleDateString()}

Return the response as a JSON array with this exact structure:
[
  {
    "day": 1,
    "date": "2026-04-01",
    "tasks": [
      { "subject": "Mathematics", "topic": "Algebra Basics", "description": "Learn algebraic expressions" }
    ]
  }
]

Make topics age-appropriate for ${classLevel}.`;

  if (USE_GROK) {
    const response = await callGrok(prompt);
    return parseStudyPlanResponse(response);
  } else if (USE_GEMINI) {
    const response = await callGemini(prompt);
    return parseStudyPlanResponse(response);
  } else {
    return generateDefaultStudyPlan(subjects, duration, startDate);
  }
}

function parseStudyPlanResponse(response: string): { day: number; date: string; tasks: { subject: string; topic: string; description: string }[] }[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse study plan:', e);
  }
  return [];
}

// Topic Quiz Generation
export async function generateTopicQuiz(
  topic: string,
  subject: string,
  classLevel: string = "Grade 10"
): Promise<QuizQuestion[]> {
  const prompt = `You are a professional educational assessment creator. 
Create a 5-question multiple-choice quiz for a ${classLevel} student that DEEPLY ANALYZES the topic: "${topic}" within the subject: "${subject}".

Requirements:
- Each question MUST be directly related to "${topic}".
- Provide 4 distinct options for each question.
- Identify the correct option index (0-3).
- Ensure the questions are accurate and age-appropriate for ${classLevel}.

CRITICAL: Return ONLY a raw JSON array. No preamble, no markdown formatting blocks, no explanations. 

Structure:
[
  {
    "question": "Specific question about ${topic}?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0
  }
]`;

  try {
    if (USE_GROK) {
      const response = await callGrok(prompt);
      const qs = parseQuizResponse(response);
      if (qs && qs.length > 0) return qs;
    } else if (USE_GEMINI) {
      const response = await callGemini(prompt);
      const qs = parseQuizResponse(response);
      if (qs && qs.length > 0) return qs;
    }
    
    // Log why we are falling back
    console.info(`generateTopicQuiz: Falling back to default questions for "${topic}"`);
    return generateDefaultQuiz(topic, subject);
  } catch (err) {
    console.error(`AI Quiz Generation Error for "${topic}":`, err);
    // Silent fallback to avoid breaking the UI
    return generateDefaultQuiz(topic, subject);
  }
}

function parseQuizResponse(response: string): QuizQuestion[] {
  try {
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      console.warn('parseQuizResponse: No JSON array found. Raw response:', response);
    }
  } catch (e) {
    console.error('Failed to parse quiz questions. Raw response was:', response);
    console.error('Parse error:', e);
  }
  return [];
}

function generateDefaultQuiz(topic: string, subject: string): QuizQuestion[] {
  return [
    {
      question: `Which of the following best describes a key concept in ${topic}?`,
      options: ["A fundamental principle", "An unrelated idea", "A minor detail", "None of the above"],
      correct: 0
    },
    {
      question: `In the context of ${subject}, why is ${topic} important?`,
      options: ["It has no importance", "It helps in understanding advanced concepts", "It is just a theoretical idea", "It is only for exams"],
      correct: 1
    },
    {
      question: `What is a common application of ${topic}?`,
      options: ["Real-world problem solving", "Purely academic study", "No applications", "Entertainment"],
      correct: 0
    },
    {
      question: `Which term is most closely associated with ${topic}?`,
      options: ["The opposite concept", "A relevant technical term", "A random word", "An unrelated subject"],
      correct: 1
    },
    {
      question: `What is the most common mistake students make regarding ${topic}?`,
      options: ["Overthinking the basics", "Underestimating the complexity", "Ignoring the formulas", "Both A and B"],
      correct: 3
    }
  ];
}

// Default study plan when no API is available
function generateDefaultStudyPlan(
  subjects: string[],
  days: number,
  startDate: string = new Date().toISOString()
): { day: number; date: string; tasks: { subject: string; topic: string; description: string }[] }[] {
  const topicMap: Record<string, string[]> = {
    Hindi: ["व्याकरण", "निबंध", "पत्र लेखन", "गद्य", "पद्य", "अपठित"],
    English: ["Grammar Essentials", "Vocabulary Building", "Essay Writing", "Comprehension Skills", "Literature Analysis"],
    Mathematics: ["Algebra Basics", "Geometry Fundamentals", "Statistics Introduction", "Number Systems", "Trigonometry"],
    Physics: ["Motion & Kinematics", "Force & Laws", "Work & Energy", "Waves & Sound", "Light & Optics"],
    Chemistry: ["Atomic Structure", "Chemical Bonding", "Periodic Table", "Acids & Bases", "Organic Chemistry"],
    Biology: ["Cell Structure", "Human Anatomy", "Genetics Basics", "Plant Biology", "Ecology"],
    History: ["Ancient Civilizations", "Medieval Period", "Modern History", "World Geography", "Current Affairs"],
  };

  const plan = [];
  const startAt = new Date(startDate);
  
  for (let day = 1; day <= days; day++) {
    const currentDate = new Date(startAt);
    currentDate.setDate(startAt.getDate() + (day - 1));
    
    const tasks = subjects.slice(0, 3).map((subject, idx) => {
      const topics = topicMap[subject] || [`${subject} - Part ${day}`, `${subject} - Practice`];
      const topicIndex = ((day - 1) + idx) % topics.length;
      return {
        subject,
        topic: topics[topicIndex],
        description: `Study and practice ${topics[topicIndex]} for ${subject}`,
      };
    });
    
    plan.push({ 
      day, 
      date: currentDate.toISOString().split('T')[0],
      tasks 
    });
  }

  return plan;
}

// Simulated responses when no API is available
function getSimulatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for common study-related queries
  if (lowerMessage.includes('how to study') || lowerMessage.includes('study tips')) {
    return `Great question! Here are some effective study tips, explaining every part:

**1. Active Recall**
- Don't just re-read notes - test yourself on the material.
- Use flashcards for key concepts.

**2. Spaced Repetition**
- Review material at increasing intervals.
- Don't cram everything in one session.

**3. Pomodoro Technique**
- Study for 25 minutes, then take a 5-minute break.
- After 4 sessions, take a longer break.

**4. Teach Others**
- Explain concepts to someone else (or even to yourself).
- Teaching reinforces understanding.

**5. Stay Organized**
- Keep notes structured and clear.
- Use visual aids like diagrams.

**Interlinking**: Mastering these techniques will make your next study session much more productive.

Do you have any further doubts regarding these study techniques?`;
  }

  if (lowerMessage.includes('math') || lowerMessage.includes('algebra')) {
    return `I'd be happy to help you with Mathematics! Here's a comprehensive breakdown of the core parts:

**1. Algebra** - Mastering variables and expressions to solve for unknowns.
**2. Geometry** - Understanding shapes, angles, and theorems that govern physical space.
**3. Statistics** - Learning data representation and analysis to make predictions.

**Practice Tips:**
- Start with easier problems to build confidence.
- Show all your work - it helps identify mistakes.
- Don't fear mistakes - they're learning opportunities!

**Interlinking**: These foundations are crucial for moving on to more advanced topics like Calculus.

Do you have any further doubts regarding these Mathematical concepts?`;
  }

  if (lowerMessage.includes('physics')) {
    return `Physics is fascinating! Let's break down its essential parts:

**Core Areas:**
- **Mechanics** - The study of motion, forces, and energy.
- **Waves** - Analyzing sound, light, and vibrations.
- **Electricity** - Understanding circuits and magnetism.

**Study Approach:**
1. Understand the concepts first (don't just memorize formulas).
2. Practice drawing diagrams and visualizing problems.
3. Start with simple problems and gradually increase difficulty.

**Interlinking**: Understanding motion is the first step toward exploring the vast universe of astrophysics.

Do you have any further doubts regarding these Physics topics?`;
  }

  if (lowerMessage.includes('chemistry')) {
    return `Chemistry is the science of matter! Here's what to focus on:

**Foundational Topics:**
1. **Atomic Structure** - Protons, neutrons, electrons
2. **Chemical Bonding** - Ionic and covalent bonds
3. **Periodic Table** - Groups and periods
4. **Acids & Bases** - pH scale, neutralization

**Study Tips:**
- Use the periodic table as a reference
- Understand why reactions happen, not just what happens
- Practice writing chemical equations

What would you like to learn in Chemistry?`;
  }

  if (lowerMessage.includes('biology') || lowerMessage.includes('biology')) {
    return `Biology is the study of life! Here are key areas:

**Core Topics:**
1. **Cell Biology** - Cell structure and functions
2. **Genetics** - DNA, inheritance, traits
3. **Human Anatomy** - Body systems
4. **Ecology** - Ecosystems, environment

**Study Tips:**
- Use diagrams and models to visualize
- Connect concepts to real-life examples
- Make summary sheets for quick revision

Which Biology topic interests you?`;
  }

  // Default responses
  const responses = [
    `That's a great question! Let me help you understand this better.

**Here's my approach:**
1. Break down the concept into smaller parts
2. Start with the fundamentals
3. Practice with examples
4. Review and reinforce

Would you like me to provide specific examples or dive deeper into any particular aspect?`,

    `I'd be happy to help with that! Here's what I'd suggest:

**Understanding the Concept:**
First, let's identify the key points. This topic builds on some fundamental principles that are important to grasp.

**Practical Application:**
Try connecting this to real-world examples. Understanding comes easier when you can see how things work in practice.

**Study Tip:**
Create flashcards for key terms and review them regularly. Active recall is one of the most effective study methods!

What specific part would you like me to explain further?`,

    `Great topic! Here's a structured approach to understanding every part of it:

**Overview:**
This is an important concept that forms the foundation for many advanced topics. It's used in various real-world applications.

**Key Points to Remember:**
- Start with understanding the basics thoroughly.
- Build complexity gradually from the core concept.
- Practice regularly with diverse examples.

**Study Strategy:**
Focus on understanding the 'why' behind each concept, not just the 'what'.

**Interlinking**: This concept is a stepping stone to the next major topic in your syllabus.

Do you have any further doubts regarding this topic?`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  return USE_GEMINI || USE_GROK;
}

export function getAIProvider(): string {
  if (USE_GROK) return 'Grok';
  if (USE_GEMINI) return 'Gemini';
  return 'Simulated';
}

