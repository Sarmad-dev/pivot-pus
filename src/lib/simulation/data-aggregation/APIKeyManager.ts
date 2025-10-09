/**
 * API Key Management Utilities
 * 
 * Secure storage and retrieval of external API keys
 * Implements encryption and access control
 */

import { Id } from "../../../../convex/_generated/dataModel";
import { DataValidationError, ModelAPIError } from "../errors";

export interface APIKeyConfig {
  organizationId: Id<"organizations">;
  source: string;
  apiKey: string;
  endpoint: string;
  rateLimit: {
    requests: number;
    period: number;
  };
  enabled: boolean;
}

export interface EncryptedAPIKey {
  encryptedKey: string;
  iv: string;
  salt: string;
}

export class APIKeyManager {
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    // In production, this would come from environment variables
    this.encryptionKey = encryptionKey || process.env.API_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Store encrypted API key in Convex database
   */
  async storeAPIKey(
    config: APIKeyConfig,
    convexMutation: any
  ): Promise<void> {
    try {
      // Encrypt the API key
      const encrypted = this.encryptAPIKey(config.apiKey);

      // Store in external data sources table
      await convexMutation("externalDataSources:upsert", {
        organizationId: config.organizationId,
        source: config.source,
        config: {
          apiKey: encrypted.encryptedKey,
          endpoint: config.endpoint,
          rateLimit: config.rateLimit,
          enabled: config.enabled,
          // Store encryption metadata
          _encryption: {
            iv: encrypted.iv,
            salt: encrypted.salt,
            algorithm: 'aes-256-gcm'
          }
        }
      });

    } catch (error) {
      throw new DataValidationError(
        `Failed to store API key for ${config.source}: ${error instanceof Error ? error.message : String(error)}`,
        'api_key_storage',
        { source: config.source, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Retrieve and decrypt API key from Convex database
   */
  async retrieveAPIKey(
    organizationId: Id<"organizations">,
    source: string,
    convexQuery: any
  ): Promise<string> {
    try {
      const dataSource = await convexQuery("externalDataSources:getBySource", {
        organizationId,
        source
      });

      if (!dataSource) {
        throw new DataValidationError(
          `API key not found for source: ${source}`,
          'api_key_not_found',
          { source, organizationId }
        );
      }

      if (!dataSource.config.enabled) {
        throw new DataValidationError(
          `Data source ${source} is disabled`,
          'data_source_disabled',
          { source }
        );
      }

      // Decrypt the API key
      const decrypted = this.decryptAPIKey({
        encryptedKey: dataSource.config.apiKey,
        iv: dataSource.config._encryption.iv,
        salt: dataSource.config._encryption.salt
      });

      return decrypted;

    } catch (error) {
      if (error instanceof DataValidationError) {
        throw error;
      }
      throw new ModelAPIError(
        `Failed to retrieve API key for ${source}: ${error instanceof Error ? error.message : String(error)}`,
        'api_key_retrieval'
      );
    }
  }

  /**
   * Test API key validity by making a test request
   */
  async testAPIKey(
    organizationId: Id<"organizations">,
    source: string,
    convexQuery: any
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const apiKey = await this.retrieveAPIKey(organizationId, source, convexQuery);
      
      // Get endpoint configuration
      const dataSource = await convexQuery("externalDataSources:getBySource", {
        organizationId,
        source
      });

      if (!dataSource) {
        return { valid: false, error: 'Data source configuration not found' };
      }

      // Make test request based on source type
      const testResult = await this.makeTestRequest(source, apiKey, dataSource.config.endpoint);
      return { valid: testResult };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error during API key test' 
      };
    }
  }

  /**
   * Rotate API key (update with new key)
   */
  async rotateAPIKey(
    organizationId: Id<"organizations">,
    source: string,
    newAPIKey: string,
    convexMutation: any
  ): Promise<void> {
    try {
      // Encrypt new API key
      const encrypted = this.encryptAPIKey(newAPIKey);

      // Update in database
      await convexMutation("externalDataSources:updateAPIKey", {
        organizationId,
        source,
        encryptedKey: encrypted.encryptedKey,
        encryptionMeta: {
          iv: encrypted.iv,
          salt: encrypted.salt,
          algorithm: 'aes-256-gcm'
        }
      });

    } catch (error) {
      throw new DataValidationError(
        `Failed to rotate API key for ${source}: ${error instanceof Error ? error.message : String(error)}`,
        'api_key_rotation',
        { source, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * List all configured API sources for an organization
   */
  async listAPISources(
    organizationId: Id<"organizations">,
    convexQuery: any
  ): Promise<Array<{
    source: string;
    enabled: boolean;
    endpoint: string;
    rateLimit: { requests: number; period: number };
    lastSync?: number;
    status: 'active' | 'error' | 'disabled';
  }>> {
    try {
      const dataSources = await convexQuery("externalDataSources:listByOrganization", {
        organizationId
      });

      return dataSources.map((ds: any) => ({
        source: ds.source,
        enabled: ds.config.enabled,
        endpoint: ds.config.endpoint,
        rateLimit: ds.config.rateLimit,
        lastSync: ds.lastSync,
        status: ds.status
      }));

    } catch (error) {
      throw new ModelAPIError(
        `Failed to list API sources: ${error instanceof Error ? error.message : String(error)}`,
        'api_source_listing'
      );
    }
  }

  /**
   * Delete API key configuration
   */
  async deleteAPIKey(
    organizationId: Id<"organizations">,
    source: string,
    convexMutation: any
  ): Promise<void> {
    try {
      await convexMutation("externalDataSources:delete", {
        organizationId,
        source
      });
    } catch (error) {
      throw new DataValidationError(
        `Failed to delete API key for ${source}: ${error instanceof Error ? error.message : String(error)}`,
        'api_key_deletion',
        { source, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Encrypt API key using AES-256-GCM
   */
  private encryptAPIKey(apiKey: string): EncryptedAPIKey {
    const crypto = require('crypto');
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha512');
    
    // Create cipher
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('api-key-encryption'));
    
    // Encrypt
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedKey: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypt API key
   */
  private decryptAPIKey(encrypted: EncryptedAPIKey): string {
    const crypto = require('crypto');
    
    try {
      // Parse encrypted data
      const [encryptedData, authTagHex] = encrypted.encryptedKey.split(':');
      const authTag = Buffer.from(authTagHex, 'hex');
      const salt = Buffer.from(encrypted.salt, 'hex');
      const iv = Buffer.from(encrypted.iv, 'hex');
      
      // Derive key
      const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha512');
      
      // Create decipher
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from('api-key-encryption'));
      
      // Decrypt
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      throw new DataValidationError(
        'Failed to decrypt API key - key may be corrupted or encryption key changed',
        'decryption_error',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Make test request to validate API key
   */
  private async makeTestRequest(source: string, apiKey: string, endpoint: string): Promise<boolean> {
    try {
      let testUrl: string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Configure test request based on source type
      switch (source) {
        case 'semrush':
          testUrl = `${endpoint}/test`;
          headers['Authorization'] = `Bearer ${apiKey}`;
          break;
        
        case 'google_trends':
          testUrl = `${endpoint}/health`;
          headers['X-API-Key'] = apiKey;
          break;
        
        case 'twitter_api':
          testUrl = `${endpoint}/2/users/me`;
          headers['Authorization'] = `Bearer ${apiKey}`;
          break;
        
        case 'facebook_api':
          testUrl = `${endpoint}/me?access_token=${apiKey}`;
          break;
        
        default:
          testUrl = `${endpoint}/health`;
          headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers
        // Note: timeout would be handled by AbortController in production
      });

      return response.ok;

    } catch (error) {
      console.warn(`API test request failed for ${source}:`, error);
      return false;
    }
  }

  /**
   * Validate API key format based on source
   */
  validateAPIKeyFormat(source: string, apiKey: string): { valid: boolean; error?: string } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    switch (source) {
      case 'semrush':
        // SEMrush API keys are typically 32-character hex strings
        if (!/^[a-f0-9]{32}$/i.test(apiKey)) {
          return { valid: false, error: 'SEMrush API key should be a 32-character hexadecimal string' };
        }
        break;
      
      case 'google_trends':
        // Google API keys are typically 39 characters starting with AIza
        if (!/^AIza[0-9A-Za-z-_]{35}$/.test(apiKey)) {
          return { valid: false, error: 'Google API key format is invalid' };
        }
        break;
      
      case 'twitter_api':
        // Twitter Bearer tokens are longer base64-encoded strings
        if (apiKey.length < 50) {
          return { valid: false, error: 'Twitter API key appears too short' };
        }
        break;
      
      case 'facebook_api':
        // Facebook access tokens vary in length but are typically quite long
        if (apiKey.length < 20) {
          return { valid: false, error: 'Facebook API key appears too short' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Get rate limit information for a source
   */
  async getRateLimitInfo(
    organizationId: Id<"organizations">,
    source: string,
    convexQuery: any
  ): Promise<{ requests: number; period: number; remaining?: number }> {
    try {
      const dataSource = await convexQuery("externalDataSources:getBySource", {
        organizationId,
        source
      });

      if (!dataSource) {
        throw new DataValidationError(
          `Data source not found: ${source}`,
          'data_source_not_found',
          { source }
        );
      }

      return dataSource.config.rateLimit;

    } catch (error) {
      throw new ModelAPIError(
        `Failed to get rate limit info for ${source}: ${error instanceof Error ? error.message : String(error)}`,
        'rate_limit_info'
      );
    }
  }
}