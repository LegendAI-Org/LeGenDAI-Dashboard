import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Setup Supabase admin client
// Env vars are set as NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_SERVICE_KEY in Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ||   // Our actual env var name
  process.env.SUPABASE_SERVICE_ROLE_KEY ||           // Alternative naming
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||            // Fallback to anon key
  '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('[WhatsApp API] Missing Supabase credentials! URL:', supabaseUrl ? 'set' : 'MISSING', 'Key:', supabaseServiceRoleKey ? 'set' : 'MISSING');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  // Clean phone number to ensure it matches format (no + sign, just numbers)
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_phone', cleanPhone)
      .order('created_at', { ascending: true }); // Get messages in chronological order

    if (error) throw error;

    // Format the response to match the frontend expectations
    // The frontend LeadModal currently expects an array of messages where:
    // { textMessage: string, senderId: string, timestamp: number }
    const formattedMessages = data.map(msg => {
      // Support both content formats: {body: "..."} and {text: {body: "..."}}
      const bodyText = msg.content?.body 
        || msg.content?.text?.body 
        || msg.content?.caption
        || (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
      
      return {
        idMessage: msg.message_id || msg.id,
        typeMessage: 'textMessage', // Always set so the frontend renders it
        textMessage: bodyText,
        senderId: msg.direction === 'outbound' ? 'me' : cleanPhone,
        timestamp: new Date(msg.created_at).getTime() / 1000,
        direction: msg.direction,
        status: msg.status
      };
    });

    return NextResponse.json(formattedMessages);
  } catch (error: any) {
    console.error('Error fetching chat history from Supabase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return NextResponse.json({ error: 'WhatsApp sending is temporarily disabled due to account restriction (Anti-Spam).' }, { status: 403 });
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    // Meta API Credentials
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp Cloud API credentials not configured' }, { status: 500 });
    }

    // 1. Send via Meta API
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: message }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta API Error:', data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || response.statusText}`);
    }

    // Extract the message ID provided by Meta
    const messageId = data.messages?.[0]?.id;

    // 2. Save the outbound message to Supabase
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert([{
        lead_phone: cleanPhone,
        message_id: messageId || `local_${Date.now()}`,
        direction: 'outbound',
        type: 'text',
        content: { text: { body: message } },
        status: 'sent'
      }]);

    if (dbError) {
      console.error('Error saving outbound message to Supabase:', dbError);
      // We don't throw here because the message was sent successfully
    }

    return NextResponse.json({ success: true, messageId });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
