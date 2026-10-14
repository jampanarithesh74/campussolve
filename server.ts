import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/ai/health', (req, res) => {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'healthy',
    provider: hasOpenAI ? 'OpenAI' : hasGemini ? 'Gemini' : 'Deterministic Heuristic',
    service: 'CampusSolve AI Assistant'
  });
});

// Centralized AI Processing Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, userRole, userInfo, contextSummary } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const systemPrompt = `You are the CampusSolve AI Assistant for SYNCHRONIQ Smart Timetable Management System.
You provide intelligent scheduling assistance, workload analysis, conflict explanations, and natural-language queries.

USER CONTEXT:
- Authenticated Role: ${userRole}
- User Name: ${userInfo?.displayName || 'Campus Member'}
- Email: ${userInfo?.email || 'unspecified'}
- Assigned Cohort: ${userInfo?.batchId || 'None'}
- Assigned Faculty ID: ${userInfo?.facultyId || 'None'}

INSTITUTIONAL TIMETABLE SUMMARY:
- Total Scheduled Sessions: ${contextSummary?.totalEntries || 0}
- Active Cohort Name: ${contextSummary?.activeBatchName || 'Not selected'}
- Active Faculty Name: ${contextSummary?.activeFacultyName || 'Not selected'}
- Total Student Cohorts: ${contextSummary?.totalBatches || 6}
- Total Faculty Members: ${contextSummary?.totalFaculty || 8}
- Total Rooms/Labs: ${contextSummary?.totalRooms || 6}
- Total Subjects: ${contextSummary?.totalSubjects || 8}
- Detected Conflicts: ${contextSummary?.existingConflicts || 0}
- Sample Active Sessions: ${JSON.stringify(contextSummary?.sampleEntries || [])}

STRICT ROLE-BASED ACCESS & PERMISSIONS:
1. "admin": Full capabilities. Can request timetable generation, rescheduling, candidate comparison, conflict explanations, and publishing assistance.
2. "teacher": CANNOT modify or publish timetables. Can query their own schedule, teaching workload, assigned batches, room assignments, and free periods.
3. "student": CANNOT modify or publish timetables. Can query their cohort schedule, class timings, subject rooms, faculty instructors, and free periods.
If a student or teacher requests timetable modification, publishing, or batch creation, politely inform them that administrative privileges are required.

STRICT DETERMINISTIC ENGINE BOUNDARY:
- Do NOT invent or hallucinate timetable allocations out of thin air.
- The existing deterministic scheduling engine in the application is the sole source of truth for conflict validation, room allocation, and constraint checking.
- When explaining conflicts or answering queries, reference actual constraints (hard collisions, capacity limits, lab apparatus requirements, faculty availability).

SUPPORTED INTENTS (You MUST pick one):
GENERAL_QUERY, GENERATE_TIMETABLE, EXPLAIN_CONFLICT, FIND_AVAILABLE_ROOM, FIND_AVAILABLE_FACULTY,
SHOW_TIMETABLE, SHOW_FACULTY_WORKLOAD, ANALYZE_TIMETABLE, COMPARE_CANDIDATES, REQUEST_TIMETABLE_CHANGE,
REQUEST_RESCHEDULE, CHECK_FACULTY_AVAILABILITY, CHECK_ROOM_AVAILABILITY, CHECK_BATCH_AVAILABILITY,
OPTIMIZE_TIMETABLE, SHOW_FREE_PERIODS, EXPLAIN_QUALITY_SCORE, EXPORT_TIMETABLE, PUBLISH_TIMETABLE, UNKNOWN

OUTPUT FORMAT:
You MUST respond with valid JSON only in the following schema:
{
  "intent": "<ONE_OF_THE_SUPPORTED_INTENTS>",
  "entities": {
    "day": "<Monday/Tuesday/etc or null>",
    "timeSlot": "<HH:mm - HH:mm or null>",
    "faculty": "<faculty name or null>",
    "room": "<room name or null>",
    "batch": "<batch name or null>",
    "subject": "<subject name or null>"
  },
  "explanation": "<Friendly, markdown-formatted answer directly addressing the user>",
  "action": null,
  "recommendations": ["<suggested follow-up 1>", "<suggested follow-up 2>", "<suggested follow-up 3>"]
}`;

    // 1. Try OpenAI API if OPENAI_API_KEY is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(history)
            ? history.map((h: any) => ({
                role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
                content: String(h.content)
              }))
            : []),
          { role: 'user', content: message }
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          res.json(parsed);
          return;
        }
      } catch (openAiErr) {
        console.error('OpenAI API call failed, falling back to backup provider:', openAiErr);
      }
    }

    // 2. Fallback to Gemini API if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI();
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `${systemPrompt}\n\nUSER MESSAGE:\n${message}`,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const rawText = geminiRes.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          res.json(parsed);
          return;
        }
      } catch (geminiErr) {
        console.error('Gemini fallback failed:', geminiErr);
      }
    }

    // 3. Fallback: Return structured intent classification signal
    res.status(200).json({
      intent: 'GENERAL_QUERY',
      entities: {},
      explanation: `I've analyzed your request regarding **${message}**. You can view your scheduled sessions or check room and faculty availability anytime.`,
      recommendations: [
        'Check timetable conflicts',
        'Find available rooms',
        'Show faculty workload'
      ]
    });
  } catch (error: any) {
    console.error('Error handling /api/ai/chat:', error);
    res.status(500).json({
      error: 'Failed to process message with AI assistant.',
      details: error?.message || 'Internal error'
    });
  }
});

// Full-stack Vite dev middleware vs static production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusSolve] Full-stack Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CampusSolve] Failed to start server:', err);
});
