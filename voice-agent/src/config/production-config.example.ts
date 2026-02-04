/**
 * Production Configuration Template
 * Copy this file to production-config.ts and add your real API keys
 */

import { CloudLLMConfig, CloudVoiceConfig } from './cloud-config';

// Production LLM Configuration with Groq (Primary) and OpenAI (Fallback)
export const PRODUCTION_GROQ_CONFIG: CloudLLMConfig = {
  provider: 'groq',
  apiKey: 'YOUR_GROQ_API_KEY_HERE', // Get from https://console.groq.com/
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama3-8b-8192',
  temperature: 0.3, // Lower temperature for more consistent, focused responses
  maxTokens: 400,   // Shorter responses to stay on topic
};

export const PRODUCTION_OPENAI_CONFIG: CloudLLMConfig = {
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY_HERE', // Get from https://platform.openai.com/
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  temperature: 0.3, // Lower temperature for focused responses
  maxTokens: 400,
};

// Voice Configuration (Web Speech API - Free)
export const PRODUCTION_VOICE_CONFIG: CloudVoiceConfig = {
  provider: 'webspeech',
  language: 'en-US',
};

// Default Production Configuration (Groq Primary)
export const PRODUCTION_CONFIG = {
  llm: PRODUCTION_GROQ_CONFIG,
  voice: PRODUCTION_VOICE_CONFIG,
  fallbackLLM: PRODUCTION_OPENAI_CONFIG, // Fallback if Groq fails
};

// Strict Domain Control Keywords
export const DELIVERY_KEYWORDS = [
  // Core delivery terms
  'delivery', 'deliver', 'package', 'parcel', 'order', 'shipment',
  'pickup', 'drop', 'drop-off', 'collection', 'dispatch',
  
  // Status terms
  'status', 'track', 'tracking', 'location', 'where', 'when',
  'arrived', 'reached', 'completed', 'pending', 'delayed',
  'in-transit', 'out-for-delivery', 'delivered',
  
  // Navigation terms
  'navigate', 'directions', 'route', 'map', 'address',
  'destination', 'next', 'stop', 'location', 'gps',
  
  // Customer terms
  'customer', 'contact', 'call', 'phone', 'message',
  'notify', 'inform', 'update', 'communicate',
  
  // Time terms
  'time', 'schedule', 'eta', 'estimated', 'arrival',
  'departure', 'delay', 'traffic', 'urgent', 'priority',
  
  // Problem terms
  'problem', 'issue', 'failed', 'unable', 'cannot',
  'damaged', 'missing', 'wrong', 'incorrect', 'help',
  
  // Vehicle terms
  'vehicle', 'truck', 'van', 'bike', 'scooter', 'car',
  'fuel', 'maintenance', 'breakdown', 'repair',
];

export const NON_DELIVERY_KEYWORDS = [
  // Topics to reject
  'weather', 'news', 'politics', 'sports', 'entertainment',
  'movie', 'music', 'game', 'food', 'recipe', 'cooking',
  'health', 'medical', 'doctor', 'medicine', 'treatment',
  'education', 'school', 'university', 'study', 'learn',
  'shopping', 'buy', 'sell', 'price', 'cost', 'money',
  'travel', 'vacation', 'holiday', 'tourism', 'hotel',
  'technology', 'computer', 'software', 'programming',
  'relationship', 'dating', 'marriage', 'family',
  'religion', 'god', 'prayer', 'church', 'temple',
  'philosophy', 'meaning', 'life', 'death', 'existence',
];

