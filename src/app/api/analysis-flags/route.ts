import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log("Analysis Flags API route accessed.");
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

    const { data: analysisFlags, error: analysisError } = await supabase
      .from('analysis_results')
      .select('flags')
      .eq('bill_id', bill_id)
      .single();

    if (analysisError || !analysisFlags) {
      console.error('Error fetching analysis flags:', analysisError);
      return NextResponse.json({ error: 'Analysis flags not found.' }, { status: 404 });
    }

    return NextResponse.json(analysisFlags);

  } catch (error) {
    console.error('Error in analysis flags API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

