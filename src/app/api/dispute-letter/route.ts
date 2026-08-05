import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BillFlag } from '~/lib/analyzeBill';
import { FairnessBreakdown } from '~/lib/scoreBill';
import { LineItem } from '~/lib/parseBill';

interface DisputeLetterRequest {
  bill_id: string;
}

// Helper function to generate the dispute letter using Gemini Pro
async function generateDisputeLetter(billId: string, flags: BillFlag[], breakdown: FairnessBreakdown, lineItems: LineItem[], billMetadata: any): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using gemini-2.5-flash for text generation

  const prompt = `You are a helpful assistant for ClearBill, a medical bill review tool. Your task is to generate a professional, polite, and structured dispute letter based on the provided medical bill analysis data.

Bill Metadata: ${JSON.stringify(billMetadata, null, 2)}
Analysis Flags: ${JSON.stringify(flags, null, 2)}
Fairness Score Breakdown: ${JSON.stringify(breakdown, null, 2)}
Parsed Line Items: ${JSON.stringify(lineItems, null, 2)}

Instructions for letter generation:
- Address the letter to the "Billing Department" of the provider.
- Start with a polite greeting.
- Reference the bill date (if available in metadata) and provider name.
- Create a bullet or numbered list of concerns, explaining each detected issue (from Analysis Flags) in a human-readable and non-accusatory way.
  - Example for DUPLICATE_CHARGE: "It appears there may be a duplicate charge for a blood test on January 15, 2025, with an amount of $120. We kindly request clarification on this item."
  - Example for VAGUE_DESCRIPTION: "The charge for 'Hospital Services' lacks specific detail regarding the services provided. Could you please provide a more detailed description?"
- Conclude with a request for clarification or a corrected statement.
- End with a polite closing.

Key Constraints:
- Do NOT make legal claims or accuse fraud.
- Do NOT assert pricing unfairness or reference external pricing data.
- Do NOT give medical or legal advice.
- Do NOT make accusations.
- Keep the tone patient-friendly, professional, calm, and respectful.
- The letter should be solely based on the provided analysis data.

Generate the dispute letter now.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export async function POST(request: NextRequest) {
  console.log("Dispute Letter API route accessed.");
  try {
    let body: DisputeLetterRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or missing JSON body. Please send bill_id." },
        { status: 400 }
      );
    }

    const { bill_id } = body;

    if (!bill_id) {
      return NextResponse.json({ error: 'Missing bill_id.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch bill metadata
    const { data: billMetadata, error: billError } = await supabase
      .from('bills')
      .select('filename, uploaded_at') // You might expand this to include provider/date if available in your schema
      .eq('id', bill_id)
      .single();

    if (billError || !billMetadata) {
      console.error('Error fetching bill metadata:', billError);
      return NextResponse.json({ error: 'Could not retrieve bill metadata.' }, { status: 500 });
    }

    // Fetch analysis flags
    const { data: analysisData, error: analysisError } = await supabase
      .from('analysis_results')
      .select('flags')
      .eq('bill_id', bill_id)
      .single();

    if (analysisError || !analysisData) {
      console.error('Error fetching analysis results:', analysisError);
      return NextResponse.json({ error: 'Could not retrieve analysis flags for this bill.' }, { status: 500 });
    }
    const flags: BillFlag[] = analysisData.flags as BillFlag[];

    // Fetch fairness score breakdown
    const { data: scoringData, error: scoringError } = await supabase
      .from('fairness_scores')
      .select('breakdown')
      .eq('bill_id', bill_id)
      .single();

    if (scoringError || !scoringData) {
      console.error('Error fetching fairness scores:', scoringError);
      return NextResponse.json({ error: 'Could not retrieve fairness score for this bill.' }, { status: 500 });
    }
    const breakdown: FairnessBreakdown = scoringData.breakdown as FairnessBreakdown;

    // Fetch parsed line items
    const { data: parsedData, error: parsedError } = await supabase
      .from('parsed_bills')
      .select('line_items')
      .eq('bill_id', bill_id)
      .single();

    if (parsedError || !parsedData) {
      console.error('Error fetching parsed line items:', parsedError);
      return NextResponse.json({ error: 'Could not retrieve parsed line items for this bill.' }, { status: 500 });
    }
    const lineItems: LineItem[] = parsedData.line_items as LineItem[];

    // Generate dispute letter using Gemini Pro
    console.log('Generating dispute letter using Gemini Pro...');
    const letter = await generateDisputeLetter(bill_id, flags, breakdown, lineItems, billMetadata);
    console.log('Dispute letter generated.');

    return NextResponse.json({ letter });

  } catch (error) {
    console.error('Error in dispute letter API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

