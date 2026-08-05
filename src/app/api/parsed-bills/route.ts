import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log("Parsed Bills API route accessed.");
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

    const { data: parsedBills, error: parsedError } = await supabase
      .from('parsed_bills')
      .select('line_items')
      .eq('bill_id', bill_id)
      .single();

    if (parsedError || !parsedBills) {
      console.error('Error fetching parsed bills:', parsedError);
      return NextResponse.json({ error: 'Parsed bills not found.' }, { status: 404 });
    }

    return NextResponse.json(parsedBills.line_items);

  } catch (error) {
    console.error('Error in parsed bills API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

