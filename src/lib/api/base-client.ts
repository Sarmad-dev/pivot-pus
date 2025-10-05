/**
 * Base API client with common functionality for all platform integrations
 */

import { PlatformType, OAuthTokens } from './types';
import { 
  PlatformAPIError, 
  AuthenticationError, 
  TokenExpiredError, 
  RateLimitError,
  NetworkError 
} from './errors';
import { withRetry } from './retry';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
        'No authentication tokens available'
      );
    }

    if (this.isTokenExpired()) {
      throw new TokenExpiredError(this.platform);
    }

    return `Bearer ${this.tokens.accessToken}`;
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
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
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(
          this.platform,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      
      case 403:
        throw new AuthenticationError(
          this.platform,
          errorData.message || 'Access forbidden',
          errorData
        );
      
      default:
        throw new PlatformAPIError({
          code: `HTTP_${response.status}`,
          message: errorData.message || `Request failed with status ${response.status}`,
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
      method = 'GET',
      headers = {},
      body,
      params,
      retry = true,
    } = options;

    const makeRequest = async (): Promise<T> => {
      try {
        // Check if token needs refresh
        if (this.isTokenExpired() && this.tokens?.refreshToken) {
          this.tokens = await this.refreshAccessToken();
        }

        const url = this.buildUrl(endpoint, params);
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
          ...headers,
        };

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        return this.handleResponse<T>(response);
      } catch (error) {
        if (error instanceof PlatformAPIError) {
          throw error;
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
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
    options?: Omit<RequestOptions, 'method' | 'params'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  }

  /**
   * POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  protected async put<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
