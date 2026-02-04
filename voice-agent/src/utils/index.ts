/**
 * Voice Agent Utilities
 * 
 * Common utility functions for the voice agent system
 */

import { VoiceAgentError, AudioQualityMetrics } from '../types';
import { ERROR_CODES, PERFORMANCE, VOICE_RECOGNITION } from '../constants';

/**
 * Create a standardized VoiceAgentError
 */
export function createVoiceAgentError(
  code: string,
  message: string,
  details?: any
): VoiceAgentError {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
  };
}

/**
 * Debounce function to limit rapid function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Throttle function to limit function call frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Log performance metric
 */
export function logPerformanceMetric(
  metric: string,
  value: number,
  context?: any
): void {
  if (__DEV__) {
    console.log(`[Performance] ${metric}: ${value}ms`, context);
  }
  
  // In production, this would send to analytics service
  // Analytics.track('performance_metric', { metric, value, context });
}

/**
 * Validate audio quality metrics
 */
export function validateAudioQuality(
  metrics: AudioQualityMetrics
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  const thresholds = VOICE_RECOGNITION.QUALITY_THRESHOLDS;
  
  if (metrics.noiseLevel > thresholds.NOISE_LEVEL_MAX) {
    issues.push('High background noise detected');
  }
  
  if (metrics.signalStrength < thresholds.SIGNAL_STRENGTH_MIN) {
    issues.push('Weak audio signal');
  }
  
  if (metrics.recognitionAccuracy < thresholds.RECOGNITION_ACCURACY_MIN) {
    issues.push('Low recognition accuracy');
  }
  
  if (metrics.latency > thresholds.LATENCY_MAX) {
    issues.push('High audio latency');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
  jitter: boolean = true
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  if (jitter) {
    // Add random jitter (±25%)
    const jitterAmount = exponentialDelay * 0.25;
    return exponentialDelay + (Math.random() * 2 - 1) * jitterAmount;
  }
  
  return exponentialDelay;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Sanitize text for TTS (remove special characters, normalize)
 */
export function sanitizeTextForTTS(text: string): string {
  return text
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract numbers from text (useful for order IDs, addresses)
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+/g);
  return matches || [];
}

/**
 * Calculate similarity between two strings (Levenshtein distance)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * Fuzzy match text against a list of options
 */
export function fuzzyMatch(
  input: string,
  options: string[],
  threshold: number = 0.6
): { match: string; score: number } | null {
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  const normalizedInput = input.toLowerCase().trim();
  
  for (const option of options) {
    const normalizedOption = option.toLowerCase().trim();
    const score = calculateStringSimilarity(normalizedInput, normalizedOption);
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = option;
    }
  }
  
  return bestMatch ? { match: bestMatch, score: bestScore } : null;
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Deep clone object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Check if device has required capabilities
 */
export function checkDeviceCapabilities(): {
  hasMicrophone: boolean;
  hasSpeaker: boolean;
  hasNetworkConnection: boolean;
  supportedFeatures: string[];
} {
  // This would be implemented with actual device capability checks
  // For now, return optimistic defaults
  return {
    hasMicrophone: true,
    hasSpeaker: true,
    hasNetworkConnection: true,
    supportedFeatures: [
      'voice_recognition',
      'text_to_speech',
      'background_audio',
      'location_services',
    ],
  };
}

/**
 * Format location coordinates for display
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision: number = 4
): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if location is within delivery radius
 */
export function isWithinDeliveryRadius(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number = 0.5
): boolean {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radiusKm;
}

/**
 * Validate phone number format (Indian context)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Indian mobile number patterns
  const patterns = [
    /^[6-9]\d{9}$/, // 10 digit mobile
    /^\+91[6-9]\d{9}$/, // +91 prefix
    /^91[6-9]\d{9}$/, // 91 prefix
  ];
  
  const cleanPhone = phone.replace(/[\s-()]/g, '');
  return patterns.some(pattern => pattern.test(cleanPhone));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s-()]/g, '');
  
  if (cleanPhone.length === 10) {
    return `+91 ${cleanPhone.substr(0, 5)} ${cleanPhone.substr(5)}`;
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    const number = cleanPhone.substr(2);
    return `+91 ${number.substr(0, 5)} ${number.substr(5)}`;
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('+91')) {
    const number = cleanPhone.substr(3);
    return `+91 ${number.substr(0, 5)} ${number.substr(5)}`;
  }
  
  return phone; // Return original if format not recognized
}

/**
 * Get time of day greeting
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Check if current time is within working hours
 */
export function isWithinWorkingHours(
  startHour: number = 9,
  endHour: number = 21
): boolean {
  const currentHour = new Date().getHours();
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = calculateBackoffDelay(attempt, baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(
  json: string,
  fallback: T
): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substr(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Check if string contains any of the keywords
 */
export function containsKeywords(
  text: string,
  keywords: string[],
  caseSensitive: boolean = false
): boolean {
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchKeywords = caseSensitive ? keywords : keywords.map(k => k.toLowerCase());
  
  return searchKeywords.some(keyword => searchText.includes(keyword));
}

/**
 * Get battery level (mock implementation)
 */
export function getBatteryLevel(): Promise<number> {
  // This would use react-native-device-info or similar
  return Promise.resolve(0.85); // Mock 85% battery
}

/**
 * Check network connectivity
 */
export function checkNetworkConnectivity(): Promise<boolean> {
  // This would use @react-native-community/netinfo
  return Promise.resolve(true); // Mock connected state
}

/**
 * Log error with context
 */
export function logError(
  error: Error | VoiceAgentError,
  context?: any
): void {
  if (__DEV__) {
    console.error('[VoiceAgent Error]', error, context);
  }
  
  // In production, this would send to error tracking service
  // Crashlytics.recordError(error, context);
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;
  
  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }
  
  end(): number {
    const duration = Date.now() - this.startTime;
    logPerformanceMetric(this.label, duration);
    return duration;
  }
}

/**
 * Create performance timer
 */
export function createTimer(label: string): PerformanceTimer {
  return new PerformanceTimer(label);
}

export default {
  createVoiceAgentError,
  debounce,
  throttle,
  logPerformanceMetric,
  validateAudioQuality,
  calculateBackoffDelay,
  formatDuration,
  sanitizeTextForTTS,
  extractNumbers,
  calculateStringSimilarity,
  fuzzyMatch,
  generateId,
  deepClone,
  checkDeviceCapabilities,
  formatCoordinates,
  calculateDistance,
  isWithinDeliveryRadius,
  validatePhoneNumber,
  formatPhoneNumber,
  getTimeBasedGreeting,
  isWithinWorkingHours,
  retryWithBackoff,
  safeJsonParse,
  truncateText,
  capitalizeWords,
  containsKeywords,
  getBatteryLevel,
  checkNetworkConnectivity,
  logError,
  createTimer,
  PerformanceTimer,
};