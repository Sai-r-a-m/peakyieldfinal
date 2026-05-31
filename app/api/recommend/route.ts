import { NextResponse } from 'next/server';
import { estimateRevenueImpact } from '@/lib/revenue-utils';
import { calculateBasePrice } from '@/lib/pricing-utils';
import type { HotelSnapshot } from '@/lib/types';

interface RecommendRequest {
  hotelName: string;
  stars: number;
  currentPrice: number;
  occupancy: number;
  rooms?: number;
  breakfast: boolean;
  parking: boolean;
  cancellation: boolean;
  competitors?: HotelSnapshot[];
  currency?: { code: string; symbol: string; name: string };
}

export async function POST(request: Request) {
  const body = (await request.json()) as RecommendRequest;
  const {
    hotelName, stars, currentPrice, occupancy, rooms = 50,
    breakfast, parking, cancellation, competitors,
    currency = { code: 'USD', symbol: '$', name: 'US Dollar' },
  } = body;

  const sameStarCompetitors = (competitors || []).filter((h) => h.propertyClass === stars);

  const prices = sameStarCompetitors
    .map((h) => h.priceBreakdown?.grossPrice?.value || 0)
    .filter((p: number) => p > 0);

  const marketAvg = prices.length
    ? Math.round(prices.reduce((s: number, p: number) => s + p, 0) / prices.length)
    : Number(currentPrice);

  const marketMin = prices.length ? Math.min(...prices) : 0;
  const marketMax = prices.length ? Math.max(...prices) : 0;

  // ── Step 1: deterministic base price ─────────────────────────────────────────
  const pricingFormula = calculateBasePrice({
    marketAvg,
    stars,
    competitorCount: sameStarCompetitors.length,
    occupancy: Number(occupancy),
    breakfast,
    parking,
    cancellation,
  });

  const { basePrice, aiMin, aiMax } = pricingFormula;

  // ── Step 2: AI fine-tunes within the allowed range ───────────────────────────
  const sym = currency.symbol;

  const prompt = `
You are an expert hotel revenue manager.
All prices are in ${currency.name} (${sym}). Reference prices with the ${sym} symbol in your reasoning.

Our pricing algorithm has already set a base price of ${sym}${basePrice} for ${hotelName} (${stars} stars).

This base was calculated from:
- Market average of ${sameStarCompetitors.length} same-star competitors: ${sym}${marketAvg}
- Occupancy adjustment: ${pricingFormula.occupancyLabel}
- Amenity adjustments: ${pricingFormula.amenityLines.join(', ')}
- Position factor: ×${pricingFormula.positionFactor}

LIVE MARKET DATA:
- Market average: ${sym}${marketAvg}
- Market range: ${sym}${marketMin} – ${sym}${marketMax}
- Current hotel price: ${sym}${currentPrice}
- Current occupancy: ${occupancy}%

Top competitors:
${sameStarCompetitors.slice(0, 5).map((h) =>
  `- ${h.name}: ${h.priceBreakdown?.grossPrice?.amountRounded} (score: ${h.reviewScore})`
).join('\n')}

Your job: pick a FINAL recommended price between ${sym}${aiMin} and ${sym}${aiMax} (±10% of base).
Consider day-of-week demand patterns, competitive positioning, and review scores.
You MUST stay within ${sym}${aiMin}–${sym}${aiMax}.

Return ONLY this JSON — no markdown, no extra text:
{
  "recommendedPrice": <integer between ${aiMin} and ${aiMax}>,
  "reasoning": "<2-3 sentences: reference the base price, why you moved up or down within the range, and which competitors influenced you>",
  "urgency": "<low|medium|high>",
  "weeklyPricing": [
    {"day": "Monday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Tuesday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Wednesday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Thursday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Friday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Saturday", "price": <integer>, "reason": "<short reason>"},
    {"day": "Sunday", "price": <integer>, "reason": "<short reason>"}
  ]
}
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    const parsed = JSON.parse(text);

    // ── Step 3: hard clamp — AI cannot escape the range regardless of output ───
    const finalPrice = Math.min(aiMax, Math.max(aiMin, Math.round(Number(parsed.recommendedPrice))));

    // ── Step 4: transparent revenue math ─────────────────────────────────────
    const revenueBreakdown = estimateRevenueImpact({
      currentPrice: Number(currentPrice),
      recommendedPrice: finalPrice,
      occupancy: Number(occupancy),
      rooms: Number(rooms),
    });

    return NextResponse.json({
      ...parsed,
      recommendedPrice: finalPrice,
      pricingFormula,
      revenueBreakdown,
      currency,
    });

  } catch (error) {
    console.error('recommend error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
