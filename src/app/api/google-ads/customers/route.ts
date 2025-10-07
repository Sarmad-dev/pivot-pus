import { NextRequest, NextResponse } from "next/server";
import { GoogleAdsApi } from "google-ads-api";

export async function GET(request: NextRequest) {
  try {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    console.log("GET /api/google-ads/customers - Using Google Ads SDK");

    if (!developerToken) {
      return NextResponse.json(
        { error: "Google Ads developer token not configured" },
        { status: 500 }
      );
    }

    // Get tokens from query parameters (sent by the client)
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Missing access token or refresh token in query parameters" },
        { status: 400 }
      );
    }

    const platformTokens = {
      accessToken,
      refreshToken,
    };

    if (!platformTokens) {
      return NextResponse.json(
        {
          error:
            "Google platform connection not found. Please connect your Google account first.",
        },
        { status: 401 }
      );
    }

    if (!platformTokens.refreshToken) {
      return NextResponse.json(
        {
          error:
            "No refresh token available. Please reconnect your Google account.",
        },
        { status: 401 }
      );
    }

    // Initialize Google Ads API client with refresh token
    const client = new GoogleAdsApi({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      developer_token: developerToken,
    });

    console.log("Getting accessible customers using Google Ads SDK...");

    // Get accessible customers
    const accessibleCustomers = await client.listAccessibleCustomers(
      platformTokens.refreshToken
    );

    console.log("Accessible customers:", accessibleCustomers);

    return NextResponse.json({
      resourceNames: accessibleCustomers.resource_names || [],
    });
  } catch (error: unknown) {
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

    return NextResponse.json(
      { error: "Google Ads API error", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tokens, query } = await request.json();

    if (!tokens || !query) {
      return NextResponse.json(
        { error: "Missing tokens or query" },
        { status: 400 }
      );
    }

    // For search queries without a specific customer, return error
    return NextResponse.json(
      {
        error:
          "Search queries require a specific customer ID. Use /customers/{customerId}/campaigns endpoint.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
