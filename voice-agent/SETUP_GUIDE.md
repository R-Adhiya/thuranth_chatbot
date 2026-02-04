# Voice Agent Setup Guide

## 🚀 New UI Design Overview

The Voice Agent now features a **modern chat-first interface** with:

- **Main Chat Interface**: Full-screen chat with parcel selection and multilingual support
- **Call Button**: Floating call button that opens a phone-like voice interface
- **Parcel Selection**: Choose specific parcels for contextual assistance
- **Multilingual Support**: English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati
- **LLM Integration**: Powered by your choice of AI models
- **Mobile Adaptable**: Designed for easy integration into existing apps

## 🎯 Key Features

### Chat Interface
- ✅ Parcel-specific conversations
- ✅ Language switching (7 languages)
- ✅ Context-aware responses
- ✅ Message history
- ✅ Typing indicators

### Call Interface
- ✅ Phone-like UI with call duration
- ✅ Voice recognition in multiple languages
- ✅ Real-time transcription
- ✅ Audio quality indicators
- ✅ Hands-free operation

### AI Integration
- ✅ Multiple LLM providers (Ollama, OpenAI, Gemini, Hugging Face)
- ✅ Context preservation
- ✅ Delivery-focused responses
- ✅ Multilingual processing

## 🛠️ Setup Instructions

### 1. Choose Your LLM Provider

#### Option A: Ollama (100% FREE, Runs Locally)
**Recommended for: Privacy, no API costs, offline usage**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the recommended model
ollama pull llama3.1:8b

# Start Ollama service
ollama serve
```

**Configuration:**
```typescript
// In your app initialization
import { OLLAMA_CONFIG } from './src/config/llm-config';
import { ChatManagerService } from './src/services/ChatManagerService';

const chatManager = new ChatManagerService(OLLAMA_CONFIG);
```

#### Option B: OpenAI (Free $5 Credit)
**Recommended for: Best quality, multilingual support**

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Get your API key
3. Configure:

```typescript
import { OPENAI_CONFIG } from './src/config/llm-config';

const config = {
  ...OPENAI_CONFIG,
  apiKey: 'your-openai-api-key-here'
};

const chatManager = new ChatManagerService(config);
```

#### Option C: Google Gemini (Free Tier)
**Recommended for: Good balance of quality and cost**

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Configure:

```typescript
import { GEMINI_CONFIG } from './src/config/llm-config';

const config = {
  ...GEMINI_CONFIG,
  apiKey: 'your-gemini-api-key-here'
};

const chatManager = new ChatManagerService(config);
```

#### Option D: Hugging Face (Free Tier)
**Recommended for: Experimentation, learning**

1. Sign up at [Hugging Face](https://huggingface.co/)
2. Create access token
3. Configure:

```typescript
import { HUGGINGFACE_CONFIG } from './src/config/llm-config';

const config = {
  ...HUGGINGFACE_CONFIG,
  apiKey: 'your-huggingface-token-here'
};

const chatManager = new ChatManagerService(config);
```

### 2. Voice Recognition Setup

The voice interface uses Web Speech API (free) with fallbacks:

```typescript
// Voice recognition is automatically configured
// No additional setup required for web browsers
// For React Native, ensure permissions are granted
```

### 3. Integration into Your App

#### Standalone Usage
```typescript
import VoiceAgentApp from './voice-agent/src/VoiceAgentApp';

export default function App() {
  return <VoiceAgentApp />;
}
```

#### Integration into Existing App
```typescript
import { ChatInterface, CallInterface } from './voice-agent/src/components';
import { ParcelSelectionService } from './voice-agent/src/services';

function MyDeliveryApp() {
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [showCall, setShowCall] = useState(false);
  
  return (
    <View style={{ flex: 1 }}>
      {/* Your existing app content */}
      
      {/* Add chat interface */}
      <ChatInterface
        selectedParcel={selectedParcel}
        onParcelSelect={setSelectedParcel}
        language="en"
        onLanguageChange={(lang) => console.log('Language:', lang)}
      />
      
      {/* Add call button */}
      <TouchableOpacity onPress={() => setShowCall(true)}>
        <Text>📞 Call Assistant</Text>
      </TouchableOpacity>
      
      {/* Call interface overlay */}
      <CallInterface
        isVisible={showCall}
        onClose={() => setShowCall(false)}
        selectedParcel={selectedParcel}
        language="en"
      />
    </View>
  );
}
```

## 🌍 Multilingual Configuration

### Supported Languages
- **English** (en) - Full support
- **Hindi** (hi) - हिन्दी
- **Tamil** (ta) - தமிழ்
- **Telugu** (te) - తెలుగు
- **Bengali** (bn) - বাংলা
- **Marathi** (mr) - मराठी
- **Gujarati** (gu) - ગુજરાતી

### Language Switching
```typescript
// Users can switch languages in the UI
// Or programmatically:
const handleLanguageChange = (language: string) => {
  setCurrentLanguage(language);
  // Voice recognition and TTS automatically adapt
};
```

## 📱 Mobile App Integration

### React Native Integration
```typescript
// Install required dependencies
npm install @react-native-async-storage/async-storage
npm install @react-native-voice/voice
npm install react-native-tts

