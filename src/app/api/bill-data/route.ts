import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log("Bill Data API route accessed.");
  try {
    const { searchParams } = new URL(request.url);
    const bill_id = searchParams.get('bill_id');

    if (!bill_id) {
      return NextResponse.json({ error: 'Missing bill_id.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: billMetadata, error: billError } = await supabase
      .from('bills')
      .select('filename, uploaded_at')
      .eq('id', bill_id)
      .single();

    if (billError || !billMetadata) {
      console.error('Error fetching bill metadata:', billError);
      return NextResponse.json({ error: 'Bill metadata not found.' }, { status: 404 });
    }

    return NextResponse.json(billMetadata);

  } catch (error) {
    console.error('Error in bill data API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

