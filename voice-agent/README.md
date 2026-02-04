# Voice Agent

A voice-first AI assistant React Native module designed specifically for delivery partners in logistics systems. The assistant enables hands-free interaction with logistics systems while maintaining focus on driving safety.

## Features

- 🎙️ **Voice-first interaction** with push-to-talk and tap-to-speak modes
- 💬 **Chat interface** as fallback for stationary use
- ⚡ **Quick delivery messages** for rapid status updates
- 🔒 **Domain restriction** to delivery-related tasks only
- 🔗 **Integration-ready** architecture for embedding into existing apps
- 📱 **Mobile-optimized** for performance and battery efficiency
- 🛡️ **Safety-focused** design with hands-free operation

## Installation

```bash
npm install
# or
yarn install
```

### iOS Setup

```bash
cd ios && pod install
```

### Android Setup

Make sure you have the necessary permissions in your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Usage

### Basic Integration

```typescript
import { VoiceAgentApp } from 'voice-agent';

// Use as standalone app
export default function App() {
  return <VoiceAgentApp />;
}
```

### Service Integration

```typescript
import {
  VoiceManagerService,
  IntentProcessorService,
  QuickMessageHandlerService
} from 'voice-agent';

// Initialize services
const voiceManager = new VoiceManagerService();
const intentProcessor = new IntentProcessorService();
const quickMessageHandler = new QuickMessageHandlerService();

// Start voice recognition
await voiceManager.startListening('push-to-talk');
```

## Architecture

The Voice Agent follows a modular architecture with clear separation of concerns:

- **Voice Manager**: Handles voice input/output and speech services
- **Intent Processor**: Converts user input to actionable commands
- **Domain Controller**: Enforces delivery-only scope
- **Quick Message Handler**: Manages predefined status messages
- **Integration API Client**: Communicates with host applications
- **Chat Manager**: Provides text-based fallback interface

## Configuration

Create a configuration object to customize the voice agent:

```typescript
const config = {
  enabledFeatures: ['voice', 'chat', 'quickMessages'],
  voiceSettings: {
    language: 'en-US',
    speechRate: 0.5,
    pitch: 1.0,
    volume: 1.0
  },
  integrationEndpoints: {
    baseUrl: 'https://your-api.com',
    authEndpoint: '/auth',
    deliveryEndpoint: '/deliveries',
    statusEndpoint: '/status'
  }
};
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Development

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Type checking
npm run type-check

# Linting
npm run lint
```

## API Reference

### VoiceManager

```typescript
interface VoiceManager {
  startListening(mode: 'push-to-talk' | 'tap-to-speak'): Promise<void>;
  stopListening(): void;
  speak(text: string, priority: 'high' | 'normal'): Promise<void>;
  setNoiseReduction(enabled: boolean): void;
  getAudioQuality(): AudioQualityMetrics;
}
```

### IntentProcessor

```typescript
interface IntentProcessor {
  processInput(input: string, context: DeliveryContext): Promise<Intent>;
  validateIntent(intent: Intent): boolean;
  extractEntities(input: string): Entity[];
  updateContext(context: DeliveryContext): void;
}
```

## Quick Messages

The system includes predefined messages for common delivery scenarios:

- "Reached pickup location"
- "Reached delivery location"
- "Delayed due to traffic"
- "Unable to contact customer"

These can be triggered via voice commands or one-tap interface.

## Performance

- Voice response latency: < 2 seconds
- Optimized for low-end devices
- Minimal battery consumption
- Offline capability with caching
- Graceful network degradation

## Safety Features

- Hands-free operation modes
- Voice-priority interface during driving
- Audio confirmations for all actions
- Distraction minimization
- No-look usage capability

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository or contact the development team.