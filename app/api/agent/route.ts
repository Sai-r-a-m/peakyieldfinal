import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

import {
  calculateAveragePrice,
  getPriceGap,
} from "@/lib/market-utils";
import type { HotelSnapshot } from "@/lib/types";

async function fetchCompetitors(
  city: string
) {
  try {
    console.log(
      `Fetching competitors for ${city}`
    );

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_SITE_URL env var is required");

    const response = await fetch(
      `${baseUrl}/api/hotels?city=${encodeURIComponent(
        city
      )}`,
      {
        cache: "no-store",
      }
    );

    const data =
      await response.json();

    console.log(
      "Hotels fetched:",
      data?.data?.length || 0
    );

    return data?.data || [];
  } catch (error) {
    console.error(
      "Fetch competitors failed:",
      error
    );

    return [];
  }
}

async function generateAIAlert({
  hotel,
  oldPrice,
  newPrice,
}: {
  hotel: HotelSnapshot;
  oldPrice: number;
  newPrice: number;
}) {
  try {
    const prompt = `
You are an AI hotel revenue manager.

Return ONLY valid JSON.

No markdown.
No explanation.
No backticks.

Hotel: ${hotel.name}
City: ${hotel.city}

Previous market average: $${oldPrice}
Current market average: $${newPrice}

JSON format:
{
  "message": "short alert message",
  "recommendedPrice": number,
  "urgency": "low" | "medium" | "high"
}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            "llama-3.3-70b-versatile",

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.3,

          response_format: {
            type: "json_object",
          },
        }),
      }
    );

    const result =
      await response.json();

    console.log(
      "GROQ FULL RESPONSE:",
      JSON.stringify(
        result,
        null,
        2
      )
    );

    const content =
      result?.choices?.[0]?.message
        ?.content;

    if (!content) {
      console.error(
        "No AI content returned"
      );

      return null;
    }

    console.log(
      "AI RAW CONTENT:",
      content
    );

    const parsed =
      JSON.parse(content);

    return {
      message:
        parsed.message ||
        "Market prices changed significantly.",

      recommendedPrice:
        parsed.recommendedPrice ||
        newPrice,

      urgency:
        (
          parsed.urgency ||
          "medium"
        ).toLowerCase(),
    };
  } catch (error) {
    console.error(
      "AI alert failed",
      error
    );

    return null;
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase service role credentials are required for the monitoring agent.",
        },
        {
          status: 500,
        }
      );
    }

    const { hotels } =
      (await req.json()) as {
        hotels: HotelSnapshot[];
      };

    const results = [];

    for (const hotel of hotels) {
      try {
        if (!hotel.city || !hotel.name) {
          results.push({
            hotel:
              hotel.name || "Unknown hotel",
            alert: false,
            skipped: true,
            reason:
              "Missing hotel name or city",
          });

          continue;
        }

        console.log(
          `Monitoring ${hotel.name}`
        );

        const competitors =
          await fetchCompetitors(
            hotel.city
          );

        if (
          !Array.isArray(
            competitors
          )
        ) {
          console.error(
            "Competitors is not an array"
          );

          continue;
        }

        const avg3Star =
          calculateAveragePrice(
            competitors,
            3
          );

        const avg4Star =
          calculateAveragePrice(
            competitors,
            4
          );

        const avg5Star =
          calculateAveragePrice(
            competitors,
            5
          );

        console.log(
          "Market averages:",
          {
            avg3Star,
            avg4Star,
            avg5Star,
          }
        );

        const {
          data: previous,
        } = await supabaseAdmin
          .from("price_snapshots")
          .select("*")
          .eq("city", hotel.city)
          .order("fetched_at", {
            ascending: false,
          })
          .limit(1)
          .single();

        const oldPrice =
          previous?.avg_price_4star ||
          0;

        const gap = getPriceGap(
          avg4Star,
          oldPrice
        );

        console.log(
          `Price gap: ${gap}`
        );

        const {
          error: snapshotError,
        } = await supabaseAdmin
          .from("price_snapshots")
          .insert({
            hotel_id: hotel.id,

            city: hotel.city,

            competitor_data:
              competitors,

            avg_price_3star:
              avg3Star,

            avg_price_4star:
              avg4Star,

            avg_price_5star:
              avg5Star,
          });

        if (snapshotError) {
          console.error(
            "SNAPSHOT INSERT ERROR:",
            snapshotError
          );
        } else {
          console.log(
            "Snapshot saved"
          );
        }

        if (gap > 15) {
          const aiAlert =
            await generateAIAlert({
              hotel,
              oldPrice,
              newPrice:
                avg4Star,
            });

          if (aiAlert) {
            const {
              data,
              error,
            } =
              await supabaseAdmin
                .from("alerts")
                .insert({
                  hotel_id:
                    hotel.id,

                  message:
                    aiAlert.message ||
                    "Market conditions changed.",

                  recommended_price:
                    aiAlert.recommendedPrice ||
                    hotel.current_price,

                  urgency:
                    (
                      aiAlert.urgency ||
                      "medium"
                    ).toLowerCase(),
                })
                .select();

            if (error) {
              console.error(
                "ALERT INSERT ERROR:",
                error
              );
            } else {
              console.log(
                "ALERT INSERTED:",
                data
              );
            }

            results.push({
              hotel:
                hotel.name,

              alert: true,

              gap,
            });
          }
        } else {
          results.push({
            hotel:
              hotel.name,

            alert: false,

            gap,
          });
        }
      } catch (hotelError) {
        console.error(
          "HOTEL ERROR:",
          hotelError
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      "AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
