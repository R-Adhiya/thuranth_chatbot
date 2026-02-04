/**
 * Voice Agent Entry Point
 * 
 * This is the main entry point for the Voice Agent React Native module.
 * It exports the core components and services for integration into host applications.
 */

import { AppRegistry } from 'react-native';
import VoiceAgentApp from './src/VoiceAgentApp';

// Register the main app component
AppRegistry.registerComponent('VoiceAgent', () => VoiceAgentApp);

// Export core components and services for integration
export { default as VoiceAgentApp } from './src/VoiceAgentApp';
export { VoiceManagerService } from './src/services/VoiceManagerService';
export { IntentProcessorService } from './src/services/IntentProcessorService';
export { DomainControllerService } from './src/services/DomainControllerService';
export { QuickMessageHandlerService } from './src/services/QuickMessageHandlerService';
export { IntegrationAPIClientService } from './src/services/IntegrationAPIClientService';
export { ChatManagerService } from './src/services/ChatManagerService';

// Export types for TypeScript integration
export * from './src/types';
export * from './src/constants';