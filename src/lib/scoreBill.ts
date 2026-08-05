import { BillFlag } from '~/lib/analyzeBill'; // Assuming BillFlag interface is exported from analyzeBill.ts

export interface FairnessBreakdown {
  initial_score: number;
  deductions: {
    DUPLICATE_CHARGE?: { count: number; points_deducted: number };
    VAGUE_DESCRIPTION?: { count: number; points_deducted: number };
    TEMPORAL_INCONSISTENCY?: { count: number; points_deducted: number };
    ILLOGICAL_COMBINATION?: { count: number; points_deducted: number };
  };
  final_score: number;
}

export interface FairnessScore {
  score: number;
  breakdown: FairnessBreakdown;
}

export function analyzeFairness(billId: string, flags: BillFlag[]): FairnessScore {
  let score = 100;
  const deductions: FairnessBreakdown['deductions'] = {};

  const deductionRates = {
    DUPLICATE_CHARGE: 30,
    VAGUE_DESCRIPTION: 15,
    TEMPORAL_INCONSISTENCY: 20,
    ILLOGICAL_COMBINATION: 10,
  };

  // Count flags and apply deductions
  const flagCounts: { [key in BillFlag['type']]?: number } = {};
  flags.forEach(flag => {
    flagCounts[flag.type] = (flagCounts[flag.type] || 0) + 1;
  });

  for (const flagType in deductionRates) {
    const type = flagType as BillFlag['type'];
    const count = flagCounts[type] || 0;
    if (count > 0) {
      const pointsDeducted = count * deductionRates[type];
      score -= pointsDeducted;
      deductions[type] = { count, points_deducted: pointsDeducted };
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  const breakdown: FairnessBreakdown = {
    initial_score: 100,
    deductions: deductions,
    final_score: score,
  };

  return { score, breakdown };
}


