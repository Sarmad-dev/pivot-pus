/**
 * Base API client with common functionality for all platform integrations
 */

import { PlatformType, OAuthTokens } from "./types";
import {
  PlatformAPIError,
  AuthenticationError,
  TokenExpiredError,
  RateLimitError,
  NetworkError,
} from "./errors";
import { withRetry } from "./retry";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  retry?: boolean;
}

export abstract class BaseAPIClient {
  protected platform: PlatformType;
  protected tokens: OAuthTokens | null = null;
  protected baseUrl: string;

  constructor(platform: PlatformType, baseUrl: string) {
    this.platform = platform;
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  /**
   * Check if tokens are expired
   */
  protected isTokenExpired(): boolean {
    console.log("Token Expired: ", !this.tokens);
    if (!this.tokens) return true;

    return Date.now() >= this.tokens.expiresAt;
  }

  /**
   * Abstract method to refresh tokens - must be implemented by subclasses
   */
  protected abstract refreshAccessToken(): Promise<OAuthTokens>;

  /**
   * Get authorization header
   */
  protected getAuthHeader(): string {
    if (!this.tokens) {
      throw new AuthenticationError(
        this.platform,
        "No authentication tokens available"
      );
    }

    return `Bearer ${this.tokens.accessToken}`;
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(
    endpoint: string,
    params?: Record<string, string>
  ): string {
    // Handle relative URLs for Next.js API routes
    let fullUrl: string;
    if (this.baseUrl.startsWith("/")) {
      // Relative URL - just concatenate
      fullUrl = `${this.baseUrl}${endpoint}`;
    } else {
      // Absolute URL - use URL constructor
      const url = new URL(endpoint, this.baseUrl);
      fullUrl = url.toString();
    }

    // Add query parameters if provided
    if (params && Object.keys(params).length > 0) {
      const separator = fullUrl.includes("?") ? "&" : "?";
      const queryString = Object.entries(params)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join("&");
      fullUrl += separator + queryString;
    }

    return fullUrl;
  }

  /**
   * Handle API response errors
   */
  protected async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      return response.json();
    }

    const errorData = await response.json().catch(() => ({}));

    // Handle specific HTTP status codes
    switch (response.status) {
      case 401:
        throw new TokenExpiredError(this.platform);

      case 429:
        const retryAfter = response.headers.get("Retry-After");
        throw new RateLimitError(
          this.platform,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );

      case 403:
        throw new AuthenticationError(
          this.platform,
          errorData.message || "Access forbidden",
          errorData
        );

      default:
        throw new PlatformAPIError({
          code: `HTTP_${response.status}`,
          message:
            errorData.message ||
            `Request failed with status ${response.status}`,
          platform: this.platform,
          retryable: response.status >= 500,
          details: errorData,
        });
    }
  }

  /**
   * Make an authenticated API request
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      params,
      retry = true,
    } = options;

    const makeRequest = async (): Promise<T> => {
      try {
        // Check if token needs refresh before making the request
        if (this.isTokenExpired() && this.tokens?.refreshToken) {
          console.log(`[${this.platform}] Token expired, refreshing...`);
          this.tokens = await this.refreshAccessToken();
          console.log(`[${this.platform}] Token refreshed successfully`);
        }

        const url = this.buildUrl(endpoint, params);
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };

        // Only add Authorization header if not using query params for tokens
        if (!params?.accessToken) {
          requestHeaders.Authorization = this.getAuthHeader();
        }

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        return this.handleResponse<T>(response);
      } catch (error) {
        // If we get a 401, try refreshing the token once more
        if (error instanceof TokenExpiredError && this.tokens?.refreshToken) {
          console.log(
            `[${this.platform}] Got 401, attempting token refresh...`
          );
          try {
            this.tokens = await this.refreshAccessToken();
            console.log(
              `[${this.platform}] Token refreshed after 401, retrying request...`
            );

            // Retry the request with the new token
            const url = this.buildUrl(endpoint, params);
            const requestHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              ...headers,
            };

            // Only add Authorization header if not using query params for tokens
            if (!params?.accessToken) {
              requestHeaders.Authorization = this.getAuthHeader();
            }

            const response = await fetch(url, {
              method,
              headers: requestHeaders,
              body: body ? JSON.stringify(body) : undefined,
            });

            return this.handleResponse<T>(response);
          } catch (refreshError) {
            console.error(
              `[${this.platform}] Token refresh failed:`,
              refreshError
            );
            throw refreshError;
          }
        }

        if (error instanceof PlatformAPIError) {
          throw error;
        }

        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new NetworkError(this.platform, error);
        }

        throw error;
      }
    };

    if (retry) {
      return withRetry(makeRequest);
    }

    return makeRequest();
  }

  /**
   * GET request
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: Omit<RequestOptions, "method" | "params">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET", params });
  }

  /**
   * POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  /**
   * PUT request
   */
  protected async put<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}
