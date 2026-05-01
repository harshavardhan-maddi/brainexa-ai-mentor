import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.VITE_GROK_API_KEY;

console.log('=== API Key Debug ===');
console.log('GEMINI_API_KEY:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'MISSING');
console.log('GROK_API_KEY:', GROK_API_KEY ? GROK_API_KEY.substring(0, 10) + '...' : 'MISSING');
console.log('');

// Test Gemini
async function testGemini() {
  console.log('--- Testing Gemini (gemini-1.5-flash) ---');
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say hello in one sentence.' }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 100 },
      }),
    });
    const data = await res.json();
    if (data.candidates && data.candidates[0]) {
      console.log('✅ Gemini OK:', data.candidates[0].content.parts[0].text);
    } else {
      console.log('❌ Gemini FAILED. Full response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Gemini ERROR:', err.message);
  }
}

// Test Grok (xAI) — key starts with xai-
async function testGrokXAI() {
  console.log('--- Testing Grok/xAI (grok-beta) ---');
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROK_API_KEY,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
        temperature: 0.5,
      }),
    });
    const data = await res.json();
    if (data.choices && data.choices[0]) {
      console.log('✅ Grok/xAI OK:', data.choices[0].message.content);
    } else {
      console.log('❌ Grok/xAI FAILED. Full response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Grok/xAI ERROR:', err.message);
  }
}

// Test Groq (groq.com) — key starts with gsk_
async function testGroq() {
  console.log('--- Testing Groq (llama-3.3-70b-versatile) ---');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROK_API_KEY,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
        temperature: 0.5,
      }),
    });
    const data = await res.json();
    if (data.choices && data.choices[0]) {
      console.log('✅ Groq OK:', data.choices[0].message.content);
    } else {
      console.log('❌ Groq FAILED. Full response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ Groq ERROR:', err.message);
  }
}

(async () => {
  await testGemini();
  console.log('');
  await testGrokXAI();
  console.log('');
  await testGroq();
})();
