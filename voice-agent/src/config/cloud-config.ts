/**
 * Cloud-Based Configuration (No Local Setup Required)
 * 
 * All these options work without installing anything locally.
 * Just sign up for free accounts and get API keys.
 */

export interface CloudLLMConfig {
  provider: 'gemini' | 'huggingface' | 'openai' | 'groq' | 'cohere';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CloudVoiceConfig {
  provider: 'webspeech' | 'assemblyai' | 'deepgram' | 'azure';
  apiKey?: string;
  region?: string;
  language?: string;
}

// ===== LLM PROVIDERS =====

// 🥇 RECOMMENDED: Google Gemini (Best Free Option)
export const GEMINI_FREE_CONFIG: CloudLLMConfig = {
  provider: 'gemini',
  apiKey: 'YOUR_GEMINI_API_KEY', // Get from https://makersuite.google.com/
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 500,
};

// 🥈 Hugging Face (Good Free Tier)
export const HUGGINGFACE_FREE_CONFIG: CloudLLMConfig = {
  provider: 'huggingface',
  apiKey: 'YOUR_HF_TOKEN', // Get from https://huggingface.co/settings/tokens
  model: 'microsoft/DialoGPT-medium',
  temperature: 0.7,
  maxTokens: 500,
};

// 🥉 Groq (Super Fast, Free Tier)
export const GROQ_FREE_CONFIG: CloudLLMConfig = {
  provider: 'groq',
  apiKey: 'YOUR_GROQ_API_KEY', // Get from https://console.groq.com/
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama3-8b-8192',
  temperature: 0.7,
  maxTokens: 500,
};

// OpenAI (Free $5 Credit)
export const OPENAI_PAID_CONFIG: CloudLLMConfig = {
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY', // Get from https://platform.openai.com/
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 500,
};

// Cohere (Free Tier)
export const COHERE_FREE_CONFIG: CloudLLMConfig = {
  provider: 'cohere',
  apiKey: 'YOUR_COHERE_API_KEY', // Get from https://dashboard.cohere.ai/
  baseUrl: 'https://api.cohere.ai/v1',
  model: 'command-light',
  temperature: 0.7,
  maxTokens: 500,
};

// ===== VOICE PROVIDERS =====

// 🥇 RECOMMENDED: Web Speech API (100% Free, Built-in)
export const WEBSPEECH_CONFIG: CloudVoiceConfig = {
  provider: 'webspeech',
  language: 'en-US', // Supports many languages
};

// AssemblyAI (5 hours free/month)
export const ASSEMBLYAI_CONFIG: CloudVoiceConfig = {
  provider: 'assemblyai',
  apiKey: 'YOUR_ASSEMBLYAI_KEY', // Get from https://www.assemblyai.com/
  language: 'en',
};

// Deepgram ($200 free credit)
export const DEEPGRAM_CONFIG: CloudVoiceConfig = {
  provider: 'deepgram',
  apiKey: 'YOUR_DEEPGRAM_KEY', // Get from https://console.deepgram.com/
  language: 'en-US',
};

// Azure Speech (5 hours free/month)
export const AZURE_SPEECH_CONFIG: CloudVoiceConfig = {
  provider: 'azure',
  apiKey: 'YOUR_AZURE_KEY', // Get from https://portal.azure.com/
  region: 'eastus',
  language: 'en-US',
};

// ===== RECOMMENDED COMBINATIONS =====

// 🎯 Best Free Combination
export const BEST_FREE_COMBO = {
  llm: GEMINI_FREE_CONFIG,
  voice: WEBSPEECH_CONFIG,
  cost: 'FREE',
  setup: 'Easy',
  quality: 'High',
};

// 🚀 Best Performance Combination
export const BEST_PERFORMANCE_COMBO = {
  llm: GROQ_FREE_CONFIG,
  voice: DEEPGRAM_CONFIG,
  cost: 'Free Tier',
  setup: 'Easy',
  quality: 'Very High',
};

// 💰 Best Paid Combination
export const BEST_PAID_COMBO = {
  llm: OPENAI_PAID_CONFIG,
  voice: AZURE_SPEECH_CONFIG,
  cost: 'Low Cost',
  setup: 'Easy',
  quality: 'Excellent',
};

// ===== SETUP INSTRUCTIONS =====

export const SETUP_INSTRUCTIONS = {
  gemini: {
    steps: [
      '1. Go to https://makersuite.google.com/',
      '2. Sign in with Google account',
      '3. Click "Get API Key"',
      '4. Create new API key',
      '5. Copy the key and replace YOUR_GEMINI_API_KEY',
    ],
    limits: '15 requests/minute, unlimited usage',
    cost: 'FREE',
  },
  
  huggingface: {
    steps: [
      '1. Go to https://huggingface.co/',
      '2. Create free account',
      '3. Go to Settings > Access Tokens',
      '4. Create new token with "Read" permission',
      '5. Copy token and replace YOUR_HF_TOKEN',
    ],
    limits: 'Rate limited but generous',
    cost: 'FREE',
  },
  
  groq: {
    steps: [
      '1. Go to https://console.groq.com/',
      '2. Sign up for free account',
      '3. Go to API Keys section',
      '4. Create new API key',
      '5. Copy key and replace YOUR_GROQ_API_KEY',
    ],
    limits: 'Very fast inference, good free tier',
    cost: 'FREE TIER',
  },
  
  webspeech: {
    steps: [
      '1. No setup required!',
      '2. Works in Chrome, Edge, Safari',
      '3. Built into the browser',
      '4. Supports 50+ languages',
    ],
    limits: 'No limits, works offline',
    cost: 'FREE',
  },
  
  assemblyai: {
    steps: [
      '1. Go to https://www.assemblyai.com/',
      '2. Sign up for free account',
      '3. Go to dashboard',
      '4. Copy your API key',
      '5. Replace YOUR_ASSEMBLYAI_KEY',
    ],
    limits: '5 hours free per month',
    cost: 'FREE TIER',
  },
};

// ===== LANGUAGE SUPPORT =====

export const LANGUAGE_SUPPORT = {
  gemini: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', '100+ languages'],
  huggingface: ['en', 'limited multilingual'],
  groq: ['en', 'hi', 'ta', 'te', 'multilingual models available'],
  webspeech: ['en-US', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'gu-IN'],
  assemblyai: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'],
  deepgram: ['en', 'es', 'fr', 'de', 'hi', 'ja', 'ko', '30+ languages'],
};

// ===== HELPER FUNCTIONS =====

export function getRecommendedConfig(requirements: {
  budget: 'free' | 'low' | 'medium';
  quality: 'basic' | 'good' | 'high';
  languages: string[];
  realtime: boolean;
}) {
  if (requirements.budget === 'free') {
    if (requirements.quality === 'high' && requirements.languages.length > 1) {
      return BEST_FREE_COMBO;
    }
    return {
      llm: HUGGINGFACE_FREE_CONFIG,
      voice: WEBSPEECH_CONFIG,
    };
  }
  
  if (requirements.realtime && requirements.quality === 'high') {
    return BEST_PERFORMANCE_COMBO;
  }
  
  return BEST_PAID_COMBO;
}

export function validateCloudConfig(config: CloudLLMConfig | CloudVoiceConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!config.provider) {
    errors.push('Provider is required');
  }
  
  if ('apiKey' in config && config.provider !== 'webspeech' && !config.apiKey) {
    errors.push(`API key is required for ${config.provider}`);
  }
  
  if ('apiKey' in config && config.apiKey?.includes('YOUR_')) {
    warnings.push('Please replace placeholder API key with your actual key');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Default configuration (completely free)
export const DEFAULT_CLOUD_CONFIG = BEST_FREE_COMBO;