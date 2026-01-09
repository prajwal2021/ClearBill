import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BillFlag } from '~/lib/analyzeBill';
import { FairnessBreakdown } from '~/lib/scoreBill';

interface ChatRequest {
  bill_id: string;
  user_question: string;
}

// Helper function to generate explanations using Gemini Pro
async function generateExplanation(question: string, flags: BillFlag[], breakdown: FairnessBreakdown): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using gemini-2.5-flash for text generation

  const prompt = `You are a helpful assistant for ClearBill, a medical bill review tool.
Given the following user question, analysis flags, and fairness score breakdown for a medical bill, provide a clear, concise, and professional explanation.

User Question: "${question}"

Analysis Flags:
${JSON.stringify(flags, null, 2)}

Fairness Score Breakdown:
${JSON.stringify(breakdown, null, 2)}

Generate a very concise and structured explanation in markdown. Ensure the response is to the point and uses clear headings and bullet points for readability. DO NOT include introductory or concluding conversational phrases. Directly provide the explanation.

### Explanation:
- **Score Summary:** Briefly explain the final score (e.g., "Your fairness score of X is Y due to Z reasons.").
- **Flag Details:** For each flag type, use a bulleted list to explain why items were flagged, referencing the specific items and amounts if relevant.

Do NOT:
- Re-run any analysis.
- Add pricing validation.
- Make legal or fraud claims.
- Use external data (CMS, chargemaster, market rates).

Keep the tone calm, trustworthy, non-alarming, and professional. Format your response using markdown for readability, including bullet points or numbered lists where appropriate.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export async function POST(request: NextRequest) {
  console.log("Chat API route accessed.");
  try {
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid or missing JSON body. Please send bill_id and user_question." },
        { status: 400 }
      );
    }

    const { bill_id, user_question } = body;

    if (!bill_id || !user_question) {
      return NextResponse.json(
        { error: "Missing bill_id or user_question." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Generate explanation using Gemini Pro
    console.log('Generating explanation using Gemini Pro...');
    const explanation = await generateExplanation(user_question, flags, breakdown);
    console.log('Explanation generated.');

    return NextResponse.json({ explanation });

  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