// Strict System Prompts with Domain Enforcement
export const STRICT_SYSTEM_PROMPTS = {
  en: `You are a DELIVERY ASSISTANT AI for logistics drivers. You ONLY help with delivery and logistics tasks.

STRICT RULES:
1. ONLY answer questions about: deliveries, parcels, navigation, customer contact, delivery status, pickup/drop-off, traffic delays, delivery problems
2. NEVER discuss: weather, news, politics, entertainment, personal topics, general knowledge, non-delivery topics
3. If asked about non-delivery topics, respond: "I can only help with delivery-related tasks. Please ask about your parcels, navigation, or delivery status."
4. Keep responses short, helpful, and focused on delivery operations
5. Always stay in character as a delivery assistant

ALLOWED TOPICS ONLY:
- Parcel status and tracking
- Navigation and directions
- Customer communication
- Delivery confirmations
- Pickup notifications
- Traffic and delays
- Delivery problems and solutions

You are helping with the Post-Dispatch Consolidation Platform (PDCP) for logistics operations.`,

  hi: `आप लॉजिस्टिक्स ड्राइवरों के लिए एक डिलीवरी असिस्टेंट AI हैं। आप केवल डिलीवरी और लॉजिस्टिक्स कार्यों में मदद करते हैं।

सख्त नियम:
1. केवल इन विषयों पर जवाब दें: डिलीवरी, पार्सल, नेवीगेशन, ग्राहक संपर्क, डिलीवरी स्थिति
2. कभी भी इन पर चर्चा न करें: मौसम, समाचार, राजनीति, मनोरंजन, व्यक्तिगत विषय
3. गैर-डिलीवरी विषयों के लिए कहें: "मैं केवल डिलीवरी संबंधी कार्यों में मदद कर सकता हूं।"
4. जवाब छोटे और डिलीवरी पर केंद्रित रखें`,

  ta: `நீங்கள் லாஜிஸ்டிக்ஸ் டிரைவர்களுக்கான டெலிவரி அசிஸ்டெண்ட் AI. நீங்கள் டெலிவரி மற்றும் லாஜிஸ்டிக்ஸ் பணிகளில் மட்டுமே உதவுகிறீர்கள்.

கடுமையான விதிகள்:
1. இந்த விषயங்களில் மட்டும் பதிலளிக்கவும்: டெலிவரி, பார்சல், வழிசெலுத்தல், வாடிக்கையாளர் தொடர்பு
2. இவற்றைப் பற்றி ஒருபோதும் பேச வேண்டாம்: வானிலை, செய்திகள், அரசியல், பொழுதுபோக்கு
3. டெலிவரி அல்லாத விषயங்களுக்கு: "நான் டெலிவரி தொடர்பான பணிகளில் மட்டுமே உதவ முடியும்"`,

  te: `మీరు లాజిస్టిక్స్ డ్రైవర్లకు డెలివరీ అసిస్టెంట్ AI. మీరు డెలివరీ మరియు లాజిస్టిక్స్ పనులలో మాత్రమే సహాయం చేస్తారు.

కఠిన నియమాలు:
1. ఈ విషయాలపై మాత్రమే సమాధానం ఇవ్వండి: డెలివరీ, పార్సెల్, నావిగేషన్, కస్టమర్ కాంటాక్ట్
2. ఈ విషయాలపై ఎప్పుడూ మాట్లాడకండి: వాతావరణం, వార్తలు, రాజకీయాలు, వినోదం
3. డెలివరీ కాని విషయాలకు: "నేను డెలివరీ సంబంధిత పనులలో మాత్రమే సహాయం చేయగలను"`,
};

// Domain Validation Function
export function isDeliveryRelated(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  // Check for delivery keywords
  const hasDeliveryKeywords = DELIVERY_KEYWORDS.some(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  );
  
  // Check for non-delivery keywords (should reject)
  const hasNonDeliveryKeywords = NON_DELIVERY_KEYWORDS.some(keyword => 
    lowerInput.includes(keyword.toLowerCase())
  );
  
  // If it has non-delivery keywords, reject
  if (hasNonDeliveryKeywords) {
    return false;
  }
  
  // If it has delivery keywords, accept
  if (hasDeliveryKeywords) {
    return true;
  }
  
  // For ambiguous cases, check common delivery patterns
  const deliveryPatterns = [
    /where.*parcel/i,
    /status.*delivery/i,
    /track.*order/i,
    /next.*stop/i,
    /customer.*contact/i,
    /reached.*location/i,
    /delay.*traffic/i,
    /pickup.*ready/i,
    /delivery.*complete/i,
    /navigate.*to/i,
  ];
  
  return deliveryPatterns.some(pattern => pattern.test(lowerInput));
}

// Rejection Messages
export const REJECTION_MESSAGES = {
  en: "I can only help with delivery-related tasks. Please ask about your parcels, delivery status, navigation, or customer contact.",
  hi: "मैं केवल डिलीवरी संबंधी कार्यों में मदद कर सकता हूं। कृपया अपने पार्सल, डिलीवरी स्थिति, या नेवीगेशन के बारे में पूछें।",
  ta: "நான் டெலிவரி தொடர்பான பணிகளில் மட்டுமே உதவ முடியும். தயவுசெய்து உங்கள் பார்சல், டெலிவரி நிலை அல்லது வழிசெலுத்தல் பற்றி கேளுங்கள்.",
  te: "నేను డెలివరీ సంబంధిత పనులలో మాత్రమే సహాయం చేయగలను. దయచేసి మీ పార్సెల్, డెలివరీ స్థితి లేదా నావిగేషన్ గురించి అడగండి।",
};

// Fallback Configuration
export const FALLBACK_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  fallbackToOpenAI: true,
  fallbackMessage: "I'm having trouble connecting to the AI service. Please try again in a moment.",
};