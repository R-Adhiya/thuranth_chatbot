import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { CloudVoiceService } from '../services/CloudVoiceService';
import { CloudLLMService } from '../services/CloudLLMService';

interface CallInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  selectedParcel?: any;
  language: string;
  llmService: CloudLLMService;
  voiceService: CloudVoiceService;
}

const { width, height } = Dimensions.get('window');

export const CallInterface: React.FC<CallInterfaceProps> = ({
  isVisible,
  onClose,
  selectedParcel,
  language,
  llmService,
  voiceService,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      showCallInterface();
      initializeCall();
    } else {
      hideCallInterface();
      endCall();
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const showCallInterface = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const hideCallInterface = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const initializeCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Set up voice service event handlers
      voiceService.onVoiceResult = (result) => {
        setTranscript(result.transcript);
        processVoiceCommand(result.transcript);
      };
      
      voiceService.onVoiceError = (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        speak(getLocalizedText('voiceError'));
      };
      
      voiceService.onListeningStart = () => {
        setIsListening(true);
      };
      
      voiceService.onListeningEnd = () => {
        setIsListening(false);
      };
      
      voiceService.onSpeakingStart = () => {
        setIsSpeaking(true);
      };
      
      voiceService.onSpeakingEnd = () => {
        setIsSpeaking(false);
      };
      
      // Set language
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
      
      // Simulate connection delay
      setTimeout(() => {
        setConnectionStatus('connected');
        callStartTime.current = new Date();
        startDurationTimer();
        
        // Welcome message
        const welcomeMessage = getLocalizedText('callWelcome');
        speak(welcomeMessage);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      setConnectionStatus('disconnected');
      Alert.alert('Error', 'Failed to initialize voice call');
    }
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.current.getTime()) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const endCall = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setCallDuration(0);
    setConnectionStatus('disconnected');
    callStartTime.current = null;
    
    voiceService.stopListening();
    voiceService.stopSpeaking();
  };

  const toggleListening = async () => {
    if (connectionStatus !== 'connected') return;

    if (isListening) {
      voiceService.stopListening();
    } else {
      try {
        await voiceService.startListening();
      } catch (error) {
        console.error('Failed to start listening:', error);
        Alert.alert('Error', 'Failed to start voice recognition');
      }
    }
  };

  const processVoiceCommand = async (command: string) => {
    setIsListening(false);
    
    try {
      const response = await llmService.processMessage(
        command,
        selectedParcel,
        language
      );
      
      await speak(response);
    } catch (error) {
      console.error('Failed to process command:', error);
      await speak(getLocalizedText('processingError'));
    }
  };

  const speak = async (text: string) => {
    try {
      await voiceService.speak(text, language);
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const getLocalizedText = (key: string): string => {
    const texts: Record<string, Record<string, string>> = {
      callWelcome: {
        en: "Hello! I'm your voice assistant. How can I help you with your deliveries today?",
        hi: "नमस्ते! मैं आपका वॉयस असिस्टेंट हूं। आज मैं आपकी डिलीवरी में कैसे मदद कर सकता हूं?",
        ta: "வணக்கம்! நான் உங்கள் குரல் உதவியாளர். இன்று உங்கள் டெலிவரிகளில் நான் எப்படி உதவ முடியும்?",
        te: "నమస్కారం! నేను మీ వాయిస్ అసిస్టెంట్. ఈరోజు మీ డెలివరీలలో నేను ఎలా సహాయం చేయగలను?",
      },
      connecting: {
        en: "Connecting...",
        hi: "कनेक्ट हो रहा है...",
        ta: "இணைக்கிறது...",
        te: "కనెక్ట్ అవుతోంది...",
      },
      connected: {
        en: "Connected",
        hi: "जुड़ा हुआ",
        ta: "இணைக்கப்பட்டது",
        te: "కనెక్ట్ అయ్యింది",
      },
      tapToSpeak: {
        en: "Tap to speak",
        hi: "बोलने के लिए टैप करें",
        ta: "பேச தட்டவும்",
        te: "మాట్లాడటానికి నొక్కండి",
      },
      listening: {
        en: "Listening...",
        hi: "सुन रहा है...",
        ta: "கேட்கிறது...",
        te: "వింటోంది...",
      },
      speaking: {
        en: "Speaking...",
        hi: "बोल रहा है...",
        ta: "பேசுகிறது...",
        te: "మాట్లాడుతోంది...",
      },
      endCall: {
        en: "End Call",
        hi: "कॉल समाप्त करें",
        ta: "அழைப்பை முடிக்கவும்",
        te: "కాల్ ముగించు",
      },
      voiceError: {
        en: "Sorry, I couldn't hear you clearly. Please try again.",
        hi: "माफ करें, मैं आपको स्पष्ट रूप से नहीं सुन सका। कृपया पुनः प्रयास करें।",
        ta: "மன்னிக்கவும், உங்களை தெளிவாக கேட்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
        te: "క్షమించండి, మిమ్మల్ని స్పష్టంగా వినలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
      },
      processingError: {
        en: "Sorry, I couldn't process your request. Please try again.",
        hi: "माफ करें, मैं आपके अनुरोध को संसाधित नहीं कर सका। कृपया पुनः प्रयास करें।",
        ta: "மன்னிக்கவும், உங்கள் கோரிக்கையை செயல்படுத்த முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
        te: "క్షమించండి, మీ అభ్యర్థనను ప్రాసెస్ చేయలేకపోయాను. దయచేసి మళ్లీ ప్రయత్నించండి.",
      },
    };
    return texts[key]?.[language] || texts[key]?.['en'] || key;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    if (isSpeaking) return getLocalizedText('speaking');
    if (isListening) return getLocalizedText('listening');
    if (connectionStatus === 'connecting') return getLocalizedText('connecting');
    if (connectionStatus === 'connected') return getLocalizedText('tapToSpeak');
    return '';
  };

  const getStatusColor = (): string => {
    if (isSpeaking) return '#28a745';
    if (isListening) return '#dc3545';
    if (connectionStatus === 'connected') return '#007bff';
    return '#6c757d';
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.callInfo}>
          <Text style={styles.callTitle}>Voice Assistant</Text>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
        </View>
        <View style={[styles.connectionIndicator, { backgroundColor: getStatusColor() }]} />
      </View>

      {/* Main Call Area */}
      <View style={styles.callArea}>
        {/* Avatar/Visual Indicator */}
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.avatarIcon}>🤖</Text>
          </View>
        </Animated.View>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>

        {/* Transcript */}
        {transcript ? (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>You said:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        ) : null}

        {/* Selected Parcel Info */}
        {selectedParcel && (
          <View style={styles.parcelInfo}>
            <Text style={styles.parcelLabel}>Selected Parcel:</Text>
            <Text style={styles.parcelText}>{selectedParcel.trackingNumber}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Voice Button */}
        <TouchableOpacity
          style={[
            styles.voiceButton,
            isListening && styles.voiceButtonActive,
            connectionStatus !== 'connected' && styles.voiceButtonDisabled,
          ]}
          onPress={toggleListening}
          disabled={connectionStatus !== 'connected' || isSpeaking}
        >
          <Text style={styles.voiceButtonIcon}>
            {isListening ? '🎤' : '🎙️'}
          </Text>
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={onClose}
        >
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallText}>{getLocalizedText('endCall')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  callInfo: {
    flex: 1,
  },
  callTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  callDuration: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  callArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 50,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  transcriptContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  parcelInfo: {
    backgroundColor: 'rgba(0, 123, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  parcelLabel: {
    fontSize: 12,
    color: '#87ceeb',
    marginBottom: 4,
  },
  parcelText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  voiceButtonActive: {
    backgroundColor: '#dc3545',
  },
  voiceButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.5,
  },
  voiceButtonIcon: {
    fontSize: 30,
  },
  endCallButton: {
    alignItems: 'center',
  },
  endCallIcon: {
    fontSize: 24,
    marginBottom: 8,
    transform: [{ rotate: '135deg' }],
  },
  endCallText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
});