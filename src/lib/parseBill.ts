export interface LineItem {
  description: string;
  date?: string; // Optional date
  amount: number;
}

export function parseBillText(rawText: string): LineItem[] {
  let lineItems: LineItem[] = [];

  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let inChargesSection = false;
  let headerSkipped = false;
  const summaryKeywords = [
    "subtotal",
    "insurance", // "Insurance Adjustment"
    "patient responsibility",
    "total",
    "amount due",
  ];

  // Strict date regex for YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const lowerLine = currentLine.toLowerCase();

    // Step 1: Only start parsing after locating the line "Charges"
    if (!inChargesSection) {
      if (lowerLine === "charges") {
        inChargesSection = true;
        console.log("Parser: Found 'Charges' section.");
      }
      continue; 
    }

    // Step 2: Skip the next 5 lines as headers after "Charges" is found
    if (inChargesSection && !headerSkipped) {
      if (i + 4 < lines.length) { 
        console.log(`Parser: Skipping 5 header lines (from index ${i} to ${i+4}). First line: "${lines[i]}"`);
        i += 4; 
        headerSkipped = true;
        continue;
      } else {
        console.log("Parser: Not enough lines to skip 5 headers after 'Charges'. Aborting parsing.");
        break; 
      }
    }

    // --- Main Parsing Logic ---

    // Check for summary keywords at the current line itself, regardless of format
    if (summaryKeywords.some(keyword => lowerLine.includes(keyword))) {
      console.log(`Parser: Stopping parsing at summary line: "${currentLine}"`);
      break; 
    }

    // Attempt to parse as single-line pipe-delimited item first
    if (currentLine.includes('|')) {
      const parts = currentLine.split('|').map(p => p.trim());
      // Expecting at least description, date, qty, unit price, amount, so 5 parts.
      if (parts.length >= 5) {
        const description = parts[0];
        const dateCandidate = parts[1];
        const amountString = parts[4];

        const date = dateRegex.test(dateCandidate) ? dateCandidate : undefined;
        const amount = parseFloat(amountString.replace(/[^\d.]/g, ''));

        if (description.length > 0 && date && !isNaN(amount)) {
          lineItems.push({
            description: description,
            date: date,
            amount: amount,
          });
          console.log(`Parser: Parsed single-line delimited item: ${JSON.stringify(lineItems[lineItems.length - 1])}`);
          continue; 
        } else {
          console.log(`Parser: Skipping single-line delimited block due to invalid data: "${currentLine}"`);
          // Continue to next line; for loop handles i++
          continue;
        }
      }
    }

    // If not a single-line delimited item, try to parse as a 5-line block
    if (i + 4 < lines.length) {
      const description = lines[i];
      const dateCandidate = lines[i + 1];
      const amountString = lines[i + 4]; // The amount is the 5th line in the block

      const date = dateRegex.test(dateCandidate) ? dateCandidate : undefined;
      const amount = parseFloat(amountString.replace(/[^\d.]/g, ''));

      if (description.length > 0 && date && !isNaN(amount)) {
        lineItems.push({
          description: description,
          date: date,
          amount: amount,
        });
        console.log(`Parser: Parsed 5-line block item: ${JSON.stringify(lineItems[lineItems.length - 1])}`);
        i += 4; // Move index to the last line of the current block (amount line)
      } else {
        console.log(`Parser: Skipping 5-line block due to invalid data: description="${description}", date="${dateCandidate}", amount="${amountString}". Advancing by 1 line.`);
        // The outer loop's i++ will handle advancing by one line.
      }
    } else {
      console.log(`Parser: Reached end of document or insufficient lines for a 5-line block starting at: "${currentLine}"`);
    }
  }

  return lineItems;
}
