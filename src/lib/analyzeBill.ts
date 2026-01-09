import { GoogleGenerativeAI } from '@google/generative-ai';
import { LineItem } from '~/lib/parseBill'; // Assuming LineItem interface is exported from parseBill.ts

export interface BillFlag {
  item_index: number; // Index of the line item in the parsed_bills array
  type: 'DUPLICATE_CHARGE' | 'VAGUE_DESCRIPTION' | 'TEMPORAL_INCONSISTENCY' | 'ILLOGICAL_COMBINATION';
  explanation: string; // Human-readable explanation
}

export async function analyzeBill(billId: string, lineItems: LineItem[], rawText: string): Promise<BillFlag[]> {
  const flags: BillFlag[] = [];

  // --- a) Duplicate charges (same description + date + amount) ---
  const seenItems = new Map<string, number[]>(); // Key: stringified item, Value: array of indices
  lineItems.forEach((item, index) => {
    const itemKey = JSON.stringify({ description: item.description, date: item.date, amount: item.amount });
    if (seenItems.has(itemKey)) {
      seenItems.get(itemKey)?.forEach(prevIndex => {
        flags.push({
          item_index: prevIndex,
          type: 'DUPLICATE_CHARGE',
          explanation: `Charge '${item.description}' with amount $${item.amount} (and date ${item.date || 'N/A'}) appears to be duplicated.`
        });
      });
      flags.push({
        item_index: index,
        type: 'DUPLICATE_CHARGE',
        explanation: `Charge '${item.description}' with amount $${item.amount} (and date ${item.date || 'N/A'}) appears to be duplicated.`
      });
    } else {
      seenItems.set(itemKey, [index]);
    }
  });

  // Remove duplicate flags if an item appears more than twice
  const uniqueFlags: BillFlag[] = [];
  const flagKeys = new Set<string>();
  flags.forEach(flag => {
    const key = `${flag.item_index}-${flag.type}-${flag.explanation}`;
    if (!flagKeys.has(key)) {
      uniqueFlags.push(flag);
      flagKeys.add(key);
    }
  });
  flags.splice(0, flags.length, ...uniqueFlags); // Replace with unique flags

  // --- b) Vague or ambiguous descriptions (low-information terms) ---
  const vagueTerms = ['services', 'miscellaneous', 'other', 'consultation', 'treatment', 'medical supplies']; // Example terms
  lineItems.forEach((item, index) => {
    const lowerDescription = item.description.toLowerCase();
    if (vagueTerms.some(term => lowerDescription.includes(term))) {
      flags.push({
        item_index: index,
        type: 'VAGUE_DESCRIPTION',
        explanation: `The description '${item.description}' is vague and could benefit from more detail.`
      });
    }
  });

  // --- c) Temporal inconsistencies (charges dated outside the visit window, if dates exist) ---
  // This is a placeholder. A real implementation would require a 'visit_date' or 'service_period'
  // to be extracted during parsing. For now, it will look for very old dates as a simple example.
  const currentYear = new Date().getFullYear();
  lineItems.forEach((item, index) => {
    if (item.date) {
      try {
        const itemDate = new Date(item.date);
        if (itemDate.getFullYear() < currentYear - 5) { // Example: charge older than 5 years
          flags.push({
            item_index: index,
            type: 'TEMPORAL_INCONSISTENCY',
            explanation: `Charge '${item.description}' has a very old date (${item.date}) which might be inconsistent.`
          });
        }
      } catch (e) {
        // Ignore invalid dates
      }
    }
  });

  // --- d) Illogical procedure combinations using Gemini TEXT (pattern identification) ---
  // This uses Gemini TEXT to identify potentially illogical combinations based on a general prompt.
  // It's not performing medical diagnosis, but rather looking for common-sense oddities
  // as explicitly constrained.
  if (lineItems.length > 1 && process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using gemini-2.5-flash for text tasks

      const itemDescriptions = lineItems.map(item => item.description).join(', ');
      const prompt = `Review the following medical billing line item descriptions and identify any combinations that seem unusually illogical or out of place from a common-sense perspective. Do not provide medical advice or pricing information. Just identify strange combinations. Provide a brief, human-readable reason. For example, \"Tooth extraction and brain surgery in the same visit might be illogical.\"\n\n      Line items: ${itemDescriptions}\n\n      Illogical combinations identified:`;

      const result = await model.generateContent(prompt);
      const geminiResponse = result.response.text();

      if (geminiResponse && geminiResponse.trim() !== 'No illogical combinations identified.') {
        // Simple heuristic: if Gemini returns a non-trivial response, flag the whole bill
        // A more sophisticated approach would involve parsing Gemini's response to link to specific item_indices.
        flags.push({
          item_index: -1, // -1 indicates it's a bill-level flag, not tied to a specific line item
          type: 'ILLOGICAL_COMBINATION',
          explanation: `Potential illogical procedure combinations identified by AI: ${geminiResponse.trim()}`
        });
      }
    } catch (geminiError) {
      console.error('Gemini TEXT analysis for illogical combinations failed:', geminiError);
      // Do not fail the entire analysis if Gemini TEXT fails
    }
  }
  // TODO: Add more sophisticated logic for filtering duplicate flags from different detection methods
  // For example, if a "VAGUE_DESCRIPTION" is also a "DUPLICATE_CHARGE", it might be better to show one primary flag.

  return flags;
}


