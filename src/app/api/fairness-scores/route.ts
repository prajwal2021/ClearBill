import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  console.log("Fairness Scores API route accessed.");
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

    const { data: fairnessScores, error: scoringError } = await supabase
      .from('fairness_scores')
      .select('score, breakdown')
      .eq('bill_id', bill_id)
      .single();

    if (scoringError || !fairnessScores) {
      console.error('Error fetching fairness scores:', scoringError);
      return NextResponse.json({ error: 'Fairness scores not found.' }, { status: 404 });
    }

    return NextResponse.json(fairnessScores);

  } catch (error) {
    console.error('Error in fairness scores API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

