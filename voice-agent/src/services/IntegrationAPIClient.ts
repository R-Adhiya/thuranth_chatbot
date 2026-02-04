/**
 * Integration API Client Service
 * 
 * Handles REST API communication with host logistics applications.
 * Provides authentication, data synchronization, and configuration management.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IntegrationAPIClient,
  DeliveryContext,
  StatusUpdate,
  VoiceAgentConfig,
  APIEndpoints,
  VoiceAgentError
} from '../types';

interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ConnectionState {
  isOnline: boolean;
  lastSuccessfulRequest: Date | null;
  consecutiveFailures: number;
  rateLimitedUntil: Date | null;
}

export class IntegrationAPIClientService implements IntegrationAPIClient {
  private httpClient: AxiosInstance;
  private authToken: AuthToken | null = null;
  private endpoints: APIEndpoints;
  private eventCallbacks: Map<string, Function[]> = new Map();
  private isInitialized = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private configPollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTimestamp: Date | null = null;
  private lastConfigTimestamp: Date | null = null;
  private currentConfig: VoiceAgentConfig | null = null;
  private syncInProgress = false;
  private connectionState: ConnectionState = {
    isOnline: true,
    lastSuccessfulRequest: null,
    consecutiveFailures: 0,
    rateLimitedUntil: null,
  };
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  };
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(endpoints?: APIEndpoints) {
    this.endpoints = endpoints || this.getDefaultEndpoints();
    this.httpClient = this.createHttpClient();
    this.initializeFromStorage();
  }

  /**
   * Initialize the API client with stored authentication data
   */
  private async initializeFromStorage(): Promise<void> {
    try {
      const storedAuth = await AsyncStorage.getItem('voice_agent_auth');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth) as AuthToken;
        if (new Date(authData.expiresAt) > new Date()) {
          this.authToken = authData;
          this.updateHttpClientAuth();
        } else {
          // Token expired, remove it
          await AsyncStorage.removeItem('voice_agent_auth');
        }
      }

      const storedEndpoints = await AsyncStorage.getItem('voice_agent_endpoints');
      if (storedEndpoints) {
        this.endpoints = JSON.parse(storedEndpoints);
        this.httpClient = this.createHttpClient();
      }

      // Load sync and config timestamps
      await this.loadLastSyncTimestamp();
      await this.loadLastConfigTimestamp();
      await this.loadConfiguration();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize from storage:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Create HTTP client with base configuration
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.endpoints.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor for authentication and rate limiting
    client.interceptors.request.use(
      async (config) => {
        // Check rate limiting
        if (this.connectionState.rateLimitedUntil && new Date() < this.connectionState.rateLimitedUntil) {
          const waitTime = this.connectionState.rateLimitedUntil.getTime() - Date.now();
          throw this.createVoiceAgentError({
            code: 'RATE_LIMITED',
            message: `Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
          });
        }

        // Add authentication token
        if (this.authToken?.token) {
          config.headers.Authorization = `Bearer ${this.authToken.token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for comprehensive error handling
    client.interceptors.response.use(
      (response) => {
        // Mark successful request
        this.connectionState.lastSuccessfulRequest = new Date();
        this.connectionState.consecutiveFailures = 0;
        this.connectionState.isOnline = true;
        
        return response;
      },
      async (error) => {
        // Track consecutive failures
        this.connectionState.consecutiveFailures++;
        
        // Handle specific error types
        if (error.response) {
          const status = error.response.status;
          
          switch (status) {
            case 401:
              // Authentication error
              await this.handleAuthenticationError(error);
              break;
            case 429:
              // Rate limiting
              this.handleRateLimitError(error);
              break;
            case 503:
            case 502:
            case 504:
              // Server errors - mark as offline temporarily
              this.connectionState.isOnline = false;
              break;
          }
        } else if (error.request) {
          // Network error
          this.connectionState.isOnline = false;
        }

        return Promise.reject(this.createVoiceAgentError(error));
      }
    );

    return client;
  }

  /**
   * Get default API endpoints configuration
   */
  private getDefaultEndpoints(): APIEndpoints {
    return {
      baseUrl: 'https://api.logistics.example.com',
      authEndpoint: '/auth/token',
      deliveryEndpoint: '/delivery/context',
      statusEndpoint: '/delivery/status',
    };
  }

  /**
   * Update HTTP client with current authentication token
   */
  private updateHttpClientAuth(): void {
    if (this.authToken?.token) {
      this.httpClient.defaults.headers.common.Authorization = `Bearer ${this.authToken.token}`;
    } else {
      delete this.httpClient.defaults.headers.common.Authorization;
    }
  }

  /**
   * Store authentication token securely
   */
  private async storeAuthToken(token: AuthToken): Promise<void> {
    try {
      await AsyncStorage.setItem('voice_agent_auth', JSON.stringify(token));
    } catch (error) {
      console.error('Failed to store auth token:', error);
    }
  }

  /**
   * Clear stored authentication token
   */
  private async clearAuthToken(): Promise<void> {
    this.authToken = null;
    this.updateHttpClientAuth();
    try {
      await AsyncStorage.removeItem('voice_agent_auth');
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  /**
   * Create standardized VoiceAgentError from various error types
   */
  private createVoiceAgentError(error: any): VoiceAgentError {
    let code = 'API_ERROR';
    let message = 'An API error occurred';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      code = `HTTP_${status}`;
      
      switch (status) {
        case 400:
          message = 'Invalid request. Please check your input and try again.';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          code = 'AUTHENTICATION_FAILED';
          break;
        case 403:
          message = 'Access denied. You don\'t have permission for this action.';
          code = 'ACCESS_DENIED';
          break;
        case 404:
          message = 'The requested resource was not found.';
          code = 'RESOURCE_NOT_FOUND';
          break;
        case 429:
          message = 'Too many requests. Please wait before trying again.';
          code = 'RATE_LIMITED';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          code = 'SERVER_ERROR';
          break;
        case 502:
        case 503:
        case 504:
          message = 'Service temporarily unavailable. Please try again later.';
          code = 'SERVICE_UNAVAILABLE';
          break;
        default:
          message = error.response.data?.message || error.response.statusText || message;
      }
    } else if (error.request) {
      // Network error
      code = 'NETWORK_ERROR';
      if (error.code === 'ECONNABORTED') {
        code = 'TIMEOUT_ERROR';
        message = 'Request timed out. Please check your connection and try again.';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = 'Cannot connect to server. Please check your internet connection.';
      } else {
        message = 'Network connection failed. Please check your internet connection.';
      }
    } else if (error.code) {
      // Use the error code directly if available
      code = error.code;
      message = error.message || message;
    } else {
      message = error.message || message;
    }

    return {
      code,
      message,
      details: error.response?.data,
      timestamp: new Date(),
    };
  }

  /**
   * Emit event to registered callbacks
   */
  private emitEvent(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle authentication errors with automatic retry
   */
  private async handleAuthenticationError(error: any): Promise<void> {
    console.warn('[IntegrationAPI] Authentication error detected');
    
    // Try to refresh token if available
    if (this.authToken?.refreshToken) {
      try {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          console.log('[IntegrationAPI] Token refreshed successfully');
          return;
        }
      } catch (refreshError) {
        console.error('[IntegrationAPI] Token refresh failed:', refreshError);
      }
    }

    // Clear invalid token
    await this.clearAuthToken();
    this.emitEvent('auth_expired', { 
      error: 'Authentication expired',
      requiresReauth: true 
    });
  }

  /**
   * Handle rate limiting errors
   */
  private handleRateLimitError(error: any): void {
    const retryAfter = error.response?.headers['retry-after'];
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
    
    this.connectionState.rateLimitedUntil = new Date(Date.now() + waitTime);
    
    console.warn(`[IntegrationAPI] Rate limited for ${waitTime}ms`);
    this.emitEvent('rate_limited', { 
      waitTime,
      retryAfter: this.connectionState.rateLimitedUntil 
    });
  }

  /**
   * Execute request with retry logic and error handling
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    requestId: string = this.generateRequestId()
  ): Promise<AxiosResponse<T>> {
    // Check if identical request is already pending
    if (this.pendingRequests.has(requestId)) {
      console.log(`[IntegrationAPI] Reusing pending request: ${requestId}`);
      return this.pendingRequests.get(requestId);
    }

    const executeRequest = async (attempt: number = 1): Promise<AxiosResponse<T>> => {
      try {
        // Check connection state before attempting
        if (!this.connectionState.isOnline && attempt === 1) {
          throw this.createVoiceAgentError({
            code: 'OFFLINE',
            message: 'Device is offline. Please check your internet connection.'
          });
        }

        // Check rate limiting
        if (this.connectionState.rateLimitedUntil && new Date() < this.connectionState.rateLimitedUntil) {
          const waitTime = this.connectionState.rateLimitedUntil.getTime() - Date.now();
          throw this.createVoiceAgentError({
            code: 'RATE_LIMITED',
            message: `Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
          });
        }

        console.log(`[IntegrationAPI] Executing request (attempt ${attempt}): ${requestId}`);
        const response = await requestFn();
        
        // Reset failure count on success
        this.connectionState.consecutiveFailures = 0;
        return response;

      } catch (error) {
        console.error(`[IntegrationAPI] Request failed (attempt ${attempt}):`, error);
        
        // Determine if we should retry
        const shouldRetry = this.shouldRetryRequest(error, attempt);
        
        if (shouldRetry && attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`[IntegrationAPI] Retrying in ${delay}ms (attempt ${attempt + 1})`);
          
          await this.delay(delay);
          return executeRequest(attempt + 1);
        }

        // Max retries reached or non-retryable error
        throw error;
      }
    };

    // Store pending request to avoid duplicates
    const requestPromise = executeRequest();
    this.pendingRequests.set(requestId, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Determine if a request should be retried based on error type
   */
  private shouldRetryRequest(error: any, attempt: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Don't retry authentication errors (need manual intervention)
    if (error.code === 'AUTHENTICATION_FAILED' || error.code === 'ACCESS_DENIED') {
      return false;
    }

    // Don't retry client errors (4xx except 429)
    if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
      return false;
    }

    // Retry network errors, timeouts, and server errors
    const retryableErrors = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED'
    ];

    return retryableErrors.includes(error.code) || 
           error.response?.status >= 500 ||
           error.response?.status === 429;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check connection status and emit events
   */
  private async checkConnectionStatus(): Promise<boolean> {
    try {
      // Simple ping to check connectivity
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      
      if (!this.connectionState.isOnline) {
        this.connectionState.isOnline = true;
        this.emitEvent('connection_restored', { timestamp: new Date() });
      }
      
      return true;
    } catch (error) {
      if (this.connectionState.isOnline) {
        this.connectionState.isOnline = false;
        this.emitEvent('connection_lost', { 
          error: this.createVoiceAgentError(error),
          timestamp: new Date() 
        });
      }
      
      return false;
    }
  }

  /**
   * Wait for initialization to complete
   */
  private async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return;
    
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve();
        } else {
          setTimeout(checkInitialized, 50);
        }
      };
      checkInitialized();
    });
  }

  /**
   * Authenticate with the host system using a token
   */
  async authenticate(token: string): Promise<boolean> {
    await this.waitForInitialization();

    try {
      const response = await this.executeWithRetry(() => 
        this.httpClient.post(this.endpoints.authEndpoint, { token })
      );

      if (response.data.success && response.data.data) {
        this.authToken = {
          token,
          expiresAt: new Date(response.data.data.expiresAt),
          refreshToken: response.data.data.refreshToken || undefined,
        };

        if (this.authToken) {
          await this.storeAuthToken(this.authToken);
        }
        this.updateHttpClientAuth();
        this.emitEvent('authenticated', { success: true });
        return true;
      }

      return false;
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('auth_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Synchronize delivery data from the host system
   */
  async syncDeliveryData(): Promise<DeliveryContext> {
    await this.waitForInitialization();

    if (!this.authToken) {
      const error = this.createVoiceAgentError({
        message: 'Authentication required for data synchronization',
        code: 'AUTH_REQUIRED'
      });
      throw error;
    }

    try {
      // Use the enhanced sync method that handles change detection
      const context = await this.performDataSync();
      
      // If no changes, still return the current context
      if (!context) {
        const response = await this.executeWithRetry(() =>
          this.httpClient.get(this.endpoints.deliveryEndpoint)
        );

        if (response.data.success && response.data.data) {
          return response.data.data;
        }

        throw this.createVoiceAgentError({
          message: response.data.error || 'Failed to sync delivery data',
          code: 'SYNC_FAILED'
        });
      }

      return context;
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('sync_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Send status update to the host system
   */
  async sendStatusUpdate(update: StatusUpdate): Promise<void> {
    await this.waitForInitialization();

    if (!this.authToken) {
      const error = this.createVoiceAgentError({
        message: 'Authentication required for status updates',
        code: 'AUTH_REQUIRED'
      });
      throw error;
    }

    try {
      const response = await this.executeWithRetry(() =>
        this.httpClient.post(this.endpoints.statusEndpoint, update)
      );

      if (response.data.success) {
        this.emitEvent('status_updated', update);
        
        // Also send notification callback to host system
        try {
          await this.notifyStatusChange(update);
        } catch (notificationError) {
          // Log notification error but don't fail the main update
          console.warn('Status notification failed:', notificationError);
        }
        
        return;
      }

      throw this.createVoiceAgentError({
        message: response.data.error || 'Failed to send status update',
        code: 'UPDATE_FAILED'
      });
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('update_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Get configuration from the host system
   */
  async getConfiguration(): Promise<VoiceAgentConfig> {
    await this.waitForInitialization();

    if (!this.authToken) {
      const error = this.createVoiceAgentError({
        message: 'Authentication required for configuration',
        code: 'AUTH_REQUIRED'
      });
      throw error;
    }

    try {
      const response = await this.executeWithRetry(() =>
        this.httpClient.get('/config')
      );

      if (response.data.success && response.data.data) {
        this.emitEvent('config_updated', response.data.data);
        return response.data.data;
      }

      throw this.createVoiceAgentError({
        message: response.data.error || 'Failed to get configuration',
        code: 'CONFIG_FAILED'
      });
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('config_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Register event callback for API events
   */
  registerEventCallback(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * Unregister event callback
   */
  unregisterEventCallback(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Update API endpoints configuration
   */
  async updateEndpoints(endpoints: APIEndpoints): Promise<void> {
    this.endpoints = endpoints;
    this.httpClient = this.createHttpClient();
    
    try {
      await AsyncStorage.setItem('voice_agent_endpoints', JSON.stringify(endpoints));
    } catch (error) {
      console.error('Failed to store endpoints:', error);
    }
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && new Date(this.authToken.expiresAt) > new Date();
  }

  /**
   * Get current authentication status
   */
  getAuthStatus(): { authenticated: boolean; expiresAt?: Date } {
    return {
      authenticated: this.isAuthenticated(),
      expiresAt: this.authToken?.expiresAt || undefined,
    };
  }

  /**
   * Refresh authentication token if refresh token is available
   */
  async refreshToken(): Promise<boolean> {
    if (!this.authToken?.refreshToken) {
      return false;
    }

    try {
      const response: AxiosResponse<APIResponse<{ token: string; expiresAt: string }>> = 
        await this.httpClient.post('/auth/refresh', {
          refreshToken: this.authToken.refreshToken
        });

      if (response.data.success && response.data.data) {
        this.authToken = {
          ...this.authToken,
          token: response.data.data.token,
          expiresAt: new Date(response.data.data.expiresAt),
        };

        await this.storeAuthToken(this.authToken);
        this.updateHttpClientAuth();
        this.emitEvent('token_refreshed', { success: true });
        return true;
      }

      return false;
    } catch (error) {
      this.emitEvent('refresh_error', error);
      return false;
    }
  }

  /**
   * Clear all stored data and reset client
   */
  async reset(): Promise<void> {
    await this.clearAuthToken();
    this.stopDataSync();
    this.stopConfigPolling();
    this.eventCallbacks.clear();
    
    try {
      await AsyncStorage.removeItem('voice_agent_endpoints');
      await AsyncStorage.removeItem('voice_agent_last_sync');
      await AsyncStorage.removeItem('voice_agent_config');
    } catch (error) {
      console.error('Failed to clear stored data:', error);
    }

    this.endpoints = this.getDefaultEndpoints();
    this.httpClient = this.createHttpClient();
    this.lastSyncTimestamp = null;
    this.lastConfigTimestamp = null;
    this.currentConfig = null;
    this.emitEvent('client_reset', {});
  }

  /**
   * Start automatic data synchronization with the host system
   */
  startDataSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      this.stopDataSync();
    }

    this.syncInterval = setInterval(async () => {
      if (!this.syncInProgress && this.isAuthenticated()) {
        try {
          await this.performDataSync();
        } catch (error) {
          console.error('Auto sync failed:', error);
          this.emitEvent('auto_sync_error', error);
        }
      }
    }, intervalMs);

    this.emitEvent('data_sync_started', { interval: intervalMs });
  }

  /**
   * Stop automatic data synchronization
   */
  stopDataSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.emitEvent('data_sync_stopped', {});
    }
  }

  /**
   * Perform data synchronization with change detection
   */
  private async performDataSync(): Promise<DeliveryContext | null> {
    if (this.syncInProgress) {
      return null;
    }

    this.syncInProgress = true;

    try {
      const params: any = {};
      if (this.lastSyncTimestamp) {
        params.since = this.lastSyncTimestamp.toISOString();
      }

      const response = await this.executeWithRetry(() =>
        this.httpClient.get(this.endpoints.deliveryEndpoint, { params })
      );

      if (response.data.success && response.data.data) {
        const { deliveryContext, hasChanges, timestamp } = response.data.data;
        
        if (hasChanges) {
          this.lastSyncTimestamp = new Date(timestamp);
          await this.storeLastSyncTimestamp();
          this.emitEvent('data_synced', { 
            context: deliveryContext, 
            hasChanges: true,
            timestamp: this.lastSyncTimestamp 
          });
          return deliveryContext;
        } else {
          this.emitEvent('data_synced', { 
            context: deliveryContext, 
            hasChanges: false,
            timestamp: this.lastSyncTimestamp 
          });
          return null;
        }
      }

      throw this.createVoiceAgentError({
        message: response.data.error || 'Failed to sync delivery data',
        code: 'SYNC_FAILED'
      });
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('sync_error', voiceAgentError);
      throw voiceAgentError;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Store last sync timestamp
   */
  private async storeLastSyncTimestamp(): Promise<void> {
    if (this.lastSyncTimestamp) {
      try {
        await AsyncStorage.setItem('voice_agent_last_sync', this.lastSyncTimestamp.toISOString());
      } catch (error) {
        console.error('Failed to store last sync timestamp:', error);
      }
    }
  }

  /**
   * Load last sync timestamp from storage
   */
  private async loadLastSyncTimestamp(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('voice_agent_last_sync');
      if (stored) {
        this.lastSyncTimestamp = new Date(stored);
      }
    } catch (error) {
      console.error('Failed to load last sync timestamp:', error);
    }
  }

  /**
   * Send status change notification to host system
   */
  async notifyStatusChange(update: StatusUpdate): Promise<void> {
    await this.waitForInitialization();

    if (!this.authToken) {
      const error = this.createVoiceAgentError({
        message: 'Authentication required for status notifications',
        code: 'AUTH_REQUIRED'
      });
      throw error;
    }

    try {
      const notificationPayload = {
        ...update,
        source: 'voice_agent',
        notificationType: 'status_change',
        timestamp: update.timestamp.toISOString()
      };

      const response: AxiosResponse<APIResponse> = 
        await this.httpClient.post(`${this.endpoints.statusEndpoint}/notify`, notificationPayload);

      if (response.data.success) {
        this.emitEvent('status_notification_sent', { update, success: true });
        return;
      }

      throw this.createVoiceAgentError({
        message: response.data.error || 'Failed to send status notification',
        code: 'NOTIFICATION_FAILED'
      });
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('status_notification_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Start configuration polling for real-time updates
   */
  startConfigPolling(intervalMs: number = 60000): void {
    if (this.configPollingInterval) {
      this.stopConfigPolling();
    }

    this.configPollingInterval = setInterval(async () => {
      if (this.isAuthenticated()) {
        try {
          await this.checkConfigurationUpdates();
        } catch (error) {
          console.error('Config polling failed:', error);
          this.emitEvent('config_polling_error', error);
        }
      }
    }, intervalMs);

    this.emitEvent('config_polling_started', { interval: intervalMs });
  }

  /**
   * Stop configuration polling
   */
  stopConfigPolling(): void {
    if (this.configPollingInterval) {
      clearInterval(this.configPollingInterval);
      this.configPollingInterval = null;
      this.emitEvent('config_polling_stopped', {});
    }
  }

  /**
   * Check for configuration updates from host system
   */
  private async checkConfigurationUpdates(): Promise<VoiceAgentConfig | null> {
    try {
      const params: any = {};
      if (this.lastConfigTimestamp) {
        params.since = this.lastConfigTimestamp.toISOString();
      }

      const response: AxiosResponse<APIResponse<{
        config: VoiceAgentConfig;
        hasChanges: boolean;
        timestamp: string;
      }>> = await this.httpClient.get('/config', { params });

      if (response.data.success && response.data.data) {
        const { config, hasChanges, timestamp } = response.data.data;
        
        if (hasChanges) {
          this.lastConfigTimestamp = new Date(timestamp);
          this.currentConfig = config;
          await this.storeConfiguration(config);
          await this.storeLastConfigTimestamp();
          
          this.emitEvent('config_updated', { 
            config, 
            hasChanges: true,
            timestamp: this.lastConfigTimestamp 
          });
          
          // Apply feature enable/disable based on new configuration
          await this.applyFeatureConfiguration(config);
          
          return config;
        } else {
          return null;
        }
      }

      throw this.createVoiceAgentError({
        message: response.data.error || 'Failed to check configuration updates',
        code: 'CONFIG_CHECK_FAILED'
      });
    } catch (error) {
      const voiceAgentError = this.createVoiceAgentError(error);
      this.emitEvent('config_error', voiceAgentError);
      throw voiceAgentError;
    }
  }

  /**
   * Store configuration to local storage
   */
  private async storeConfiguration(config: VoiceAgentConfig): Promise<void> {
    try {
      await AsyncStorage.setItem('voice_agent_config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to store configuration:', error);
    }
  }

  /**
   * Load configuration from local storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('voice_agent_config');
      if (stored) {
        this.currentConfig = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  /**
   * Store last config timestamp
   */
  private async storeLastConfigTimestamp(): Promise<void> {
    if (this.lastConfigTimestamp) {
      try {
        await AsyncStorage.setItem('voice_agent_last_config', this.lastConfigTimestamp.toISOString());
      } catch (error) {
        console.error('Failed to store last config timestamp:', error);
      }
    }
  }

  /**
   * Load last config timestamp from storage
   */
  private async loadLastConfigTimestamp(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('voice_agent_last_config');
      if (stored) {
        this.lastConfigTimestamp = new Date(stored);
      }
    } catch (error) {
      console.error('Failed to load last config timestamp:', error);
    }
  }

  /**
   * Apply feature configuration changes
   */
  private async applyFeatureConfiguration(config: VoiceAgentConfig): Promise<void> {
    const enabledFeatures = config.enabledFeatures || [];
    const featureChanges: { feature: string; enabled: boolean }[] = [];

    // Check for feature enable/disable changes
    const allFeatures = [
      'voice_recognition',
      'text_to_speech',
      'chat_interface',
      'quick_messages',
      'auto_sync',
      'config_polling',
      'offline_mode',
      'hands_free_mode'
    ];

    allFeatures.forEach(feature => {
      const isEnabled = enabledFeatures.includes(feature);
      featureChanges.push({ feature, enabled: isEnabled });
    });

    // Emit feature change events
    featureChanges.forEach(change => {
      this.emitEvent('feature_toggled', change);
    });

    // Apply specific feature configurations
    if (!enabledFeatures.includes('auto_sync')) {
      this.stopDataSync();
    }

    if (!enabledFeatures.includes('config_polling')) {
      this.stopConfigPolling();
    }

    this.emitEvent('features_applied', { 
      enabledFeatures, 
      changes: featureChanges 
    });
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): VoiceAgentConfig | null {
    return this.currentConfig;
  }

  /**
   * Check if a specific feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    if (!this.currentConfig) {
      return true; // Default to enabled if no config
    }
    return this.currentConfig.enabledFeatures.includes(feature);
  }

  /**
   * Force configuration refresh from host system
   */
  async refreshConfiguration(): Promise<VoiceAgentConfig> {
    this.lastConfigTimestamp = null; // Force full refresh
    const config = await this.checkConfigurationUpdates();
    if (config) {
      return config;
    }
    
    // Fallback to regular getConfiguration if no updates
    return await this.getConfiguration();
  }

  /**
   * Register callback for delivery data changes
   */
  onDeliveryDataChange(callback: (context: DeliveryContext) => void): void {
    this.registerEventCallback('data_synced', (data: any) => {
      if (data.hasChanges && data.context) {
        callback(data.context);
      }
    });
  }

  /**
   * Register callback for configuration changes
   */
  onConfigurationChange(callback: (config: VoiceAgentConfig) => void): void {
    this.registerEventCallback('config_updated', (data: any) => {
      if (data.hasChanges && data.config) {
        callback(data.config);
      }
    });
  }

  /**
   * Register callback for feature toggle events
   */
  onFeatureToggle(callback: (feature: string, enabled: boolean) => void): void {
    this.registerEventCallback('feature_toggled', (data: any) => {
      callback(data.feature, data.enabled);
    });
  }

  /**
   * Get synchronization status
   */
  getSyncStatus(): {
    isActive: boolean;
    lastSync: Date | null;
    inProgress: boolean;
  } {
    return {
      isActive: this.syncInterval !== null,
      lastSync: this.lastSyncTimestamp,
      inProgress: this.syncInProgress
    };
  }

  /**
   * Get configuration polling status
   */
  getConfigPollingStatus(): {
    isActive: boolean;
    lastCheck: Date | null;
  } {
    return {
      isActive: this.configPollingInterval !== null,
      lastCheck: this.lastConfigTimestamp
    };
  }

  /**
   * Get connection status and statistics
   */
  getConnectionStatus(): {
    isOnline: boolean;
    lastSuccessfulRequest: Date | null;
    consecutiveFailures: number;
    rateLimitedUntil: Date | null;
    isRateLimited: boolean;
  } {
    return {
      ...this.connectionState,
      isRateLimited: this.connectionState.rateLimitedUntil ? 
        new Date() < this.connectionState.rateLimitedUntil : false
    };
  }

  /**
   * Manually check and update connection status
   */
  async checkConnection(): Promise<boolean> {
    return await this.checkConnectionStatus();
  }

  /**
   * Configure retry behavior
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Clear rate limiting (useful for testing or manual override)
   */
  clearRateLimit(): void {
    this.connectionState.rateLimitedUntil = null;
    this.emitEvent('rate_limit_cleared', { timestamp: new Date() });
  }

  /**
   * Reset connection state (useful for recovery)
   */
  resetConnectionState(): void {
    this.connectionState = {
      isOnline: true,
      lastSuccessfulRequest: null,
      consecutiveFailures: 0,
      rateLimitedUntil: null,
    };
    this.pendingRequests.clear();
    this.emitEvent('connection_state_reset', { timestamp: new Date() });
  }

  /**
   * Get pending requests count (useful for monitoring)
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Cancel all pending requests
   */
  cancelPendingRequests(): void {
    this.pendingRequests.clear();
    this.emitEvent('pending_requests_cancelled', { timestamp: new Date() });
  }

  /**
   * Test connection with a simple ping
   */
  async ping(): Promise<{ success: boolean; latency: number; error?: VoiceAgentError }> {
    const startTime = Date.now();
    
    try {
      await this.executeWithRetry(() => 
        this.httpClient.get('/health', { timeout: 5000 })
      );
      
      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { 
        success: false, 
        latency, 
        error: this.createVoiceAgentError(error) 
      };
    }
  }

  /**
   * Enable/disable automatic connection recovery
   */
  setAutoRecovery(enabled: boolean, intervalMs: number = 30000): void {
    if (enabled) {
      // Start periodic connection checks
      setInterval(async () => {
        if (!this.connectionState.isOnline) {
          console.log('[IntegrationAPI] Attempting connection recovery...');
          const recovered = await this.checkConnectionStatus();
          if (recovered) {
            console.log('[IntegrationAPI] Connection recovered successfully');
          }
        }
      }, intervalMs);
    }
  }

  /**
   * Stop configuration polling
   */
  stopConfigPolling(): void {
    if (this.configPollingInterval) {
      clearInterval(this.configPollingInterval);
      this.configPollingInterval = null;
      this.configPollingStatus.isActive = false;
      
      this.emitEvent('config_polling_stopped', {
        timestamp: new Date()
      });
    }
  }

  /**
   * Check for configuration updates manually
   */
  async checkConfigurationUpdates(): Promise<boolean> {
    try {
      const newConfig = await this.refreshConfiguration();
      const hasChanges = JSON.stringify(newConfig) !== JSON.stringify(this.currentConfiguration);
      
      if (hasChanges) {
        this.emitEvent('configuration_changed', {
          oldConfig: this.currentConfiguration,
          newConfig,
          timestamp: new Date()
        });
      }
      
      return hasChanges;
    } catch (error) {
      console.error('[IntegrationAPI] Failed to check configuration updates:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): VoiceAgentConfig | null {
    return this.currentConfiguration;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return this.currentConfiguration?.enabledFeatures.includes(feature) || false;
  }

  /**
   * Get configuration polling status
   */
  getConfigPollingStatus(): { isActive: boolean; lastCheck: Date | null } {
    return {
      isActive: this.configPollingStatus.isActive,
      lastCheck: this.configPollingStatus.lastCheck
    };
  }

  /**
   * Register callback for delivery data changes
   */
  onDeliveryDataChange(callback: (context: DeliveryContext) => void): void {
    this.addEventListener('delivery_data_updated', (event, data) => {
      if (data?.context) {
        callback(data.context);
      }
    });
  }

  /**
   * Register callback for configuration changes
   */
  onConfigurationChange(callback: (config: VoiceAgentConfig) => void): void {
    this.addEventListener('configuration_changed', (event, data) => {
      if (data?.newConfig) {
        callback(data.newConfig);
      }
    });
  }

  /**
   * Register callback for feature toggles
   */
  onFeatureToggle(callback: (feature: string, enabled: boolean) => void): void {
    this.addEventListener('configuration_changed', (event, data) => {
      if (data?.oldConfig && data?.newConfig) {
        const oldFeatures = data.oldConfig.enabledFeatures || [];
        const newFeatures = data.newConfig.enabledFeatures || [];
        
        // Check for newly enabled features
        newFeatures.forEach(feature => {
          if (!oldFeatures.includes(feature)) {
            callback(feature, true);
          }
        });
        
        // Check for newly disabled features
        oldFeatures.forEach(feature => {
          if (!newFeatures.includes(feature)) {
            callback(feature, false);
          }
        });
      }
    });
  }
}