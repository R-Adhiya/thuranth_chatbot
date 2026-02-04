/**
 * Voice Agent Constants
 * 
 * Centralized configuration and constants for the voice agent system
 */

import { TTSOptions } from '../types';

// Voice Recognition Settings
export const VOICE_RECOGNITION = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  CONFIDENCE_THRESHOLD: 0.7,
  SILENCE_TIMEOUT: 3000, // 3 seconds of silence
  NOISE_REDUCTION_ENABLED: true,
  SUPPORTED_LANGUAGES: ['en-US', 'en-IN', 'hi-IN'],
  DEFAULT_LANGUAGE: 'en-IN',
  
  // Audio quality thresholds
  QUALITY_THRESHOLDS: {
    NOISE_LEVEL_MAX: 0.3,
    SIGNAL_STRENGTH_MIN: 0.6,
    RECOGNITION_ACCURACY_MIN: 0.7,
    LATENCY_MAX: 2000, // 2 seconds
  },
  
  // Activation modes
  ACTIVATION_MODES: {
    PUSH_TO_TALK: 'push-to-talk',
    TAP_TO_SPEAK: 'tap-to-speak',
    VOICE_ACTIVATION: 'voice-activation', // Future feature
  },
} as const;

// Text-to-Speech Settings
export const TTS_SETTINGS = {
  DEFAULT_OPTIONS: {
    language: 'en-IN',
    rate: 0.6, // Slightly slower for clarity
    pitch: 1.0,
    volume: 0.8,
  } as TTSOptions,
  
  MAX_QUEUE_SIZE: 10,
  MAX_TEXT_LENGTH: 500, // Characters
  PRIORITY_INTERRUPT_ENABLED: true,
  
  // Voice preferences for Indian context
  PREFERRED_VOICES: {
    'en-IN': ['en-in-x-ene-local', 'en-in-x-end-local'],
    'hi-IN': ['hi-in-x-hie-local', 'hi-in-x-hid-local'],
    'en-US': ['en-us-x-sfg-local', 'en-us-x-iom-local'],
  },
} as const;

// Error Codes
export const ERROR_CODES = {
  // Voice Recognition Errors
  VOICE_RECOGNITION_FAILED: 'VOICE_RECOGNITION_FAILED',
  VOICE_PERMISSION_DENIED: 'VOICE_PERMISSION_DENIED',
  VOICE_NOT_AVAILABLE: 'VOICE_NOT_AVAILABLE',
  VOICE_TIMEOUT: 'VOICE_TIMEOUT',
  VOICE_LOW_CONFIDENCE: 'VOICE_LOW_CONFIDENCE',
  VOICE_AUDIO_QUALITY_POOR: 'VOICE_AUDIO_QUALITY_POOR',
  
  // TTS Errors
  TTS_INITIALIZATION_FAILED: 'TTS_INITIALIZATION_FAILED',
  TTS_NOT_INITIALIZED: 'TTS_NOT_INITIALIZED',
  TTS_PLAYBACK_FAILED: 'TTS_PLAYBACK_FAILED',
  TTS_VOICE_CHANGE_FAILED: 'TTS_VOICE_CHANGE_FAILED',
  
  // Intent Processing Errors
  INTENT_PROCESSING_FAILED: 'INTENT_PROCESSING_FAILED',
  INTENT_VALIDATION_FAILED: 'INTENT_VALIDATION_FAILED',
  INTENT_LOW_CONFIDENCE: 'INTENT_LOW_CONFIDENCE',
  
  // Domain Controller Errors
  DOMAIN_VALIDATION_FAILED: 'DOMAIN_VALIDATION_FAILED',
  INTENT_NOT_ALLOWED: 'INTENT_NOT_ALLOWED',
  OFF_TOPIC_QUERY: 'OFF_TOPIC_QUERY',
  
  // API Integration Errors
  API_CONNECTION_FAILED: 'API_CONNECTION_FAILED',
  API_AUTHENTICATION_FAILED: 'API_AUTHENTICATION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  API_TIMEOUT: 'API_TIMEOUT',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  
  // Context Errors
  CONTEXT_INVALID: 'CONTEXT_INVALID',
  CONTEXT_EXPIRED: 'CONTEXT_EXPIRED',
  CONTEXT_PRESERVATION_FAILED: 'CONTEXT_PRESERVATION_FAILED',
  
  // General Errors
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DEVICE_NOT_SUPPORTED: 'DEVICE_NOT_SUPPORTED',
} as const;

