import { NextRequest, NextResponse } from "next/server";
import { GoogleAdsApi } from "google-ads-api";

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { tokens, query } = await request.json();
    const { customerId } = params;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!tokens || !query) {
      return NextResponse.json(
        { error: "Missing tokens or query" },
        { status: 400 }
      );
    }

    if (!developerToken) {
      return NextResponse.json(
        { error: "Google Ads developer token not configured" },
        { status: 500 }
      );
    }

    console.log(
      `Searching campaigns for customer ${customerId} using Google Ads SDK`
    );

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      developer_token: developerToken,
    });

    // Create customer instance with tokens
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: tokens.refreshToken || "",
    });

    console.log("Executing search query:", query);

    // Execute the search query
    const results = await customer.query(query);

    console.log("Search results:", results);

    return NextResponse.json({
      results: results || [],
    });
  } catch (error) {
    console.error("Google Ads SDK error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific Google Ads API errors
    if (errorMessage.includes("UNAUTHENTICATED")) {
      return NextResponse.json(
        { error: "Authentication failed - token may be expired" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("PERMISSION_DENIED")) {
      return NextResponse.json(
        {
          error: "Permission denied - check developer token and account access",
        },
        { status: 403 }
      );
    }

    if (errorMessage.includes("INVALID_CUSTOMER_ID")) {
      return NextResponse.json(
        { error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Google Ads API error", details: errorMessage },
      { status: 500 }
    );
  }
}
