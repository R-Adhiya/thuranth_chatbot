import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
} from 'react-native';
import { ChatInterface } from './components/ChatInterface';
import { CallInterface } from './components/CallInterface';
import { ParcelSelectionService, Parcel } from './services/ParcelSelectionService';
import { CloudLLMService } from './services/CloudLLMService';
import { CloudVoiceService } from './services/CloudVoiceService';
import { BEST_FREE_COMBO } from './config/cloud-config';

const { width, height } = Dimensions.get('window');

function VoiceAgentApp(): JSX.Element {
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const parcelService = new ParcelSelectionService();
  
  // Initialize cloud services with free configuration
  const [llmService] = useState(() => new CloudLLMService({
    ...BEST_FREE_COMBO.llm,
    // Replace with your actual API key
    apiKey: BEST_FREE_COMBO.llm.apiKey || 'demo-key'
  }));
  
  const [voiceService] = useState(() => new CloudVoiceService(BEST_FREE_COMBO.voice));

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize mock data for demo
      await parcelService.initializeMockData();
      
      // Load previously selected parcel if any
      const savedParcel = await parcelService.getSelectedParcel();
      if (savedParcel) {
        setSelectedParcel(savedParcel);
      }
      
      // Test voice service
      const voiceStatus = voiceService.getStatus();
      console.log('Voice service status:', voiceStatus);
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Initialization Error', 'Failed to initialize the voice agent. Some features may not work properly.');
      setIsInitialized(true); // Continue anyway
    }
  };

  const handleParcelSelect = async (parcel: Parcel) => {
    setSelectedParcel(parcel);
    await parcelService.setSelectedParcel(parcel);
  };

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    
    // Update voice service language
    const languageMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
    };
    
    voiceService.setLanguage(languageMap[language] || 'en-US');
  };

  const handleCallButtonPress = () => {
    if (!selectedParcel) {
      Alert.alert(
        'Select Parcel',
        'Please select a parcel first to start voice assistance.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if voice is supported
    if (!voiceService.isRecognitionSupported()) {
      Alert.alert(
        'Voice Not Supported',
        'Voice recognition is not supported in this browser. Please use Chrome or Edge for the best experience.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowCallInterface(true);
  };

  const handleCallEnd = () => {
    setShowCallInterface(false);
    // Stop any ongoing voice operations
    voiceService.stopListening();
    voiceService.stopSpeaking();
  };

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Voice Agent...</Text>
          <Text style={styles.loadingSubtext}>Setting up cloud services</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Chat Interface */}
        <View style={styles.chatContainer}>
          <ChatInterface
            selectedParcel={selectedParcel}
            onParcelSelect={handleParcelSelect}
            language={currentLanguage}
            onLanguageChange={handleLanguageChange}
            llmService={llmService}
          />
        </View>

        {/* Call Button */}
        <TouchableOpacity
          style={[
            styles.callButton,
            !selectedParcel && styles.callButtonDisabled,
          ]}
          onPress={handleCallButtonPress}
          disabled={!selectedParcel}
        >
          <View style={styles.callButtonInner}>
            <Text style={styles.callButtonIcon}>📞</Text>
            <Text style={styles.callButtonText}>Call</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Call Interface Overlay */}
      <CallInterface
        isVisible={showCallInterface}
        onClose={handleCallEnd}
        selectedParcel={selectedParcel}
        language={currentLanguage}
        llmService={llmService}
        voiceService={voiceService}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  chatContainer: {
    flex: 1,
  },
  callButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#28a745',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  callButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 2,
    shadowOpacity: 0.1,
  },
  callButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default VoiceAgentApp;