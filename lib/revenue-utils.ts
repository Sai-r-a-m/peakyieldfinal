export interface RevenueBreakdown {
  rooms: number;
  currentPrice: number;
  recommendedPrice: number;
  currentOccupancy: number;
  expectedOccupancy: number;
  elasticityNote: string;
  currentRevenuePerNight: number;
  projectedRevenuePerNight: number;
  extraPerNight: number;
  extraPerWeek: number;
  steps: string[];
}

export function estimateRevenueImpact({
  currentPrice,
  recommendedPrice,
  occupancy,
  rooms = 50,
}: {
  currentPrice: number;
  recommendedPrice: number;
  occupancy: number;
  rooms?: number;
}): RevenueBreakdown {
  const currentRevenue = currentPrice * (occupancy / 100) * rooms;

  let expectedOccupancy = occupancy;
  let elasticityNote = '';

  if (recommendedPrice < currentPrice) {
    // Price elasticity: lower price → more bookings
    expectedOccupancy = Math.min(occupancy + 15, 100);
    elasticityNote = `Price drops $${currentPrice - recommendedPrice} → occupancy estimate +15pp (${occupancy}% → ${expectedOccupancy}%)`;
  } else if (recommendedPrice > currentPrice) {
    // Price elasticity: higher price → fewer bookings
    expectedOccupancy = Math.max(occupancy - 8, 40);
    elasticityNote = `Price rises $${recommendedPrice - currentPrice} → occupancy estimate -8pp (${occupancy}% → ${expectedOccupancy}%)`;
  } else {
    elasticityNote = 'Price unchanged — occupancy held constant';
  }

  const projectedRevenue = recommendedPrice * (expectedOccupancy / 100) * rooms;
  const extraPerNight = projectedRevenue - currentRevenue;
  const extraPerWeek = extraPerNight * 7;

  const fmt = (n: number) =>
    (n >= 0 ? '+' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

  return {
    rooms,
    currentPrice,
    recommendedPrice,
    currentOccupancy: occupancy,
    expectedOccupancy,
    elasticityNote,
    currentRevenuePerNight: Math.round(currentRevenue),
    projectedRevenuePerNight: Math.round(projectedRevenue),
    extraPerNight: Math.round(extraPerNight),
    extraPerWeek: Math.round(extraPerWeek),
    steps: [
      `Current:    $${currentPrice} × ${occupancy}% occ × ${rooms} rooms = $${Math.round(currentRevenue).toLocaleString('en-US')}/night`,
      elasticityNote,
      `Projected:  $${recommendedPrice} × ${expectedOccupancy}% occ × ${rooms} rooms = $${Math.round(projectedRevenue).toLocaleString('en-US')}/night`,
      `Per night:  ${fmt(extraPerNight)}`,
      `Per week:   ${fmt(extraPerWeek)} (${fmt(extraPerNight)} × 7 nights)`,
    ],
  };
}
