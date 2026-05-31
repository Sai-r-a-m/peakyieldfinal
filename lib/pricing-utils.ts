export interface PricingFormula {
  marketAvg: number;
  stars: number;
  competitorCount: number;
  occupancyAdj: number;
  occupancyLabel: string;
  amenityAdj: number;
  amenityLines: string[];
  positionFactor: number;
  basePrice: number;
  aiMin: number;
  aiMax: number;
}

export function calculateBasePrice({
  marketAvg,
  stars,
  competitorCount,
  occupancy,
  breakfast,
  parking,
  cancellation,
}: {
  marketAvg: number;
  stars: number;
  competitorCount: number;
  occupancy: number;
  breakfast: boolean;
  parking: boolean;
  cancellation: boolean;
}): PricingFormula {
  // ── Occupancy tier ──────────────────────────────────────────────────────────
  let occupancyAdj: number;
  let occupancyLabel: string;

  if (occupancy >= 85) {
    occupancyAdj = 0.12;
    occupancyLabel = `${occupancy}% occupancy — high demand → +12%`;
  } else if (occupancy >= 70) {
    occupancyAdj = 0.06;
    occupancyLabel = `${occupancy}% occupancy — above average → +6%`;
  } else if (occupancy >= 50) {
    occupancyAdj = 0.00;
    occupancyLabel = `${occupancy}% occupancy — moderate → 0%`;
  } else if (occupancy >= 30) {
    occupancyAdj = -0.08;
    occupancyLabel = `${occupancy}% occupancy — below average → -8%`;
  } else {
    occupancyAdj = -0.15;
    occupancyLabel = `${occupancy}% occupancy — low demand → -15%`;
  }

  // ── Amenity premiums ─────────────────────────────────────────────────────────
  let amenityAdj = 0;
  const amenityLines: string[] = [];

  if (breakfast) {
    amenityAdj += 0.04;
    amenityLines.push('Breakfast included → +4%');
  }
  if (parking) {
    amenityAdj += 0.02;
    amenityLines.push('Free parking → +2%');
  }
  if (cancellation) {
    amenityAdj += 0.02;
    amenityLines.push('Free cancellation → +2%');
  }
  if (amenityLines.length === 0) {
    amenityLines.push('No premium amenities → +0%');
  }

  // ── Final formula ────────────────────────────────────────────────────────────
  const positionFactor = parseFloat((1 + occupancyAdj + amenityAdj).toFixed(4));
  const basePrice = Math.round(marketAvg * positionFactor);

  // AI is allowed to fine-tune ±10% from the base
  const aiMin = Math.round(basePrice * 0.90);
  const aiMax = Math.round(basePrice * 1.10);

  return {
    marketAvg,
    stars,
    competitorCount,
    occupancyAdj,
    occupancyLabel,
    amenityAdj,
    amenityLines,
    positionFactor,
    basePrice,
    aiMin,
    aiMax,
  };
}
