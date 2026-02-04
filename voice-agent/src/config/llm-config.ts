import { LLMConfig } from '../services/ChatManagerService';

/**
 * LLM Configuration Options
 * 
 * Choose your preferred LLM provider and configure accordingly.
 * Free options are marked with [FREE] tag.
 */

// [FREE] Ollama - Run locally, completely free
export const OLLAMA_CONFIG: LLMConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434', // Default Ollama URL
  model: 'llama3.1:8b', // Recommended model for good performance
  temperature: 0.7,
  maxTokens: 500,
};

// [FREE TIER] OpenAI - $5 free credit for new users
export const OPENAI_CONFIG: LLMConfig = {
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY', // Replace with your API key
  model: 'gpt-3.5-turbo', // Most cost-effective option
  temperature: 0.7,
  maxTokens: 500,
};

// [FREE TIER] Google Gemini - 15 requests/minute free
export const GEMINI_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: 'YOUR_GEMINI_API_KEY', // Replace with your API key
  model: 'gemini-1.5-flash', // Free tier model
  temperature: 0.7,
  maxTokens: 500,
};

// [FREE TIER] Hugging Face - Generous free tier
export const HUGGINGFACE_CONFIG: LLMConfig = {
  provider: 'huggingface',
  apiKey: 'YOUR_HUGGINGFACE_API_KEY', // Replace with your API key
  model: 'microsoft/DialoGPT-medium', // Good for conversations
  temperature: 0.7,
  maxTokens: 500,
};

/**
 * Default configuration - Uses Ollama (completely free)
 * 
 * To use Ollama:
 * 1. Install Ollama: https://ollama.ai/
 * 2. Run: ollama pull llama3.1:8b
 * 3. Start Ollama service
 * 
 * To switch providers, change DEFAULT_LLM_CONFIG to your preferred option
 */
export const DEFAULT_LLM_CONFIG = OLLAMA_CONFIG;

/**
 * Alternative free models for different providers
 */
export const FREE_MODELS = {
  ollama: [
    'llama3.1:8b',      // Best overall performance
    'llama3.1:7b',      // Faster, good quality
    'mistral:7b',       // Good for multilingual
    'codellama:7b',     // If you need code help
    'phi3:mini',        // Very fast, smaller model
  ],
  
  openai: [
    'gpt-3.5-turbo',    // Most cost-effective
    'gpt-4o-mini',      // Newer, efficient model
  ],
  
  gemini: [
    'gemini-1.5-flash', // Free tier
    'gemini-1.5-pro',   // Better quality (limited free)
  ],
  
  huggingface: [
    'microsoft/DialoGPT-medium',
    'facebook/blenderbot-400M-distill',
    'microsoft/DialoGPT-large',
  ],
};

/**
 * Multilingual model recommendations
 */
export const MULTILINGUAL_MODELS = {
  ollama: 'llama3.1:8b',           // Good multilingual support
  openai: 'gpt-3.5-turbo',         // Excellent multilingual
  gemini: 'gemini-1.5-flash',      // Good multilingual
  huggingface: 'microsoft/DialoGPT-medium',
};

/**
 * Performance vs Cost comparison
 */
export const MODEL_COMPARISON = {
  'ollama/llama3.1:8b': {
    cost: 'FREE',
    performance: 'High',
    multilingual: 'Good',
    setup: 'Medium',
    offline: true,
  },
  'openai/gpt-3.5-turbo': {
    cost: '$0.002/1K tokens',
    performance: 'Very High',
    multilingual: 'Excellent',
    setup: 'Easy',
    offline: false,
  },
  'gemini/gemini-1.5-flash': {
    cost: 'FREE (15 req/min)',
    performance: 'High',
    multilingual: 'Very Good',
    setup: 'Easy',
    offline: false,
  },
  'huggingface/DialoGPT-medium': {
    cost: 'FREE',
    performance: 'Medium',
    multilingual: 'Limited',
    setup: 'Easy',
    offline: false,
  },
};

/**
 * Quick setup instructions
 */
export const SETUP_INSTRUCTIONS = {
  ollama: `
1. Install Ollama from https://ollama.ai/
2. Run: ollama pull llama3.1:8b
3. Start Ollama service
4. Use OLLAMA_CONFIG in your app
  `,
  
  openai: `
1. Sign up at https://platform.openai.com/
2. Get $5 free credit
3. Create API key
4. Replace YOUR_OPENAI_API_KEY in OPENAI_CONFIG
  `,
  
  gemini: `
1. Go to https://makersuite.google.com/
2. Create API key (free)
3. Replace YOUR_GEMINI_API_KEY in GEMINI_CONFIG
  `,
  
  huggingface: `
1. Sign up at https://huggingface.co/
2. Create access token (free)
3. Replace YOUR_HUGGINGFACE_API_KEY in HUGGINGFACE_CONFIG
  `,
};

/**
 * Helper function to validate configuration
 */
export function validateLLMConfig(config: LLMConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.provider) {
    errors.push('Provider is required');
  }
  
  if (!config.model) {
    errors.push('Model is required');
  }
  
  if (config.provider !== 'ollama' && !config.apiKey) {
    errors.push(`API key is required for ${config.provider}`);
  }
  
  if (config.provider === 'ollama' && !config.baseUrl) {
    errors.push('Base URL is required for Ollama');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to get recommended config based on requirements
 */
export function getRecommendedConfig(requirements: {
  budget: 'free' | 'low' | 'medium';
  performance: 'basic' | 'good' | 'high';
  multilingual: boolean;
  offline: boolean;
}): LLMConfig {
  if (requirements.offline) {
    return OLLAMA_CONFIG;
  }
  
  if (requirements.budget === 'free') {
    if (requirements.performance === 'high') {
      return requirements.multilingual ? GEMINI_CONFIG : OLLAMA_CONFIG;
    }
    return HUGGINGFACE_CONFIG;
  }
  
  if (requirements.performance === 'high' || requirements.multilingual) {
    return OPENAI_CONFIG;
  }
  
  return GEMINI_CONFIG;
}