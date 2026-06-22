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

  // Clean phone number - remove all non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Build possible phone formats to search:
  // Supabase stores numbers as 972XXXXXXXXX (international format)
  // Dashboard may send 0XXXXXXXXX (local Israeli format)
  const phoneVariants: string[] = [cleanPhone];
  if (cleanPhone.startsWith('0')) {
    // Convert 0507... -> 972507...
    phoneVariants.push('972' + cleanPhone.slice(1));
  } else if (!cleanPhone.startsWith('972') && cleanPhone.length <= 10) {
    // Add 972 prefix directly
    phoneVariants.push('972' + cleanPhone);
  }

  try {
    // Query all phone formats at once to fetch both inbound and outbound messages
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .in('lead_phone', phoneVariants)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    const rows = data || [];

    // Format the response to match the frontend expectations
    // The frontend LeadModal currently expects an array of messages where:
    // { textMessage: string, senderId: string, timestamp: number }
    const formattedMessages = rows.map(msg => {
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
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // Normalize to Israeli international format (972XXXXXXXXX)
    const digits = phone.replace(/\D/g, '');
    let intlPhone: string;
    if (digits.startsWith('972')) {
      intlPhone = digits;
    } else if (digits.startsWith('0')) {
      intlPhone = '972' + digits.slice(1);
    } else {
      intlPhone = '972' + digits;
    }

    // GreenAPI credentials (Noga's instance)
    const instanceId = process.env.GREENAPI_ID_INSTANCE || '7107631046';
    const token = process.env.GREENAPI_API_TOKEN_INSTANCE;

    if (!token) {
      return NextResponse.json({ error: 'GreenAPI credentials not configured' }, { status: 500 });
    }

    // Send via GreenAPI
    const greenApiUrl = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
    const greenRes = await fetch(greenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${intlPhone}@c.us`,
        message: message
      })
    });

    const greenData = await greenRes.json();

    if (!greenRes.ok || greenData.error) {
      console.error('GreenAPI Error:', greenData);
      throw new Error(greenData.message || `GreenAPI Error: ${greenRes.status}`);
    }

    const messageId = greenData.idMessage || `local_${Date.now()}`;

    // Save outbound message to Supabase
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert([{
        lead_phone: intlPhone,
        message_id: messageId,
        direction: 'outbound',
        type: 'text',
        content: { body: message },
        status: 'sent'
      }]);

    if (dbError) {
      console.error('Error saving outbound message to Supabase:', dbError);
    }

    return NextResponse.json({ success: true, messageId, phone: intlPhone });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