// Event Types
export const EVENTS = {
  // Voice Events
  VOICE_STARTED: 'voice_started',
  VOICE_STOPPED: 'voice_stopped',
  VOICE_RESULT: 'voice_result',
  VOICE_ERROR: 'voice_error',
  
  // TTS Events
  TTS_STARTED: 'tts_started',
  TTS_FINISHED: 'tts_finished',
  TTS_STOPPED: 'tts_stopped',
  TTS_PAUSED: 'tts_paused',
  TTS_RESUMED: 'tts_resumed',
  TTS_ERROR: 'tts_error',
  
  // Intent Events
  INTENT_PROCESSED: 'intent_processed',
  INTENT_VALIDATED: 'intent_validated',
  INTENT_REJECTED: 'intent_rejected',
  
  // Message Events
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  QUICK_MESSAGE_SENT: 'quick_message_sent',
  
  // Context Events
  CONTEXT_UPDATED: 'context_updated',
  CONTEXT_SWITCHED: 'context_switched',
  CONTEXT_PRESERVED: 'context_preserved',
  
  // API Events
  API_CONNECTED: 'api_connected',
  API_DISCONNECTED: 'api_disconnected',
  API_DATA_SYNCED: 'api_data_synced',
  API_ERROR: 'api_error',
  
  // Safety Events
  DRIVING_MODE_ENABLED: 'driving_mode_enabled',
  DRIVING_MODE_DISABLED: 'driving_mode_disabled',
  HANDS_FREE_ENABLED: 'hands_free_enabled',
  HANDS_FREE_DISABLED: 'hands_free_disabled',
  SAFETY_SITUATION_DETECTED: 'safety_situation_detected',
  
  // General Events
  ERROR_OCCURRED: 'error_occurred',
  PERFORMANCE_METRIC: 'performance_metric',
} as const;

// Performance Monitoring
export const PERFORMANCE = {
  METRICS: {
    VOICE_RECOGNITION_LATENCY: 'voice_recognition_latency',
    TTS_SPEAK_DURATION: 'tts_speak_duration',
    INTENT_PROCESSING_TIME: 'intent_processing_time',
    API_REQUEST_TIME: 'api_request_time',
    CONTEXT_SWITCH_TIME: 'context_switch_time',
  },
  
  THRESHOLDS: {
    VOICE_RECOGNITION_LATENCY_MAX: 3000, // 3 seconds
    TTS_SPEAK_DURATION_MAX: 10000, // 10 seconds
    INTENT_PROCESSING_TIME_MAX: 1000, // 1 second
    API_REQUEST_TIME_MAX: 5000, // 5 seconds
    CONTEXT_SWITCH_TIME_MAX: 500, // 0.5 seconds
  },
  
  MONITORING_INTERVAL: 60000, // 1 minute
  MAX_METRICS_HISTORY: 1000,
} as const;

// Voice Guidance Messages
export const VOICE_GUIDANCE = {
  ACTIVATION: {
    FIRST_TIME: "Welcome to Voice Assistant. Tap and hold the blue button to speak.",
    RETRY_AFTER_ERROR: "Please try again. Tap and hold the button to speak.",
    LOW_CONFIDENCE: "I didn't catch that clearly. Please speak closer to the microphone.",
    TIMEOUT: "I didn't hear anything. Please tap and hold the button and speak clearly.",
    NOISE_DETECTED: "There's too much background noise. Please find a quieter place.",
  },
  
  PROCESSING: {
    UNDERSTANDING: "I'm processing your request...",
    SEARCHING: "Let me check that for you...",
    CONNECTING: "Connecting to delivery system...",
  },
  
  ERRORS: {
    NETWORK_ERROR: "I'm having trouble connecting. Please check your internet connection.",
    PERMISSION_DENIED: "I need microphone permission to work. Please enable it in settings.",
    SERVICE_UNAVAILABLE: "The delivery service is temporarily unavailable. Please try again later.",
    UNKNOWN_ERROR: "Something went wrong. Please try again.",
  },
  
  SUCCESS: {
    MESSAGE_SENT: "Message sent successfully.",
    STATUS_UPDATED: "Status updated.",
    INFORMATION_RETRIEVED: "Here's what I found.",
  },
  
  DOMAIN_RESTRICTIONS: {
    OFF_TOPIC: "I can help only with delivery-related tasks. Please ask about your deliveries, navigation, or customer communication.",
    BLOCKED_CONTENT: "I cannot help with that request. Please ask about delivery-related topics.",
  },
} as const;

