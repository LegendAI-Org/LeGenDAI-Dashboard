import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Setup Supabase admin client (since this is server-side and we need to bypass RLS for incoming webhooks)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_custom_verify_token_123'; // Make sure to set this in .env

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a WhatsApp status update or message
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            // It's a message
            for (const message of change.value.messages) {
              const phone = change.value.contacts?.[0]?.wa_id || message.from;
              
              const messageData = {
                lead_phone: phone,
                message_id: message.id,
                direction: 'inbound',
                type: message.type,
                content: message, // Store the raw message object
                status: 'received'
              };

              // Insert into Supabase
              const { error } = await supabase
                .from('whatsapp_messages')
                .insert([messageData]);

              if (error) {
                console.error('Error inserting WhatsApp message to Supabase:', error);
              }
            }
          } else if (change.value && change.value.statuses) {
            // It's a status update (sent, delivered, read)
            for (const status of change.value.statuses) {
              const { error } = await supabase
                .from('whatsapp_messages')
                .update({ status: status.status })
                .eq('message_id', status.id);
                
              if (error) {
                console.error('Error updating WhatsApp status in Supabase:', error);
              }
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
