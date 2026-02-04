import { AppRegistry } from 'react-native';
import VoiceAgentApp from '../src/VoiceAgentApp';

// Register the app for web
AppRegistry.registerComponent('VoiceAgent', () => VoiceAgentApp);

// Run the app
AppRegistry.runApplication('VoiceAgent', {
    rootTag: document.getElementById('root')
});