// Quick Message Templates
export const QUICK_MESSAGES = {
  TEMPLATES: {
    REACHED_PICKUP: "I have reached the pickup location",
    REACHED_DELIVERY: "I have reached the delivery location", 
    TRAFFIC_DELAY: "I am delayed due to traffic conditions",
    CUSTOMER_UNAVAILABLE: "Unable to contact the customer",
    DELIVERY_COMPLETE: "Delivery completed successfully",
    NEED_ASSISTANCE: "I need assistance with this delivery",
    VEHICLE_ISSUE: "Having vehicle issues, may be delayed",
    ADDRESS_UNCLEAR: "The delivery address is unclear, need clarification",
  },
  
  VOICE_TRIGGERS: {
    REACHED_PICKUP: ["reached pickup", "at pickup", "pickup location"],
    REACHED_DELIVERY: ["reached delivery", "at delivery", "delivery location"],
    TRAFFIC_DELAY: ["traffic delay", "stuck in traffic", "traffic jam"],
    CUSTOMER_UNAVAILABLE: ["customer not available", "cannot contact customer", "customer unavailable"],
    DELIVERY_COMPLETE: ["delivery done", "delivered", "delivery complete"],
    NEED_ASSISTANCE: ["need help", "need assistance", "help needed"],
    VEHICLE_ISSUE: ["vehicle problem", "bike issue", "vehicle trouble"],
    ADDRESS_UNCLEAR: ["address unclear", "cannot find address", "address problem"],
  },
  
  CATEGORIES: {
    STATUS: 'status',
    DELAY: 'delay', 
    CONTACT: 'contact',
    LOCATION: 'location',
    ASSISTANCE: 'assistance',
  },
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second
  RETRY_DELAY_MAX: 10000, // 10 seconds
  
  ENDPOINTS: {
    AUTH: '/auth/token',
    DELIVERY_DATA: '/delivery/context',
    STATUS_UPDATE: '/delivery/status',
    CONFIGURATION: '/config/voice-agent',
    HEALTH: '/health',
  },
  
  SYNC_INTERVALS: {
    DELIVERY_DATA: 30000, // 30 seconds
    CONFIGURATION: 300000, // 5 minutes
    HEALTH_CHECK: 60000, // 1 minute
  },
  
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    BURST_LIMIT: 10,
  },
} as const;

// Safety Configuration
export const SAFETY_CONFIG = {
  DRIVING_MODE: {
    VOICE_ONLY: true,
    MINIMAL_UI: true,
    AUTO_ENABLE_SPEED_THRESHOLD: 20, // km/h
    DISABLE_COMPLEX_INTERACTIONS: true,
  },
  
  HANDS_FREE_MODE: {
    NO_TOUCH_REQUIRED: true,
    VOICE_CONFIRMATIONS: true,
    SIMPLIFIED_RESPONSES: true,
    AUTO_ACCEPT_TIMEOUT: 10000, // 10 seconds
  },
  
  SAFETY_SITUATIONS: {
    EMERGENCY_BRAKING_THRESHOLD: -5, // m/s²
    SHARP_TURN_THRESHOLD: 45, // degrees
    HIGH_SPEED_THRESHOLD: 80, // km/h
    TRAFFIC_CONGESTION_SPEED: 10, // km/h
  },
  
  DISTRACTION_MINIMIZATION: {
    REDUCE_VISUAL_ELEMENTS: true,
    INCREASE_FONT_SIZES: true,
    SIMPLIFY_INTERACTIONS: true,
    VOICE_PRIORITY: true,
  },
} as const;

// Delivery Context Configuration
export const DELIVERY_CONFIG = {
  MAX_ACTIVE_DELIVERIES: 10,
  LOCATION_UPDATE_INTERVAL: 30000, // 30 seconds
  ROUTE_RECALCULATION_THRESHOLD: 500, // meters
  
  STATUS_TYPES: {
    PENDING: 'pending',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
  },
  
  PRIORITY_LEVELS: {
    URGENT: 'urgent',
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
  },
} as const;

// UI Configuration
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: '#007bff',
    SUCCESS: '#28a745',
    WARNING: '#ffc107',
    DANGER: '#dc3545',
    INFO: '#17a2b8',
    LIGHT: '#f8f9fa',
    DARK: '#343a40',
    MUTED: '#6c757d',
  },
  
  ANIMATIONS: {
    FADE_DURATION: 300,
    SLIDE_DURATION: 250,
    PULSE_DURATION: 800,
    BOUNCE_DURATION: 600,
  },
  
  DIMENSIONS: {
    VOICE_BUTTON_SIZE: 100,
    QUICK_MESSAGE_HEIGHT: 40,
    MESSAGE_BUBBLE_MAX_WIDTH: 280,
    HEADER_HEIGHT: 60,
  },
  
  FONTS: {
    SMALL: 12,
    NORMAL: 14,
    MEDIUM: 16,
    LARGE: 18,
    XLARGE: 24,
    TITLE: 28,
  },
} as const;

// Development and Testing
export const DEV_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: __DEV__,
  MOCK_API_RESPONSES: false,
  SIMULATE_NETWORK_DELAYS: false,
  
  TEST_DATA: {
    SAMPLE_DELIVERY_CONTEXT: {
      partnerId: 'test-partner-123',
      currentDeliveries: [],
      activeRoute: {
        id: 'route-123',
        stops: [],
        estimatedDuration: 0,
        distance: 0,
      },
      vehicleStatus: {
        id: 'vehicle-123',
        type: 'bike' as const,
        isMoving: false,
        speed: 0,
      },
      location: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
      workingHours: {
        start: new Date(),
        end: new Date(),
      },
    },
  },
} as const;

export default {
  VOICE_RECOGNITION,
  TTS_SETTINGS,
  ERROR_CODES,
  EVENTS,
  PERFORMANCE,
  VOICE_GUIDANCE,
  QUICK_MESSAGES,
  API_CONFIG,
  SAFETY_CONFIG,
  DELIVERY_CONFIG,
  UI_CONFIG,
  DEV_CONFIG,
};