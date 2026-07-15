import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    // Enforce 3MB limit (3 * 1024 * 1024 bytes)
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 3MB limit.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const originalName = file.name;
    const extension = originalName.includes('.') ? `.${originalName.split('.').pop()}` : '';
    const baseName = originalName.replace(extension, '');
    const uniqueFilename = `${baseName}-${Date.now()}${extension}`;

    const { data, error } = await supabase.storage
      .from('Library_Node')
      .upload(uniqueFilename, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('Library_Node')
      .getPublicUrl(uniqueFilename);

    return NextResponse.json({ 
      message: 'File uploaded successfully', 
      filePath: publicUrlData.publicUrl,
      fileName: originalName
    });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { fileUrl } = await request.json();
    if (!fileUrl) {
      return NextResponse.json({ error: 'No fileUrl provided' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials missing.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract the filename from the end of the public URL
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      return NextResponse.json({ error: 'Invalid fileUrl' }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from('Library_Node')
      .remove([filename]);

    if (error) {
      console.error('Supabase deletion error:', error);
      throw error;
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error in delete API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
