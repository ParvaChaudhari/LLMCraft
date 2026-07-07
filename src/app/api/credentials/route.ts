import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/crypto';

// GET /api/credentials - List all credentials
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    let query = supabase.from('credentials').select('id, name, type, created_at').order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Credentials GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/credentials - Create a new credential
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, apiKey } = body;

    if (!name || !type || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Encrypt the API key before storing it
    const encryptedData = encrypt(apiKey);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase
      .from('credentials')
      .insert([
        {
          name,
          type,
          encrypted_data: encryptedData
        }
      ])
      .select('id, name, type, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Credentials POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
