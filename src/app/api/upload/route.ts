import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { parseBillText, LineItem } from '~/lib/parseBill' // Import parsing utility
import { analyzeBill, BillFlag } from '~/lib/analyzeBill' // Import analysis utility
import { analyzeFairness, FairnessScore } from '~/lib/scoreBill' // Import scoring utility

export async function POST(request: NextRequest) {
  console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY); // Added log
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const bucketName = 'bill-uploads'
    const filePath = `${Date.now()}_${file.name}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
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

    // Insert a row into the 'bills' table
    const { data: billData, error: insertError } = await supabase
      .from('bills')
      .insert({
        filename: file.name,
        storage_path: uploadData.path,
        status: 'uploaded',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to record bill in database.' },
        { status: 500 }
      )
    }

    console.log('Bill record inserted. Bill ID:', billData.id)

    // --- Gemini Vision OCR Integration ---
    let rawText = ''
    let confidence: number | null = null
    let ocrAttempted = false
    let ocrSuccessful = false // Flag to track OCR success

    const maxRetries = 3;
    let retries = 0;
    let delay = 1500; // Initial delay of 1.5 seconds

    while (retries < maxRetries) {
      try {
        ocrAttempted = true;
        console.log(`Attempting Gemini Vision OCR (Attempt ${retries + 1}/${maxRetries})...`);

        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is not set.');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Convert file to Buffer and then to Base64 for Gemini Vision
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        const imagePart = {
          inlineData: {
            data: base64Image,
            mimeType: file.type,
          },
        };

        const result = await model.generateContent([
          'Extract all text from this medical bill.', // Simple prompt for OCR
          imagePart,
        ]);

        const response = result.response;
        rawText = response.text(); // Extract raw text
        console.log('OCR COMPLETED'); // Updated log
        ocrSuccessful = true; // OCR was successful
        break; // Exit retry loop on success

      } catch (ocrError: any) {
        console.error(`Gemini Vision OCR process failed (Attempt ${retries + 1}):`, ocrError);

        if (ocrError.status === 503 && retries < maxRetries - 1) {
          console.log(`Gemini overloaded (HTTP 503), retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          delay *= 2; // Exponential backoff
        } else {
          // Hard error or max retries reached for 503
          ocrSuccessful = false;
          break; // Exit retry loop
        }
      }
    }

    // Store OCR results in ocr_results table (only if OCR was successful)
    if (ocrSuccessful) {
      // TODO: Implement actual confidence extraction if Gemini Vision provides it in a structured way.
      // For now, setting a placeholder confidence.
      confidence = 1.0; // Placeholder
      console.log('Raw text length:', rawText.length);
      console.log('OCR confidence:', confidence);

      const { error: ocrInsertError } = await supabase.from('ocr_results').insert({
        bill_id: billData.id,
        raw_text: rawText,
        confidence: confidence,
      });

      if (ocrInsertError) {
        console.error('Supabase OCR results insert error:', ocrInsertError);
        ocrSuccessful = false; // If insert fails, OCR is not fully "successful"
      }
    }

    // --- End Gemini Vision OCR Integration ---

    // --- Parsing Integration ---
    let parsedSuccessful = false; // Flag to track parsing success
    let parsedLineItems: LineItem[] = [];

    if (ocrSuccessful && rawText) {
      try {
        console.log('Attempting to parse OCR text...');
        parsedLineItems = parseBillText(rawText);
        console.log('OCR text parsing successful.');
        parsedSuccessful = true;

        // Insert parsed line items into parsed_bills table
        const { error: parsedInsertError } = await supabase.from('parsed_bills').insert({
          bill_id: billData.id,
          line_items: parsedLineItems,
        });

        if (parsedInsertError) {
          console.error('Supabase parsed bills insert error:', parsedInsertError);
          parsedSuccessful = false; // If insert fails, parsing is not fully "successful"
        }
      } catch (parseError) {
        console.error('OCR text parsing failed:', parseError);
        parsedSuccessful = false;
      }
    }
    // --- End Parsing Integration ---

    // --- Analysis Integration ---
    let analysisSuccessful = false; // Flag to track analysis success
    let analysisFlags: BillFlag[] = [];

    if (parsedSuccessful && parsedLineItems.length > 0) {
      try {
        console.log('Attempting to analyze parsed bill data...');
        analysisFlags = await analyzeBill(billData.id, parsedLineItems, rawText); // Pass rawText for potential Gemini TEXT usage
        console.log('Bill analysis successful.');
        analysisSuccessful = true;

        // Insert analysis results into analysis_results table
        const { error: analysisInsertError } = await supabase.from('analysis_results').insert({
          bill_id: billData.id,
          flags: analysisFlags,
        });

        if (analysisInsertError) {
          console.error('Supabase analysis results insert error:', analysisInsertError);
          analysisSuccessful = false; // If insert fails, analysis is not fully "successful"
        }
      } catch (analysisError) {
        console.error('Bill analysis failed:', analysisError);
        analysisSuccessful = false;
      }
    }
    // --- End Analysis Integration ---

    // --- Scoring Integration ---
    let scoringSuccessful = false;
    let fairnessScore: FairnessScore | null = null;

    if (analysisSuccessful && analysisFlags.length > 0) {
      try {
        console.log('Attempting to compute fairness score...');
        fairnessScore = analyzeFairness(billData.id, analysisFlags);
        console.log('Fairness score computation successful.');
        console.log('Fairness Score computed:', JSON.stringify(fairnessScore, null, 2));
        scoringSuccessful = true;

        // Insert scoring results into fairness_scores table
        const { error: scoringInsertError } = await supabase.from('fairness_scores').insert({
          bill_id: billData.id,
          score: fairnessScore.score,
          breakdown: fairnessScore.breakdown,
        });

        if (scoringInsertError) {
          console.error('Supabase scoring results insert error:', scoringInsertError);
          console.error('Scoring insert error details:', scoringInsertError);
          scoringSuccessful = false;
        }

      } catch (scoringError) {
        console.error('Fairness scoring failed:', scoringError);
        scoringSuccessful = false;
      }
    }
    // --- End Scoring Integration ---

    // Update bill status based on OCR, Parsing, Analysis, and Scoring success/failure
    let finalStatus = 'uploaded'; // Default status
    if (scoringSuccessful) {
      finalStatus = 'scored';
    } else if (analysisSuccessful) {
      finalStatus = 'analyzed';
    } else if (parsedSuccessful) {
      finalStatus = 'parsed';
    } else if (ocrSuccessful) {
      finalStatus = 'ocr_complete';
    } else if (ocrAttempted && !ocrSuccessful) {
      finalStatus = 'ocr_failed';
    }

    console.log(`Attempting to update bill status to ${finalStatus} for bill ID:`, billData.id);
    const { data: updateData, error: updateStatusError } = await supabase
      .from('bills')
      .update({ status: finalStatus })
      .eq('id', billData.id);

    if (updateStatusError) {
      console.error('Supabase bill status update error:', updateStatusError);
      console.error('Update error details:', updateStatusError);
    } else {
      console.log(`Bill status updated to ${finalStatus} for bill ID:`, billData.id);
      console.log('Update data:', updateData);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path)

    // TODO: Add comments for future scoring and dispute letter generation phases.
    return NextResponse.json({
      message: 'File uploaded, OCR, parsing, and analysis initiated.',
      fileName: file.name,
      publicUrl: publicUrlData.publicUrl,
      billId: billData.id,
      ocrStatus: ocrSuccessful ? 'complete' : 'failed',
      parsingStatus: parsedSuccessful ? 'complete' : 'failed',
      analysisStatus: analysisSuccessful ? 'complete' : 'failed',
      fairnessStatus: scoringSuccessful ? 'complete' : 'failed',
    })
  } catch (error) {
    console.error('Error in upload API route:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
