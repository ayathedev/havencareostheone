import express from "express";
import path from "path";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'amiable-vent-483513-m6'
  });
}
const db = getFirestore();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Background Sync Logic for Resource Hub
async function performPartnershipSync() {
  console.log(`[SYNC] Starting Resource Hub sync at ${new Date().toISOString()}`);
  try {
    const partnershipsRef = db.collectionGroup('partnerships');
    // Find active partnerships that might be outdated
    const snapshot = await partnershipsRef.where('sync', '==', 'Active').get();
    
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    
    let updatedCount = 0;
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Handle different timestamp formats
      const createdAt = data.createdAt?.toDate?.()?.getTime() || 
                        (data.createdAt?._seconds ? data.createdAt._seconds * 1000 : 0) || 
                        data.createdAt || 0;
      
      if (createdAt && (now - createdAt > sevenDaysInMs)) {
        batch.update(doc.ref, { 
          sync: 'Outdated',
          lastBackgroundCheck: FieldValue.serverTimestamp(),
          statusNote: 'Marked as outdated by background sync process.'
        });
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
    }
    console.log(`[SYNC] Completed. Updated ${updatedCount} partnerships.`);
  } catch (error) {
    console.error("[SYNC] Error during partnership sync:", error);
  }
}

// Run every 24 hours
setInterval(performPartnershipSync, 24 * 60 * 60 * 1000);

// Admin trigger endpoint
app.post("/api/admin/sync-resources", async (req, res) => {
  // Simple auth check could be added here
  await performPartnershipSync();
  res.json({ success: true, message: "Sync process triggered" });
});

// Initialize Gemini
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper: Normalize model names to current supported standards
function normalizeModelName(rawModel?: string): string {
  // If no model provided, use the default recommended by skill
  if (!rawModel) return 'gemini-3.7-flash';
  
  // Map legacy/common names to latest supported aliases
  if (rawModel === 'gemini-3.5-flash' || rawModel === 'gemini-1.5-flash' || rawModel === 'gemini-2.0-flash' || rawModel === 'gemini-1.5-pro' || rawModel === 'gemini-2.0-pro' || rawModel === 'gemini-3-flash') {
    return 'gemini-3.7-flash';
  }
  return rawModel;
}

// Helper: Detect transient high-demand / quota / server errors that benefit from retry or fallback
function isTransientGeminiError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code || error.error?.code;
  const message = (error.message || error.error?.message || JSON.stringify(error)).toLowerCase();
  
  // Standard HTTP/GRPC codes for retryable issues
  if (status === 429 || status === 503 || status === 500 || status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED') {
    return true;
  }
  
  // String matching for common quota/rate limit phrases
  const retryablePhrases = [
    'high demand',
    'unavailable',
    'overloaded',
    'rate limit',
    'quota',
    'temporarily',
    'econnreset',
    'fetch failed',
    'resource exhausted'
  ];
  
  return retryablePhrases.some(phrase => message.includes(phrase));
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeWithRetryAndFallback<T>(
  preferredModel: string,
  operation: (model: string) => Promise<T>
): Promise<T> {
  const normalizedPrimary = normalizeModelName(preferredModel);
  
  // Build a fallback chain. We use models allowed by the gemini-api skill.
  const modelChain = Array.from(new Set([
    normalizedPrimary,
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-3.1-pro-preview' 
  ]));

  let lastError: any = null;

  for (let mIdx = 0; mIdx < modelChain.length; mIdx++) {
    const currentModel = modelChain[mIdx];
    
    // Try up to 2 attempts per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await operation(currentModel);
      } catch (error: any) {
        lastError = error;
        
        // Extract retry delay from error if present (common in 429s)
        let backoffMs = 1000 * attempt; // Default exponential backoff
        
        try {
          // Some errors include a specific retry delay in the message or details
          const errorStr = JSON.stringify(error);
          const match = errorStr.match(/retry in ([\d.]+)s/i);
          if (match && match[1]) {
            backoffMs = (parseFloat(match[1]) * 1000) + 100; // Add 100ms buffer
          }
        } catch (e) {
          // ignore parsing error
        }

        console.warn(`[Gemini API] Attempt ${attempt} failed with model ${currentModel}. Status: ${error.status}. Retrying in ${backoffMs}ms...`);
        
        if (isTransientGeminiError(error)) {
          if (attempt === 1) {
            await sleep(backoffMs);
            continue;
          }
          // On second failure, move to next model in chain
          break;
        } else {
          // Non-transient error (e.g. invalid prompt), don't bother retrying
          throw error;
        }
      }
    }
    // Brief pause before trying next fallback model
    await sleep(500);
  }

  throw lastError;
}

// AI Endpoints
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, model = "gemini-3.7-flash", config } = req.body;
    
    const response = await executeWithRetryAndFallback(model, async (activeModel) => {
      return await genAI.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: config || undefined
      });
    });

    res.json({ 
      text: response.text, 
      functionCalls: response.functionCalls,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata 
    });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(503).json({ 
      error: error?.message || "The AI model is temporarily experiencing high demand. Please retry in a few moments." 
    });
  }
});

app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, systemInstruction, tools, model = "gemini-3.7-flash" } = req.body;
    
    // Map history to @google/genai format if needed
    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const result = await executeWithRetryAndFallback(model, async (activeModel) => {
      const chat = genAI.chats.create({
        model: activeModel,
        config: {
          systemInstruction,
          tools: tools ? tools : undefined
        },
        history: formattedHistory
      });

      return await chat.sendMessage({ message });
    });

    res.json({ 
      text: result.text,
      functionCalls: result.functionCalls
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(503).json({ 
      error: error?.message || "Haven AI is temporarily experiencing high demand. Please try again shortly." 
    });
  }
});

// Vite Middleware
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Haven OS Server running on http://localhost:${PORT}`);
  });
});
