import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const ACTIVE_ALERT_WINDOW_HOURS = 2;

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: true,
        alerts: [],
      });
    }

    const activeSince = new Date(
      Date.now() -
        ACTIVE_ALERT_WINDOW_HOURS *
          60 *
          60 *
          1000
    ).toISOString();

    const { data, error } =
      await supabaseAdmin
        .from("alerts")
        .select("*")
        .eq("is_read", false)
        .gte("created_at", activeSince)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      alerts: data,
    });
  } catch (error) {
    console.error(error);

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

export async function PATCH(
  req: NextRequest
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: true,
      });
    }

    const { id } =
      await req.json();

    const { error } =
      await supabaseAdmin
        .from("alerts")
        .update({
          is_read: true,
        })
        .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

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
