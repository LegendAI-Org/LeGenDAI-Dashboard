import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { lead, messages } = await req.json();

    if (!lead) {
      return NextResponse.json({ error: 'Missing lead data' }, { status: 400 });
    }

    // 1. Fetch AI Memory from Supabase (if exists)
    let aiMemory = '';
    try {
      if (lead.client_id) {
        const { data: memoryData, error: memoryError } = await supabase
          .from('ai_memory')
          .select('memory_md')
          .eq('client_id', lead.client_id)
          .single();
        
        if (!memoryError && memoryData) {
          aiMemory = memoryData.memory_md;
        }
      }
    } catch (e) {
      console.log('No ai_memory table found or error fetching memory', e);
    }

    // 2. Prepare context for Gemini
    const systemInstruction = `You are a top-tier sales agent and AI assistant for the company.
Your goal is to analyze the lead's data, read their WhatsApp history (if any), and provide a markdown response.

Format your response EXACTLY like this:
**ניתוח הליד:**
[Your brief analysis here]

**פעולה מומלצת:**
[Your actionable recommendation here]

**טיוטת וואטסאפ:**
[The draft message to send via whatsapp. Keep it natural, Israeli Hebrew, friendly and professional.]

Do NOT use JSON. Use only the markdown format above.

${aiMemory ? `\n--- LONG TERM MEMORY & GUIDELINES ---\n${aiMemory}\n-----------------------------------\n` : ''}`;

    const prompt = `Lead Data:
${JSON.stringify(lead, null, 2)}

WhatsApp History:
${JSON.stringify(messages || [], null, 2)}`;

    // 3. Call Gemini 2.5 Flash as a Stream
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: any) {
    console.error('Error in analyze API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
