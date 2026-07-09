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

// DELETE /api/credentials - Delete a credential
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Credentials DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/credentials - Rename a credential
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data, error } = await supabase
      .from('credentials')
      .update({ name })
      .eq('id', id)
      .select('id, name, type, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Credentials PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