// Import components
import { VoiceAgentApp } from './voice-agent';

// Use in your navigation
<Stack.Screen name="VoiceAgent" component={VoiceAgentApp} />
```

### Permissions Setup

#### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### iOS (ios/YourApp/Info.plist)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice commands</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app needs speech recognition for voice commands</string>
```

## 🔧 Configuration Options

### LLM Provider Comparison

| Provider | Cost | Performance | Multilingual | Setup | Offline |
|----------|------|-------------|--------------|-------|---------|
| **Ollama** | FREE | High | Good | Medium | ✅ |
| **OpenAI** | $0.002/1K tokens | Very High | Excellent | Easy | ❌ |
| **Gemini** | FREE (15 req/min) | High | Very Good | Easy | ❌ |
| **Hugging Face** | FREE | Medium | Limited | Easy | ❌ |

### Recommended Configurations

#### For Production (Best Quality)
```typescript
const productionConfig = {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 500,
};
```

#### For Development (Free)
```typescript
const developmentConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: 'llama3.1:8b',
  temperature: 0.7,
  maxTokens: 500,
};
```

#### For Multilingual (Best Support)
```typescript
const multilingualConfig = {
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 500,
};
```

## 🚀 Quick Start

1. **Clone and Install**
```bash
cd voice-agent
npm install
```

2. **Choose LLM Provider** (Ollama recommended for free usage)
```bash
# For Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b
ollama serve
```

3. **Run the Demo**
```bash
npm start
# Open demo.html in browser for web demo
# Or run on mobile device
```

4. **Test Features**
- Select a parcel from the dropdown
- Try chat: "What's the status of my delivery?"
- Try voice: Click call button and speak
- Switch languages using the language selector

## 🔍 Troubleshooting

### Common Issues

#### Ollama Connection Error
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

#### Voice Recognition Not Working
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Edge recommended)
- Test with simple phrases first

#### API Key Issues
- Verify API key is correct and active
- Check API quotas and billing
- Ensure proper environment variable setup

### Performance Optimization

#### For Better Response Times
```typescript
const optimizedConfig = {
  ...yourConfig,
  temperature: 0.5,  // Lower for more consistent responses
  maxTokens: 300,    // Reduce for faster responses
};
```

#### For Better Accuracy
```typescript
const accuracyConfig = {
  ...yourConfig,
  temperature: 0.3,  // Lower for more accurate responses
  maxTokens: 800,    // Higher for more detailed responses
};
```

## 📚 API Reference

### ChatManagerService
```typescript
const chatManager = new ChatManagerService(llmConfig);

// Process message
const response = await chatManager.processMessage(
  "What's my delivery status?",
  selectedParcel,
  "en"
);

// Configure LLM
chatManager.setLLMConfig(newConfig);

// Get history
const history = chatManager.getConversationHistory();
```

### ParcelSelectionService
```typescript
const parcelService = new ParcelSelectionService();

// Get active parcels
const parcels = await parcelService.getActiveParcels();

// Update parcel status
await parcelService.updateParcelStatus('PKG001', 'delivered');

// Search parcels
const results = await parcelService.searchParcels('PKG001');
```

### MultilingualVoiceService
```typescript
const voiceService = new MultilingualVoiceService();

// Initialize with language
await voiceService.initialize('hi');

// Speak text
await voiceService.speak('नमस्ते', 'hi');

// Process voice command
const response = await voiceService.processCommand(
  'स्थिति क्या है?',
  selectedParcel,
  'hi'
);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test with different LLM providers
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check troubleshooting section above
2. Review configuration options
3. Test with different LLM providers
4. Create issue with detailed error logs

---

**Ready to get started?** Choose your LLM provider above and follow the setup instructions!