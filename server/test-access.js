import dotenv from 'dotenv';
dotenv.config();

// Create a copy of the actual functions from index.js for testing
async function identifyTopicFromQuery(query, subjects) {
  if (!subjects || subjects.length === 0) return null;

  const syllabusText = subjects.map(s => 
    `${s.subject}: ${s.topics.map(t => t.topic).join(', ')}`
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
    const identResult = await mockCallAI(identificationPrompt, true);
    if (identResult && identResult.subject && identResult.topic) {
      return identResult;
    }
  } catch (e) {
    console.error('Topic identification error:', e);
  }
  return null;
}

// Check if the student has access to this topic
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
        reason: `Please complete the previous topic: **${prevTopic.topic}** in **${subjectName}** first.`,
        lockedTopic: topicName,
        requiredTopic: prevTopic.topic
      };
    }
  }

  return { allowed: true };
}

// Mock AI for testing
async function mockCallAI(prompt, isSyllabus = false, history = [], context = {}) {
  // If we are doing the test ident
  if (prompt.includes('User Query: "What is momentum?"')) {
    return { subject: "Physics", topic: "Momentum" };
  }
  if (prompt.includes('User Query: "How does gravity work?"')) {
    return { subject: "Physics", topic: "Gravity" };
  }
  if (prompt.includes('User Query: "Explain thermodynamics"')) {
    return { subject: "Physics", topic: "Thermodynamics" };
  }
  return { subject: null, topic: null };
}

// Test case wrapper
async function runTest() {
  const studentSubjects = [
    {
      subject: "Physics",
      topics: [
        { topic: "Gravity", questionsAttempted: 0, questionsCorrect: 0 },
        { topic: "Momentum", questionsAttempted: 0, questionsCorrect: 0 },
        { topic: "Thermodynamics", questionsAttempted: 0, questionsCorrect: 0 },
      ]
    }
  ];

  const quizResults = []; // Empty, nothing completed

  console.log("--- TEST 1: First topic (Gravity) ---");
  let query = "How does gravity work?";
  let identified = await identifyTopicFromQuery(query, studentSubjects);
  console.log("Identified:", identified);
  let access = await checkTopicAccess(null, identified.subject, identified.topic, studentSubjects, quizResults);
  console.log("Access:", access);

  console.log("\\n--- TEST 2: Second topic (Momentum) UNLOCKED ---");
  quizResults.push({ subject: "Physics", topic: "Gravity", score: 5 }); // Mastered gravity!
  query = "What is momentum?";
  identified = await identifyTopicFromQuery(query, studentSubjects);
  console.log("Identified:", identified);
  access = await checkTopicAccess(null, identified.subject, identified.topic, studentSubjects, quizResults);
  console.log("Access:", access);

  console.log("\\n--- TEST 3: Third topic (Thermodynamics) LOCKED ---");
  query = "Explain thermodynamics";
  identified = await identifyTopicFromQuery(query, studentSubjects);
  console.log("Identified:", identified);
  access = await checkTopicAccess(null, identified.subject, identified.topic, studentSubjects, quizResults);
  console.log("Access:", access);
}

runTest();
