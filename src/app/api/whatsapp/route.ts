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

  // meta = המספר הרשמי, greenapi = המספר הישן. NULL היסטורי נחשב greenapi, כי כל
  // ההודעות שלפני הוספת העמודה הגיעו מהמספר הישן או תויגו ב-backfill.
  const channel = searchParams.get('channel');

  try {
    // Query all phone formats at once to fetch both inbound and outbound messages
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .in('lead_phone', phoneVariants)
      .eq('deleted_for_me', false);
    if (channel === 'meta') {
      query = query.eq('channel', 'meta');
    } else if (channel === 'greenapi') {
      query = query.or('channel.is.null,channel.eq.greenapi');
    }
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;
    const rows = data || [];

    // Format the response to match the frontend expectations
    // The frontend LeadModal currently expects an array of messages where:
    // { textMessage: string, senderId: string, timestamp: number }
    const formattedMessages = rows.map(msg => {
      // Support both content formats: {body: "..."} and {text: {body: "..."}}
      const bodyText = msg.deleted_for_everyone
        ? '🚫 הודעה זו נמחקה'
        : (msg.content?.body
          || msg.content?.text?.body
          || msg.content?.caption
          || (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)));

      return {
        id: msg.id,
        idMessage: msg.message_id || msg.id,
        typeMessage: 'textMessage', // Always set so the frontend renders it
        textMessage: bodyText,
        senderId: msg.direction === 'outbound' ? 'me' : cleanPhone,
        timestamp: msg.created_at && !isNaN(new Date(msg.created_at).getTime())
          ? new Date(msg.created_at).getTime() / 1000
          : Date.now() / 1000,
        direction: msg.direction,
        status: msg.status,
        type: msg.type,
        // A reaction row carries the wamid of the message it reacts to, so the thread
        // view can attach the emoji to the right bubble instead of showing a new one.
        reactionTo: msg.content?.reaction_to || null,
        deletedForEveryone: !!msg.deleted_for_everyone
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
    const { phone, message, reaction } = await request.json();

    if (!phone || (!message && !reaction)) {
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

    // Emoji reaction on a lead's message (WhatsApp long-press style). Cloud API only —
    // there is no GreenAPI fallback for reactions.
    if (reaction?.messageId) {
      if (!process.env.CRM_API_URL || !process.env.DASHBOARD_API_KEY) {
        return NextResponse.json({ error: 'CRM API is not configured' }, { status: 500 });
      }
      const crmRes = await fetch(`${process.env.CRM_API_URL}/api/noga/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: intlPhone,
          message_id: reaction.messageId,
          emoji: reaction.emoji || '',
          key: process.env.DASHBOARD_API_KEY,
        }),
      });
      const crmData = await crmRes.json().catch(() => ({}));
      if (crmRes.ok && crmData.status === 'sent') {
        return NextResponse.json({ success: true, via: 'cloud-api' });
      }
      const reason = crmData?.detail || `CRM responded ${crmRes.status}`;
      return NextResponse.json({ error: `התגובה נכשלה: ${reason}` }, { status: 502 });
    }

    // Preferred path: the CRM backend, which sends through Meta's official Cloud API.
    // It also applies the central send guard (opt-out registry, quiet hours) that this
    // route never had, and it logs the message itself — so we return right after it.
    // The GreenAPI path below stays as the fallback for deployments that have not been
    // pointed at the CRM yet; on Noga's banned number it can no longer deliver anything.
    if (process.env.CRM_API_URL && process.env.DASHBOARD_API_KEY) {
      const crmRes = await fetch(`${process.env.CRM_API_URL}/api/noga/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: intlPhone,
          text: message,
          key: process.env.DASHBOARD_API_KEY,
        }),
      });
      const crmData = await crmRes.json().catch(() => ({}));
      if (crmRes.ok && crmData.status === 'sent') {
        return NextResponse.json({ success: true, phone: intlPhone, via: 'cloud-api' });
      }
      const reason = crmData?.detail || `CRM responded ${crmRes.status}`;
      console.error('[WhatsApp] Cloud API send failed:', reason);
      return NextResponse.json({ error: `שליחה נכשלה: ${reason}` }, { status: 502 });
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

// Mirrors WhatsApp's own long-press menu: "delete for me" (hide from this
// dashboard only) or "delete for everyone" (also delete on WhatsApp itself —
// only possible for messages we sent, within GreenAPI's/WhatsApp's own time window).
export async function DELETE(request: Request) {
  try {
    const { id, scope } = await request.json();
    if (!id || (scope !== 'me' && scope !== 'everyone')) {
      return NextResponse.json({ error: 'id and scope ("me" | "everyone") are required' }, { status: 400 });
    }

    const { data: msg, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (scope === 'me') {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ deleted_for_me: true })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, scope: 'me' });
    }

    // scope === 'everyone': only our own sent messages can be deleted on WhatsApp itself
    if (msg.direction !== 'outbound') {
      return NextResponse.json({ error: 'ניתן למחוק "אצל כולם" רק הודעות ששלחת בעצמך' }, { status: 400 });
    }
    if (!msg.message_id) {
      return NextResponse.json({ error: 'להודעה זו אין מזהה וואטסאפ — אפשר למחוק רק "אצלי"' }, { status: 400 });
    }

    const instanceId = process.env.GREENAPI_ID_INSTANCE || '7107631046';
    const token = process.env.GREENAPI_API_TOKEN_INSTANCE;
    if (!token) {
      return NextResponse.json({ error: 'GreenAPI credentials not configured' }, { status: 500 });
    }

    const greenRes = await fetch(`https://api.green-api.com/waInstance${instanceId}/deleteMessage/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${msg.lead_phone}@c.us`, idMessage: msg.message_id })
    });
    const greenData = await greenRes.json().catch(() => ({}));

    if (!greenRes.ok || greenData.error) {
      console.error('GreenAPI deleteMessage error:', greenData);
      return NextResponse.json(
        { error: 'לא ניתן למחוק אצל כולם (ייתכן שחלון הזמן למחיקה חלף) — אפשר למחוק "אצלי" בלבד' },
        { status: 502 }
      );
    }

    const { error } = await supabase
      .from('whatsapp_messages')
      .update({ deleted_for_everyone: true })
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, scope: 'everyone' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

