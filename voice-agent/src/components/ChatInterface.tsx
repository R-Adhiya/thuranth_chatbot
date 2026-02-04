import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { CloudLLMService } from '../services/CloudLLMService';
import { ParcelSelectionService } from '../services/ParcelSelectionService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  language?: string;
}

interface Parcel {
  id: string;
  trackingNumber: string;
  status: string;
  destination: string;
  customerName: string;
}

interface ChatInterfaceProps {
  selectedParcel?: Parcel;
  onParcelSelect: (parcel: Parcel) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  llmService: CloudLLMService;
}

const { width, height } = Dimensions.get('window');

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedParcel,
  onParcelSelect,
  language,
  onLanguageChange,
  llmService,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [showParcelSelector, setShowParcelSelector] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const parcelService = new ParcelSelectionService();

  useEffect(() => {
    initializeChat();
    loadParcels();
  }, [language]);

  const initializeChat = async () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: getLocalizedText('welcome'),
      sender: 'agent',
      timestamp: new Date(),
      language,
    };
    setMessages([welcomeMessage]);
  };

  const loadParcels = async () => {
    try {
      const parcelData = await parcelService.getActiveParcels();
      setParcels(parcelData);
    } catch (error) {
      console.error('Failed to load parcels:', error);
    }
  };

  const getLocalizedText = (key: string): string => {
    const texts: Record<string, Record<string, string>> = {
      welcome: {
        en: "Hello! I'm your AI assistant. Please select a parcel to get started, or ask me anything about your deliveries.",
        hi: "नमस्ते! मैं आपका AI सहायक हूं। शुरू करने के लिए कृपया एक पार्सल चुनें, या अपनी डिलीवरी के बारे में कुछ भी पूछें।",
        ta: "வணக்கம்! நான் உங்கள் AI உதவியாளர். தொடங்க ஒரு பார்சலைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் டெலிவரி பற்றி எதையும் கேளுங்கள்.",
        te: "నమస్కారం! నేను మీ AI సహాయకుడను. ప్రారంభించడానికి దయచేసి ఒక పార్సెల్‌ను ఎంచుకోండి లేదా మీ డెలివరీల గురించి ఏదైనా అడగండి।",
      },
      selectParcel: {
        en: "Select Parcel",
        hi: "पार्सल चुनें",
        ta: "பார்சல் தேர்ந்தெடுக்கவும்",
        te: "పార్సెల్ ఎంచుకోండి",
      },
      typeMessage: {
        en: "Type your message...",
        hi: "अपना संदेश टाइप करें...",
        ta: "உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்...",
        te: "మీ సందేశాన్ని టైప్ చేయండి...",
      },
      send: {
        en: "Send",
        hi: "भेजें",
        ta: "அனுப்பு",
        te: "పంపు",
      },
      error: {
        en: "Sorry, I encountered an error. Please try again.",
        hi: "माफ करें, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुनः प्रयास करें।",
        ta: "மன்னிக்கவும், நான் ஒரு பிழையை எதிர்கொண்டேன். தயவுசெய்து மீண்டும் முயற்சிக்கவும்.",
        te: "క్షమించండి, నేను ఒక లోపాన్ని ఎదుర్కొన్నాను. దయచేసి మళ్లీ ప్రయత్నించండి।",
      },
    };
    return texts[key]?.[language] || texts[key]?.['en'] || key;
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      language,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await llmService.processMessage(
        inputText,
        selectedParcel,
        language
      );

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'agent',
        timestamp: new Date(),
        language,
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: getLocalizedText('error'),
        sender: 'agent',
        timestamp: new Date(),
        language,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectParcel = (parcel: Parcel) => {
    onParcelSelect(parcel);
    setShowParcelSelector(false);
    
    const selectionMessage: Message = {
      id: Date.now().toString(),
      text: `Selected parcel: ${parcel.trackingNumber} to ${parcel.destination}`,
      sender: 'agent',
      timestamp: new Date(),
      language,
    };
    setMessages(prev => [...prev, selectionMessage]);
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.sender === 'user' ? styles.userMessage : styles.agentMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        message.sender === 'user' ? styles.userMessageText : styles.agentMessageText,
      ]}>
        {message.text}
      </Text>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const renderParcelSelector = () => (
    <View style={styles.parcelSelector}>
      <Text style={styles.selectorTitle}>{getLocalizedText('selectParcel')}</Text>
      <ScrollView style={styles.parcelList}>
        {parcels.map(parcel => (
          <TouchableOpacity
            key={parcel.id}
            style={styles.parcelItem}
            onPress={() => selectParcel(parcel)}
          >
            <Text style={styles.parcelTrackingNumber}>{parcel.trackingNumber}</Text>
            <Text style={styles.parcelDestination}>{parcel.destination}</Text>
            <Text style={styles.parcelStatus}>{parcel.status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.parcelButton}
          onPress={() => setShowParcelSelector(!showParcelSelector)}
        >
          <Text style={styles.parcelButtonText}>
            {selectedParcel ? selectedParcel.trackingNumber : getLocalizedText('selectParcel')}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.languageSelector}>
          {['en', 'hi', 'ta', 'te'].map(lang => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageButton,
                language === lang && styles.activeLanguageButton,
              ]}
              onPress={() => onLanguageChange(lang)}
            >
              <Text style={[
                styles.languageButtonText,
                language === lang && styles.activeLanguageButtonText,
              ]}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Parcel Selector */}
      {showParcelSelector && renderParcelSelector()}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={[styles.messageContainer, styles.agentMessage]}>
            <Text style={styles.loadingText}>...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={getLocalizedText('typeMessage')}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>{getLocalizedText('send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  parcelButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: width * 0.5,
  },
  parcelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  languageButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
  },
  activeLanguageButton: {
    backgroundColor: '#28a745',
  },
  languageButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeLanguageButtonText: {
    color: '#fff',
  },
  parcelSelector: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight: 200,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  parcelList: {
    maxHeight: 150,
  },
  parcelItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  parcelTrackingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff',
  },
  parcelDestination: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  parcelStatus: {
    fontSize: 10,
    color: '#28a745',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  agentMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});