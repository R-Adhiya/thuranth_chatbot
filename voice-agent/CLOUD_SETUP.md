# 🌐 Cloud Setup Guide - No Local Installation Required!

This guide shows you how to set up the Voice Agent using **100% cloud-based services** - no need to install anything locally like Ollama.

## 🎯 **Quick Start (5 Minutes)**

### **Step 1: Choose Your FREE LLM Provider**

#### **🥇 Google Gemini (RECOMMENDED - 100% FREE)**
```bash
# 1. Go to https://makersuite.google.com/
# 2. Sign in with Google account
# 3. Click "Get API Key" 
# 4. Create new API key
# 5. Copy the key
```

#### **🥈 Groq (SUPER FAST - FREE TIER)**
```bash
# 1. Go to https://console.groq.com/
# 2. Sign up for free
# 3. Go to API Keys
# 4. Create new key
# 5. Copy the key
```

#### **🥉 Hugging Face (FREE TIER)**
```bash
# 1. Go to https://huggingface.co/
# 2. Create account
# 3. Settings > Access Tokens
# 4. Create token with "Read" permission
# 5. Copy the token
```

### **Step 2: Configure Your App**

```typescript
// Replace in your code
import { GEMINI_FREE_CONFIG } from './src/config/cloud-config';
import { CloudLLMService } from './src/services/CloudLLMService';

const config = {
  ...GEMINI_FREE_CONFIG,
  apiKey: 'YOUR_ACTUAL_API_KEY_HERE' // Replace this!
};

const llmService = new CloudLLMService(config);
```

### **Step 3: Voice Setup (Already FREE!)**
```typescript
// Web Speech API is built into browsers - no setup needed!
import { WEBSPEECH_CONFIG } from './src/config/cloud-config';
import { CloudVoiceService } from './src/services/CloudVoiceService';

const voiceService = new CloudVoiceService(WEBSPEECH_CONFIG);
```

### **Step 4: Test It!**
```bash
# Open the demo
open voice-agent/demo.html

# Or run your app
npm start
```

## 🆓 **100% FREE Options**

### **Option 1: Gemini + Web Speech (RECOMMENDED)**
- **LLM**: Google Gemini (15 requests/minute forever)
- **Voice**: Web Speech API (unlimited, built-in)
- **Cost**: FREE
- **Quality**: High
- **Languages**: 100+ languages

```typescript
import { BEST_FREE_COMBO } from './src/config/cloud-config';
// This gives you Gemini + Web Speech
```

### **Option 2: Hugging Face + Web Speech**
- **LLM**: Hugging Face (generous free tier)
- **Voice**: Web Speech API (unlimited)
- **Cost**: FREE
- **Quality**: Good
- **Languages**: Limited multilingual

### **Option 3: Groq + Web Speech (FASTEST)**
- **LLM**: Groq (very fast responses)
- **Voice**: Web Speech API (unlimited)
- **Cost**: FREE TIER
- **Quality**: High
- **Speed**: Very Fast

## 🚀 **Detailed Setup Instructions**

### **Google Gemini Setup (5 minutes)**

1. **Go to Google AI Studio**
   ```
   https://makersuite.google.com/
   ```

2. **Sign in with Google account**
   - Use your existing Google account
   - No credit card required

3. **Create API Key**
   - Click "Get API Key" button
   - Click "Create API Key"
   - Copy the generated key

4. **Update your code**
   ```typescript
   const config = {
     provider: 'gemini',
     apiKey: 'AIzaSyC...', // Your actual key here
     model: 'gemini-1.5-flash',
     temperature: 0.7,
     maxTokens: 500,
   };
   ```

5. **Test it**
   ```typescript
   const llm = new CloudLLMService(config);
   const response = await llm.processMessage("Hello!");
   console.log(response); // Should get AI response
   ```

### **Groq Setup (3 minutes)**

1. **Go to Groq Console**
   ```
   https://console.groq.com/
   ```

2. **Sign up for free**
   - Email + password
   - No credit card required

3. **Create API Key**
   - Go to "API Keys" section
   - Click "Create API Key"
   - Copy the key

4. **Update your code**
   ```typescript
   const config = {
     provider: 'groq',
     apiKey: 'gsk_...', // Your actual key here
     baseUrl: 'https://api.groq.com/openai/v1',
     model: 'llama3-8b-8192',
     temperature: 0.7,
     maxTokens: 500,
   };
   ```

### **Hugging Face Setup (3 minutes)**

1. **Go to Hugging Face**
   ```
   https://huggingface.co/
   ```

2. **Create account**
   - Email + password
   - No credit card required

3. **Create Access Token**
   - Go to Settings > Access Tokens
   - Click "New token"
   - Select "Read" permission
   - Copy the token

4. **Update your code**
   ```typescript
   const config = {
     provider: 'huggingface',
     apiKey: 'hf_...', // Your actual token here
     model: 'microsoft/DialoGPT-medium',
     temperature: 0.7,
     maxTokens: 500,
   };
   ```

## 🎤 **Voice Setup (Already Works!)**

The voice functionality uses **Web Speech API** which is built into modern browsers:

- ✅ **Chrome** - Full support
- ✅ **Edge** - Full support  
- ✅ **Safari** - Good support
- ✅ **Firefox** - Limited support

