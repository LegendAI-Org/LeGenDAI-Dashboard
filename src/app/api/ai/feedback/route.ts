import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { lead, previousAnalysis, previousDraft, isRelevant, feedbackText } = await req.json();

    if (!lead || !feedbackText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const clientId = lead.client_id;
    if (!clientId) {
      return NextResponse.json({ error: 'Missing client_id on lead data. Cannot save feedback.' }, { status: 400 });
    }

    // 1. Fetch current AI Memory
    let aiMemory = '';
    try {
      const { data: memoryData } = await supabase
        .from('ai_memory')
        .select('memory_md')
        .eq('client_id', clientId)
        .single();
      
      if (memoryData) {
        aiMemory = memoryData.memory_md;
      }
    } catch (e) {
      // Ignore if doesn't exist
    }

    // 2. Ask Gemini to update the memory
    const systemInstruction = `You are a memory manager for an AI sales agent. 
You are given the CURRENT memory document, the previous interaction (lead data, AI's draft), and the USER'S FEEDBACK.
Your task is to update the memory document to incorporate the user's feedback as a new rule or guideline, so the AI doesn't make the same mistake again.
Return the updated memory document in Markdown format. Keep it concise, organized, and actionable. Do not return anything except the raw markdown.`;

    const prompt = `CURRENT MEMORY DOCUMENT:
${aiMemory || "No existing memory."}

---
PREVIOUS INTERACTION:
Lead Data: ${JSON.stringify(lead)}
AI's Previous Draft: ${previousDraft}
Was it relevant? ${isRelevant ? 'Yes' : 'No'}

USER FEEDBACK:
${feedbackText}
---

Please provide the updated MEMORY DOCUMENT (in Hebrew, since the agent operates in Hebrew). Add the new rule logically to the existing rules.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    const updatedMemory = response.text?.replace(/```markdown|```/g, '').trim() || '';

    // 3. Save the new memory to Supabase
    // Using upsert based on client_id
    const { error: upsertError } = await supabase
      .from('ai_memory')
      .upsert({
        client_id: clientId,
        memory_md: updatedMemory,
        updated_at: new Date().toISOString()
      }, { onConflict: 'client_id' });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ success: true, newMemory: updatedMemory });
  } catch (error: any) {
    console.error('Error in feedback API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
