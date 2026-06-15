import { NextResponse } from 'next/server';

function formatPhoneForGreenAPI(phone: string) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  } else if (!cleaned.startsWith('972')) {
    cleaned = '972' + cleaned;
  }
  return `${cleaned}@c.us`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  const idInstance = process.env.GREENAPI_ID_INSTANCE;
  const apiTokenInstance = process.env.GREENAPI_API_TOKEN_INSTANCE;

  if (!idInstance || !apiTokenInstance) {
    return NextResponse.json({ error: 'GreenAPI credentials not configured' }, { status: 500 });
  }

  const chatId = formatPhoneForGreenAPI(phone);

  try {
    const response = await fetch(`https://api.greenapi.com/waInstance${idInstance}/getChatHistory/${apiTokenInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, count: 50 }),
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`GreenAPI Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const idInstance = process.env.GREENAPI_ID_INSTANCE;
    const apiTokenInstance = process.env.GREENAPI_API_TOKEN_INSTANCE;

    if (!idInstance || !apiTokenInstance) {
      return NextResponse.json({ error: 'GreenAPI credentials not configured' }, { status: 500 });
    }

    const chatId = formatPhoneForGreenAPI(phone);

    const response = await fetch(`https://api.greenapi.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    });

    if (!response.ok) {
      throw new Error(`GreenAPI Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