### **Supported Languages**
- English (en-US, en-GB, en-AU)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Bengali (bn-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese

### **No Setup Required!**
```typescript
// This just works in browsers
const voiceService = new CloudVoiceService({
  provider: 'webspeech',
  language: 'en-US'
});

// Start listening
await voiceService.startListening();

// Speak text
await voiceService.speak('Hello!', 'en-US');
```

## 📱 **Mobile Integration**

### **React Native Setup**
```bash
# Install required packages
npm install @react-native-voice/voice react-native-tts

# For Android - add to AndroidManifest.xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />

# For iOS - add to Info.plist
<key>NSMicrophoneUsageDescription</key>
<string>Voice commands for delivery assistance</string>
```

### **Web App Integration**
```typescript
// Just import and use - no additional setup
import { CloudLLMService, CloudVoiceService } from './voice-agent/src/services';

const llm = new CloudLLMService(GEMINI_FREE_CONFIG);
const voice = new CloudVoiceService(WEBSPEECH_CONFIG);
```

## 🔧 **Configuration Examples**

### **Best Free Configuration**
```typescript
import { 
  GEMINI_FREE_CONFIG, 
  WEBSPEECH_CONFIG 
} from './src/config/cloud-config';

const llmService = new CloudLLMService({
  ...GEMINI_FREE_CONFIG,
  apiKey: 'YOUR_GEMINI_KEY'
});

const voiceService = new CloudVoiceService(WEBSPEECH_CONFIG);
```

### **Best Performance Configuration**
```typescript
import { 
  GROQ_FREE_CONFIG, 
  WEBSPEECH_CONFIG 
} from './src/config/cloud-config';

const llmService = new CloudLLMService({
  ...GROQ_FREE_CONFIG,
  apiKey: 'YOUR_GROQ_KEY'
});

const voiceService = new CloudVoiceService(WEBSPEECH_CONFIG);
```

### **Multilingual Configuration**
```typescript
const multilingualConfig = {
  provider: 'gemini',
  apiKey: 'YOUR_GEMINI_KEY',
  model: 'gemini-1.5-flash', // Best multilingual support
  temperature: 0.7,
  maxTokens: 500,
};

const voiceConfig = {
  provider: 'webspeech',
  language: 'hi-IN', // Hindi
};
```

## 🧪 **Testing Your Setup**

### **Test LLM**
```typescript
const llm = new CloudLLMService(yourConfig);

// Test basic functionality
const response = await llm.processMessage(
  "What's my delivery status?",
  selectedParcel,
  'en'
);

console.log('LLM Response:', response);
```

### **Test Voice**
```typescript
const voice = new CloudVoiceService(WEBSPEECH_CONFIG);

// Test speech recognition
voice.onVoiceResult = (result) => {
  console.log('Recognized:', result.transcript);
};

await voice.startListening();

// Test text-to-speech
await voice.speak('Hello, this is a test!');
```

### **Test Integration**
```typescript
// Full integration test
const handleVoiceInput = async (transcript: string) => {
  const response = await llm.processMessage(transcript, selectedParcel, 'en');
  await voice.speak(response, 'en-US');
};

voice.onVoiceResult = (result) => {
  handleVoiceInput(result.transcript);
};
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"API Key Invalid"**
```bash
# Check your API key
# Make sure you copied it correctly
# Verify it's not expired
# Check if you have the right permissions
```

#### **"Voice Recognition Not Working"**
```bash
# Check browser compatibility (use Chrome/Edge)
# Allow microphone permissions
# Test with simple phrases first
# Check if HTTPS is enabled (required for microphone)
```

#### **"CORS Error"**
```bash
# This happens in development
# Deploy to a proper server or use a proxy
# Or use the provided demo.html file
```

### **Browser Requirements**
- **HTTPS required** for microphone access
- **Modern browser** (Chrome 25+, Edge 79+, Safari 14+)
- **Microphone permissions** must be granted

### **API Limits**
- **Gemini**: 15 requests/minute (free forever)
- **Groq**: Rate limited but generous
- **Hugging Face**: Rate limited, good free tier
- **Web Speech**: No limits (built-in)

## 💡 **Pro Tips**

### **Optimize for Speed**
```typescript
// Use Groq for fastest responses
const fastConfig = {
  provider: 'groq',
  model: 'llama3-8b-8192', // Very fast
  temperature: 0.5, // Lower = faster
  maxTokens: 300, // Shorter = faster
};
```

### **Optimize for Quality**
```typescript
// Use Gemini for best quality
const qualityConfig = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 500,
};
```

### **Optimize for Multilingual**
```typescript
// Gemini has best multilingual support
const multilingualConfig = {
  provider: 'gemini',
  model: 'gemini-1.5-flash',
  // Supports 100+ languages natively
};
```

## 🎉 **You're Ready!**

With this cloud setup, you have:

- ✅ **No local installation** required
- ✅ **100% free options** available
- ✅ **Multilingual support** (7+ languages)
- ✅ **Voice recognition** and text-to-speech
- ✅ **Context-aware AI** responses
- ✅ **Mobile-ready** components

Choose your preferred LLM provider, get your free API key, and start using the Voice Agent immediately!

## 📞 **Need Help?**

1. **Check the demo**: Open `voice-agent/demo.html`
2. **Verify API keys**: Make sure they're correct and active
3. **Test in Chrome**: Best browser support
4. **Check console**: Look for error messages
5. **Try different providers**: If one doesn't work, try another

The cloud setup is designed to work out of the box with minimal configuration!