// Core Voice Agent Types

export interface VoiceManager {
  startListening(mode: 'push-to-talk' | 'tap-to-speak'): Promise<void>;
  stopListening(): void;
  speak(text: string, priority: 'high' | 'normal'): Promise<void>;
  setNoiseReduction(enabled: boolean): void;
  getAudioQuality(): AudioQualityMetrics;
}

export interface IntentProcessor {
  processInput(input: string, context: DeliveryContext): Promise<Intent>;
  validateIntent(intent: Intent): boolean;
  extractEntities(input: string): Entity[];
  updateContext(context: DeliveryContext): void;
}

export interface DomainController {
  validateIntent(intent: Intent): ValidationResult;
  getApprovedIntents(): string[];
  logRejectedQuery(query: string, reason: string): void;
  generateRejectionResponse(): string;
}

export interface QuickMessageHandler {
  getAvailableMessages(context: DeliveryContext): QuickMessage[];
  sendMessage(messageId: string, customization?: string): Promise<void>;
  registerVoiceTrigger(phrase: string, messageId: string): void;
}

export interface ChatManager {
  sendMessage(text: string): Promise<ChatMessage>;
  getConversationHistory(): ChatMessage[];
  clearHistory(): void;
  switchToVoiceMode(): void;
  switchToChatMode(): void;
  getCurrentMode(): 'voice' | 'chat';
  updateDeliveryContext(context: DeliveryContext): void;
  preserveContext(context: ConversationContext): void;
  restoreContext(): ConversationContext | null;
}

export interface ContextPreservation {
  preserveContext(context: ConversationContext): void;
  restoreContext(): ConversationContext | null;
  switchMode(fromMode: 'voice' | 'chat', toMode: 'voice' | 'chat'): void;
  updateDeliveryContext(context: DeliveryContext): void;
  isContextValid(): boolean;
  clearContext(): void;
}

export interface IntegrationAPIClient {
  authenticate(token: string): Promise<boolean>;
  syncDeliveryData(): Promise<DeliveryContext>;
  sendStatusUpdate(update: StatusUpdate): Promise<void>;
  getConfiguration(): Promise<VoiceAgentConfig>;
  registerEventCallback(event: string, callback: Function): void;
  
  // Data synchronization methods
  startDataSync(intervalMs?: number): void;
  stopDataSync(): void;
  getSyncStatus(): { isActive: boolean; lastSync: Date | null; inProgress: boolean };
  
  // Status change notification methods
  notifyStatusChange(update: StatusUpdate): Promise<void>;
  
  // Configuration management methods
  startConfigPolling(intervalMs?: number): void;
  stopConfigPolling(): void;
  refreshConfiguration(): Promise<VoiceAgentConfig>;
  getCurrentConfiguration(): VoiceAgentConfig | null;
  isFeatureEnabled(feature: string): boolean;
  getConfigPollingStatus(): { isActive: boolean; lastCheck: Date | null };
  
  // Event callback helpers
  onDeliveryDataChange(callback: (context: DeliveryContext) => void): void;
  onConfigurationChange(callback: (config: VoiceAgentConfig) => void): void;
  onFeatureToggle(callback: (feature: string, enabled: boolean) => void): void;
}

export interface SafetyManager {
  enableDrivingMode(): void;
  disableDrivingMode(): void;
  isDrivingModeActive(): boolean;
  enableHandsFreeMode(): void;
  disableHandsFreeMode(): void;
  isHandsFreeMode(): boolean;
  detectSafetySituation(): SafetySituation;
  minimizeDistractions(): void;
  restoreNormalInterface(): void;
  getOperationMode(): OperationMode;
  setOperationMode(mode: OperationMode): void;
  onSafetyStateChange(callback: (state: SafetyState) => void): void;
}

// Data Models
export interface DeliveryContext {
  partnerId: string;
  currentDeliveries: Delivery[];
  activeRoute: Route;
  vehicleStatus: VehicleStatus;
  location: GeoLocation;
  workingHours: TimeRange;
}

export interface Delivery {
  id: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  pickupLocation: Address;
  deliveryLocation: Address;
  customerInfo: CustomerInfo;
  estimatedTime: Date;
  specialInstructions?: string;
}

export interface Intent {
  type: 'delivery_status' | 'navigation' | 'communication' | 'quick_message';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

export interface QuickMessage {
  id: string;
  template: string;
  voiceTriggers: string[];
  category: 'status' | 'delay' | 'contact' | 'location';
}

export interface VoiceAgentConfig {
  enabledFeatures: string[];
  voiceSettings: VoiceSettings;
  integrationEndpoints: APIEndpoints;
  domainRestrictions: DomainRestrictions;
}

export interface AudioQualityMetrics {
  noiseLevel: number;
  signalStrength: number;
  recognitionAccuracy: number;
  latency: number;
}

// Supporting Types
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: GeoLocation;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Route {
  id: string;
  stops: Address[];
  estimatedDuration: number;
  distance: number;
}

export interface VehicleStatus {
  id: string;
  type: 'car' | 'bike' | 'truck' | 'van';
  isMoving: boolean;
  speed: number;
  fuelLevel?: number;
  batteryLevel?: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface VoiceSettings {
  language: string;
  speechRate: number;
  pitch: number;
  volume: number;
}

export interface APIEndpoints {
  baseUrl: string;
  authEndpoint: string;
  deliveryEndpoint: string;
  statusEndpoint: string;
}

export interface DomainRestrictions {
  allowedIntents: string[];
  blockedKeywords: string[];
  rejectionMessage: string;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestedAction?: string;
}

export interface StatusUpdate {
  deliveryId: string;
  status: string;
  timestamp: Date;
  location?: GeoLocation;
  notes?: string;
}

// Voice Recognition Types
export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceRecognitionError {
  code: string;
  message: string;
}

// TTS Types
export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  intent?: Intent;
}

export interface ConversationContext {
  messages: ChatMessage[];
  currentTopic?: string;
  deliveryContext: DeliveryContext;
}

// Error Types
export interface VoiceAgentError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Event Types
export type VoiceAgentEvent = 
  | 'voice_started'
  | 'voice_stopped'
  | 'voice_result'
  | 'voice_error'
  | 'tts_started'
  | 'tts_finished'
  | 'intent_processed'
  | 'message_sent'
  | 'context_updated'
  | 'error_occurred'
  | 'driving_mode_enabled'
  | 'driving_mode_disabled'
  | 'hands_free_enabled'
  | 'hands_free_disabled'
  | 'safety_situation_detected';

export interface EventCallback {
  (event: VoiceAgentEvent, data?: any): void;
}

// Safety Types
export interface SafetySituation {
  type: 'emergency_braking' | 'sharp_turn' | 'high_speed' | 'traffic_congestion' | 'none';
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  vehicleData?: {
    speed: number;
    acceleration: number;
    gpsAccuracy: number;
  };
}

export interface SafetyState {
  isDrivingMode: boolean;
  isHandsFreeMode: boolean;
  currentSituation: SafetySituation;
  operationMode: OperationMode;
  distractionsMinimized: boolean;
}

export type OperationMode = 
  | 'normal'           // Full interface available
  | 'driving'          // Voice-priority, minimal visual
  | 'hands_free'       // Voice-only, no touch required
  | 'safety_critical'; // Emergency mode, minimal interaction