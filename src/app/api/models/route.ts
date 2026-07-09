import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/crypto';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get('credentialId');

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: cred, error } = await supabase
      .from('credentials')
      .select('type, encrypted_data')
      .eq('id', credentialId)
      .single();

    if (error || !cred) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const apiKey = decrypt(cred.encrypted_data);

    if (cred.type === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch OpenAI models. Is the key valid?' }, { status: res.status });
      }
      const data = await res.json();
      // Filter out non-chat models
      const models = data.data
        .filter((m: any) => 
          m.id.startsWith('gpt-') && 
          !m.id.includes('audio') && 
          !m.id.includes('realtime') && 
          !m.id.includes('instruct')
        )
        .map((m: any) => m.id)
        .sort();
      return NextResponse.json({ models });
    } 
    else if (cred.type === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      if (!res.ok) {
        console.warn(`Anthropic models API failed with status ${res.status}. Falling back to hardcoded list.`);
        const fallbackModels = [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
        return NextResponse.json({ models: fallbackModels });
      }
      const data = await res.json();
      const models = data.data
        .filter((m: any) => m.type === 'model' && m.id.startsWith('claude-'))
        .map((m: any) => m.id)
        .sort();
      return NextResponse.json({ models });
    }
    else if (cred.type === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch Gemini models. Is the key valid?' }, { status: res.status });
      }
      const data = await res.json();
      const models = (data.models || [])
        .filter((m: any) => 
          m.name.includes('gemini') && 
          m.supportedGenerationMethods?.includes('generateContent') &&
          !m.name.includes('vision')
        )
        .map((m: any) => m.name.replace('models/', ''))
        .sort();
      return NextResponse.json({ models });
    }
    else {
      return NextResponse.json({ error: 'Unsupported credential type for dynamic models' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Models GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
