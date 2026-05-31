import { NextResponse } from 'next/server';
import { getCurrencyForCountry } from '@/lib/currency-utils';
import { supabaseAdmin } from '@/lib/supabase';
import type { HotelSnapshot } from '@/lib/types';

const CACHE_WINDOW_MS = 2 * 60 * 60 * 1000;

const demoHotels = [
  { id: 'demo-1', name: 'Market Square Hotel', propertyClass: 3, reviewScoreWord: 'Very good', reviewScore: 8.1, reviewCount: 842, priceBreakdown: { grossPrice: { value: 119, amountRounded: '$119' } } },
  { id: 'demo-2', name: 'Central Station Inn', propertyClass: 3, reviewScoreWord: 'Good', reviewScore: 7.8, reviewCount: 516, priceBreakdown: { grossPrice: { value: 104, amountRounded: '$104' } } },
  { id: 'demo-3', name: 'Harbor Business Hotel', propertyClass: 4, reviewScoreWord: 'Excellent', reviewScore: 8.7, reviewCount: 1204, priceBreakdown: { grossPrice: { value: 178, amountRounded: '$178' } } },
  { id: 'demo-4', name: 'Cityline Suites', propertyClass: 4, reviewScoreWord: 'Very good', reviewScore: 8.4, reviewCount: 933, priceBreakdown: { grossPrice: { value: 162, amountRounded: '$162' } } },
  { id: 'demo-5', name: 'The Meridian Grand', propertyClass: 5, reviewScoreWord: 'Wonderful', reviewScore: 9.1, reviewCount: 677, priceBreakdown: { grossPrice: { value: 286, amountRounded: '$286' } } },
  { id: 'demo-6', name: 'Apex Luxury Hotel', propertyClass: 5, reviewScoreWord: 'Exceptional', reviewScore: 9.3, reviewCount: 421, priceBreakdown: { grossPrice: { value: 318, amountRounded: '$318' } } },
];

type LocationResult = {
  dest_type?: string;
  id?: string;
  cc1?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get('city') || 'New York').trim();
  const cacheKey = city.toLowerCase();
  const fallbackCurrency = getCurrencyForCountry('US');

  const cachedSnapshot = await getCachedSnapshot(cacheKey);
  if (cachedSnapshot) {
    return NextResponse.json({
      data: cachedSnapshot.competitor_data,
      currency: cachedSnapshot.currency,
      countryCode: cachedSnapshot.country_code,
      cached: true,
      fetchedAt: cachedSnapshot.fetched_at,
      nextRefreshAt: new Date(new Date(cachedSnapshot.fetched_at).getTime() + CACHE_WINDOW_MS).toISOString(),
    });
  }

  if (!process.env.RAPIDAPI_KEY) {
    await saveSnapshot({
      city: cacheKey,
      data: demoHotels,
    });

    return NextResponse.json({
      data: demoHotels,
      currency: fallbackCurrency,
      countryCode: 'US',
      demo: true,
      cached: false,
    });
  }

  try {
    // Step 1: Get location ID + country code
    const locationResponse = await fetch(
      `https://booking-com18.p.rapidapi.com/stays/auto-complete?query=${encodeURIComponent(city)}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'booking-com18.p.rapidapi.com',
        },
      }
    );

    const locationData = await locationResponse.json();
    const cityResult = (locationData.data as LocationResult[] | undefined)?.find((item) => item.dest_type === 'city');
    const locationId = cityResult?.id;

    if (!locationId) {
      await saveSnapshot({
        city: cacheKey,
        data: demoHotels,
      });

      return NextResponse.json({
        data: demoHotels,
        currency: fallbackCurrency,
        countryCode: 'US',
        demo: true,
        cached: false,
      });
    }

    // Detect local currency from country code (cc1 is ISO 3166-1 alpha-2)
    const countryCode: string = (cityResult?.cc1 || 'US').toUpperCase();
    const currency = getCurrencyForCountry(countryCode);

    // Use tomorrow → day-after-tomorrow so Booking.com always returns live availability
    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 1);
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    // Step 2: Search hotels in local currency
    const hotelsResponse = await fetch(
      `https://booking-com18.p.rapidapi.com/stays/search?locationId=${encodeURIComponent(locationId)}&checkinDate=${fmt(checkin)}&checkoutDate=${fmt(checkout)}&adults=2&rooms=1&units=metric&temperature=c&currencyCode=${currency.code}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'booking-com18.p.rapidapi.com',
        },
      }
    );

    const hotelsData = await hotelsResponse.json();

    const data: HotelSnapshot[] = hotelsData.data?.length ? hotelsData.data : demoHotels;

    await saveSnapshot({
      city: cacheKey,
      data,
    });

    return NextResponse.json({
      data,
      currency,
      countryCode,
      demo: data === demoHotels,
      cached: false,
    });

  } catch (error) {
    await saveSnapshot({
      city: cacheKey,
      data: demoHotels,
    });

    return NextResponse.json({
      data: demoHotels,
      currency: fallbackCurrency,
      countryCode: 'US',
      demo: true,
      cached: false,
      warning: String(error),
    });
  }
}

async function getCachedSnapshot(city: string) {
  if (!supabaseAdmin) return null;

  const activeSince = new Date(Date.now() - CACHE_WINDOW_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from('price_snapshots')
    .select('competitor_data, avg_price_3star, avg_price_4star, avg_price_5star, fetched_at')
    .eq('city', city)
    .gte('fetched_at', activeSince)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.competitor_data) return null;

  return {
    competitor_data: data.competitor_data,
    currency: getCurrencyFromHotelData(data.competitor_data) || getCurrencyForCountry('US'),
    country_code: 'US',
    fetched_at: data.fetched_at,
  };
}

async function saveSnapshot({
  city,
  data,
}: {
  city: string;
  data: HotelSnapshot[];
}) {
  if (!supabaseAdmin || !data.length) return;

  const averageForStars = (stars: number) => {
    const prices = data
      .filter((hotel) => hotel.propertyClass === stars)
      .map((hotel) => hotel.priceBreakdown?.grossPrice?.value || 0)
      .filter((price) => price > 0);

    if (!prices.length) return 0;

    return Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length
    );
  };

  const { error } = await supabaseAdmin
    .from('price_snapshots')
    .insert({
      city,
      competitor_data: data,
      avg_price_3star: averageForStars(3),
      avg_price_4star: averageForStars(4),
      avg_price_5star: averageForStars(5),
    });

  if (error) {
    console.error('Snapshot cache save failed:', error.message);
  }
}

function getCurrencyFromHotelData(data: HotelSnapshot[]) {
  const rounded = data[0]?.priceBreakdown?.grossPrice?.amountRounded;
  if (!rounded) return null;

  if (rounded.startsWith('$')) return getCurrencyForCountry('US');
  if (rounded.startsWith('£')) return getCurrencyForCountry('GB');
  if (rounded.startsWith('€')) return getCurrencyForCountry('DE');

  return null;
}
