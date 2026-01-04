import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const { createClient } = await import('~/utils/supabase/route')
    const supabase = createClient()

    const bucketName = 'bill-uploads' // Define your Supabase storage bucket name

    // Upload file to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`${Date.now()}_${file.name}`, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage.' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    // TODO: Integrate Gemini Vision for OCR.
    return NextResponse.json({
      message: 'File uploaded successfully.',
      fileName: file.name,
      publicUrl: publicUrlData.publicUrl,
    })

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

