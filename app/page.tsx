'use client';
import AlertsPanel from "@/components/AlertsPanel";
import type { HotelSnapshot, Recommendation } from "@/lib/types";
import { useState } from 'react';

const STAR_COLORS: Record<number, string> = {
  2: 'text-gray-400',
  3: 'text-yellow-400',
  4: 'text-orange-400',
  5: 'text-emerald-400',
};

const STAR_BG: Record<number, string> = {
  2: 'bg-gray-800 border-gray-700',
  3: 'bg-yellow-950 border-yellow-800',
  4: 'bg-orange-950 border-orange-800',
  5: 'bg-emerald-950 border-emerald-800',
};

export default function Home() {
  const [step, setStep] = useState<'search' | 'onboard' | 'results'>('search');
  const [city, setCity] = useState('');
  const [hotels, setHotels] = useState<HotelSnapshot[]>([]);
  const [currency, setCurrency] = useState<{ code: string; symbol: string; name: string }>({ code: 'USD', symbol: '$', name: 'US Dollar' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(3);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  // Hotel manager form
  const [hotelName, setHotelName] = useState('');
  const [stars, setStars] = useState(3);
  const [currentPrice, setCurrentPrice] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [rooms, setRooms] = useState('50');
  const [breakfast, setBreakfast] = useState(false);
  const [parking, setParking] = useState(false);
  const [cancellation, setCancellation] = useState(false);

  const searchHotels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hotels?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      setHotels(data.data || []);
      if (data.currency) setCurrency(data.currency);
      setStep('onboard');
    } catch {
      setHotels([]);
      setStep('onboard');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendation = async () => {
    setRecLoading(true);
    setRecError(null);
    try {
      const competitors = hotels.filter((h) => h.propertyClass === stars);
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          stars,
          currentPrice: Number(currentPrice),
          occupancy: Number(occupancy),
          rooms: Number(rooms),
          breakfast,
          parking,
          cancellation,
          competitors,
          currency,
        }),
      });
      const data = await res.json();
      if (data.error || !data.recommendedPrice) {
        setRecError(data.error || 'No recommendation returned. Try again.');
      } else {
        setRecommendation(data);
        setActiveTab(stars);
        setStep('results');
      }
    } catch {
      setRecError('Network error. Check your connection and try again.');
    } finally {
      setRecLoading(false);
    }
  };

  const fmt = (n: number) => `${currency.symbol}${Math.round(n).toLocaleString('en-US')}`;

  const hotelsByStars = (s: number) => hotels.filter((h) => h.propertyClass === s);
  const avgPrice = (s: number) => {
    const filtered = hotelsByStars(s);
    if (!filtered.length) return 0;
    const total = filtered.reduce((sum, h) => sum + (h.priceBreakdown?.grossPrice?.value || 0), 0);
    return Math.round(total / filtered.length);
  };

  const urgencyColor: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  };

  const canRecommend = hotelName && currentPrice && occupancy && Number(occupancy) >= 0 && Number(occupancy) <= 100;

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-6 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-emerald-400">PeakYield</h1>
          <p className="text-gray-400 mt-1">Peak prices. Peak occupancy. Peak revenue.</p>
        </div>

        {/* STEP 1 — City Search */}
        {step === 'search' && (
          <div className="bg-gray-900 rounded-2xl p-5 sm:p-8">
            <h2 className="text-xl font-semibold mb-6">Where is your hotel?</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Enter city (e.g. New York, London, Dubai)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchHotels()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={searchHotels}
                disabled={loading || !city}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Hotel Onboarding */}
        {step === 'onboard' && (
          <div className="bg-gray-900 rounded-2xl p-5 sm:p-8">
            <h2 className="text-xl font-semibold mb-6">Tell us about your hotel</h2>
            <p className="text-gray-400 text-sm mb-5">
              Using {hotels.length ? `${hotels.length} live competitor rates` : 'demo competitor data'} for {city || 'your market'}.
            </p>
            <div className="grid gap-5">

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Hotel Name</label>
                <input
                  type="text"
                  placeholder="e.g. The Grand Hotel"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Star Rating</label>
                <div className="flex gap-3">
                  {[3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStars(s)}
                      className={`flex-1 py-3 rounded-lg font-semibold border transition-colors ${
                        stars === s
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      {'⭐'.repeat(s)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Current Price Tonight ({currency.symbol})</label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Current Occupancy (%)</label>
                  <input
                    type="number"
                    placeholder="e.g. 65"
                    value={occupancy}
                    onChange={(e) => setOccupancy(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Total Rooms</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-3 block">Amenities Included</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: '🍳 Breakfast', val: breakfast, set: setBreakfast },
                    { label: '🅿️ Parking', val: parking, set: setParking },
                    { label: '✅ Free Cancel', val: cancellation, set: setCancellation },
                  ].map(({ label, val, set }) => (
                    <button
                      key={label}
                      onClick={() => set(!val)}
                      className={`flex-1 py-3 rounded-lg font-semibold border transition-colors ${
                        val
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {recError && (
                <div className="bg-red-950 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                  {recError}
                </div>
              )}
              <button
                onClick={getRecommendation}
                disabled={recLoading || !canRecommend}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
              >
                {recLoading ? 'Analyzing market...' : 'Get My Price Recommendation'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Results */}
        {step === 'results' && recommendation && (
          <div className="grid gap-6">

            {/* AI Recommendation Card */}
            <div className="bg-emerald-950 border border-emerald-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-emerald-400">AI Recommendation</h2>
                <span className={`font-semibold uppercase text-sm ${urgencyColor[recommendation.urgency]}`}>
                  {recommendation.urgency} urgency
                </span>
              </div>
              <div className="grid gap-4 sm:flex sm:items-center sm:gap-6 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Your Current Price</p>
                  <p className="text-white text-3xl font-bold">{fmt(Number(currentPrice))}</p>
                </div>
                <div className="hidden text-4xl sm:block">→</div>
                <div>
                  <p className="text-emerald-400 text-sm">Recommended Price</p>
                  <p className="text-emerald-400 text-4xl font-bold">{fmt(recommendation.recommendedPrice)}</p>
                </div>
                {recommendation.revenueBreakdown && (
                  <div className="sm:ml-auto sm:text-right">
                    <p className="text-gray-400 text-sm">Extra per week</p>
                    <p className={`text-2xl font-bold ${recommendation.revenueBreakdown.extraPerWeek >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {recommendation.revenueBreakdown.extraPerWeek >= 0 ? '+' : ''}{fmt(Math.abs(recommendation.revenueBreakdown.extraPerWeek))}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-gray-300">{recommendation.reasoning}</p>
            </div>

            {/* Pricing Formula */}
            {recommendation.pricingFormula && (() => {
              const pf = recommendation.pricingFormula;
              const totalAdjPct = Math.round((pf.occupancyAdj + pf.amenityAdj) * 100);
              return (
                <div className="bg-gray-900 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-1">How Your Price Was Set</h2>
                  <p className="text-gray-500 text-sm mb-5">
                    Deterministic formula → AI fine-tunes ±10%
                  </p>

                  {/* Formula steps */}
                  <div className="space-y-3 mb-5">

                    {/* Step 1: Market avg */}
                    <div className="flex items-start gap-4 bg-gray-800 rounded-xl p-4">
                      <span className="text-gray-500 font-mono text-sm w-6 shrink-0">1</span>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Market Average</p>
                        <p className="text-white font-mono">
                          {fmt(pf.marketAvg)} avg across {pf.competitorCount} same-star competitors
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Occupancy */}
                    <div className="flex items-start gap-4 bg-gray-800 rounded-xl p-4">
                      <span className="text-gray-500 font-mono text-sm w-6 shrink-0">2</span>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Occupancy Adjustment</p>
                        <p className={`font-mono ${pf.occupancyAdj >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pf.occupancyLabel}
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Amenities */}
                    <div className="flex items-start gap-4 bg-gray-800 rounded-xl p-4">
                      <span className="text-gray-500 font-mono text-sm w-6 shrink-0">3</span>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Amenity Premium</p>
                        <div className="space-y-0.5">
                          {pf.amenityLines.map((line: string) => (
                            <p key={line} className={`font-mono text-sm ${pf.amenityAdj > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Formula result */}
                    <div className="flex items-start gap-4 bg-gray-800 rounded-xl p-4">
                      <span className="text-gray-500 font-mono text-sm w-6 shrink-0">4</span>
                      <div className="flex-1">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Base Price Formula</p>
                        <p className="text-white font-mono text-sm">
                          {fmt(pf.marketAvg)} × {pf.positionFactor} ({totalAdjPct >= 0 ? '+' : ''}{totalAdjPct}% total adjustment)
                        </p>
                        <p className="text-emerald-400 font-bold text-xl mt-1">= {fmt(pf.basePrice)}</p>
                      </div>
                    </div>

                    {/* Step 5: AI range */}
                    <div className="flex items-start gap-4 bg-emerald-950 border border-emerald-800 rounded-xl p-4">
                      <span className="text-emerald-600 font-mono text-sm w-6 shrink-0">5</span>
                      <div className="flex-1">
                        <p className="text-emerald-400 text-xs uppercase tracking-wide mb-1">AI Fine-Tuning (±10% of base)</p>
                        <p className="text-gray-300 font-mono text-sm">
                          Allowed range: {fmt(pf.aiMin)} – {fmt(pf.aiMax)}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          AI adjusts within this band based on competitor review scores and day-of-week demand.
                          Output is hard-clamped server-side — AI cannot exceed this range.
                        </p>
                        <p className="text-emerald-400 font-bold text-xl mt-2">
                          Final: {fmt(recommendation.recommendedPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 7 Day Calendar */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">7-Day Pricing Calendar</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
                {recommendation.weeklyPricing?.map((day) => (
                  <div key={day.day} className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">{day.day.slice(0, 3)}</p>
                    <p className="text-emerald-400 font-bold">{fmt(day.price)}</p>
                    <p className="text-gray-500 text-xs mt-1">{day.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Breakdown */}
            {recommendation.revenueBreakdown && (() => {
              const rb = recommendation.revenueBreakdown;
              const positive = rb.extraPerWeek >= 0;
              return (
                <div className="bg-gray-900 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-1">Revenue Impact Breakdown</h2>
                  <p className="text-gray-500 text-sm mb-5">Formula: Price × Occupancy % × Rooms = Revenue/night</p>

              <div className="grid gap-4 mb-5 sm:grid-cols-2">
                    <div className="bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Current</p>
                      <p className="text-white font-mono text-sm">
                        {fmt(rb.currentPrice)} × {rb.currentOccupancy}% × {rb.rooms} rooms
                      </p>
                      <p className="text-white text-2xl font-bold mt-1">
                        {fmt(rb.currentRevenuePerNight)}
                        <span className="text-gray-400 text-sm font-normal">/night</span>
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {fmt(rb.currentRevenuePerNight * 7)}/week
                      </p>
                    </div>

                    <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-4">
                      <p className="text-emerald-400 text-xs uppercase tracking-wide mb-2">Projected</p>
                      <p className="text-emerald-300 font-mono text-sm">
                        {fmt(rb.recommendedPrice)} × {rb.expectedOccupancy}% × {rb.rooms} rooms
                      </p>
                      <p className="text-emerald-400 text-2xl font-bold mt-1">
                        {fmt(rb.projectedRevenuePerNight)}
                        <span className="text-emerald-600 text-sm font-normal">/night</span>
                      </p>
                      <p className="text-emerald-600 text-sm mt-1">
                        {fmt(rb.projectedRevenuePerNight * 7)}/week
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Occupancy Adjustment (Price Elasticity)</p>
                    <p className="text-gray-300 text-sm">{rb.elasticityNote}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Industry standard model: price decrease = +15pp occupancy, price increase = -8pp occupancy (floor 40%, cap 100%)
                    </p>
                  </div>

                  <div className={`rounded-xl p-4 border ${positive ? 'bg-yellow-950 border-yellow-800' : 'bg-red-950 border-red-800'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs uppercase tracking-wide mb-1 ${positive ? 'text-yellow-400' : 'text-red-400'}`}>Net Impact</p>
                        <p className="text-gray-300 text-sm font-mono">
                          {fmt(rb.projectedRevenuePerNight)} − {fmt(rb.currentRevenuePerNight)} = {positive ? '+' : ''}{fmt(rb.extraPerNight)}/night
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${positive ? 'text-yellow-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}{fmt(Math.abs(rb.extraPerWeek))}
                        </p>
                        <p className="text-gray-400 text-sm">per week</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Market Summary */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Market Overview — {stars}⭐ Hotels in {city}</h2>
              <div className="grid gap-4 mb-6 sm:grid-cols-3">
                {[3, 4, 5].map((s) => (
                  <div key={s} className={`rounded-xl p-4 border ${STAR_BG[s]}`}>
                    <p className={`font-bold ${STAR_COLORS[s]}`}>{'⭐'.repeat(s)}</p>
                    <p className="text-white font-bold text-xl">{fmt(avgPrice(s))}<span className="text-sm text-gray-400">/night</span></p>
                    <p className="text-gray-400 text-sm">{hotelsByStars(s).length} hotels</p>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveTab(s)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      activeTab === s ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {'⭐'.repeat(s)} ({hotelsByStars(s).length})
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                {hotelsByStars(activeTab).map((hotel) => (
                  <div key={hotel.id} className={`rounded-xl p-4 grid gap-3 border sm:flex sm:items-center sm:gap-4 ${STAR_BG[activeTab]}`}>
                    {hotel.photoUrls?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hotel.photoUrls[0]} className="w-14 h-14 rounded-lg object-cover" alt={hotel.name} />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{hotel.name}</h3>
                      <p className="text-gray-400 text-sm">{hotel.reviewScoreWord} · {hotel.reviewScore} · {hotel.reviewCount} reviews</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-xl ${STAR_COLORS[activeTab]}`}>
                        {hotel.priceBreakdown?.grossPrice?.amountRounded}
                      </p>
                      <p className="text-gray-500 text-xs">per night</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <AlertsPanel />
            <button
              onClick={() => {
                setStep('search');
                setRecommendation(null);
                setHotels([]);
                setCity('');
                setHotelName('');
                setCurrentPrice('');
                setOccupancy('');
                setRooms('50');
                setBreakfast(false);
                setParking(false);
                setCancellation(false);
                setRecError(null);
                setCurrency({ code: 'USD', symbol: '$', name: 'US Dollar' });
              }}
              className="text-gray-400 hover:text-white transition-colors text-center"
            >
              ← Start Over
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
