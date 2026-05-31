export interface HotelSnapshot {
  id?: string;
  name?: string;
  city?: string;
  current_price?: number;
  propertyClass?: number;
  reviewScoreWord?: string;
  reviewScore?: number;
  reviewCount?: number;
  photoUrls?: string[];
  priceBreakdown?: {
    grossPrice?: {
      value?: number;
      amountRounded?: string;
    };
  };
}

export interface WeeklyPrice {
  day: string;
  price: number;
  reason: string;
}

export interface Recommendation {
  recommendedPrice: number;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  weeklyPricing?: WeeklyPrice[];
  pricingFormula?: {
    marketAvg: number;
    competitorCount: number;
    occupancyAdj: number;
    occupancyLabel: string;
    amenityAdj: number;
    amenityLines: string[];
    positionFactor: number;
    basePrice: number;
    aiMin: number;
    aiMax: number;
  };
  revenueBreakdown?: {
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
  };
}
