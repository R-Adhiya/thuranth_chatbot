/**
 * Mode Switcher Component
 * 
 * Provides seamless switching between voice and chat interaction modes
 * while preserving conversation context.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { ChatManagerService } from '../services/ChatManagerService';
import { VoiceManagerService } from '../services/VoiceManagerService';

interface ModeSwitcherProps {
  chatManager: ChatManagerService;
  voiceManager?: VoiceManagerService;
  onModeChange: (mode: 'voice' | 'chat') => void;
  currentMode: 'voice' | 'chat';
  disabled?: boolean;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  chatManager,
  voiceManager,
  onModeChange,
  currentMode,
  disabled = false
}) => {
  const [animatedValue] = useState(new Animated.Value(currentMode === 'voice' ? 0 : 1));
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Animate switch indicator
    Animated.timing(animatedValue, {
      toValue: currentMode === 'voice' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentMode, animatedValue]);

  const handleModeSwitch = async (newMode: 'voice' | 'chat') => {
    if (disabled || isTransitioning || newMode === currentMode) return;

    setIsTransitioning(true);

    try {
      // Preserve context before switching
      if (newMode === 'voice') {
        chatManager.switchToVoiceMode();
      } else {
        chatManager.switchToChatMode();
      }

      // Notify parent component
      onModeChange(newMode);
    } catch (error) {
      console.error('Error switching modes:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const switcherWidth = Dimensions.get('window').width - 32;
  const buttonWidth = (switcherWidth - 4) / 2;

  const indicatorTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, buttonWidth + 2],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.switcher, { width: switcherWidth }]}>
        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: buttonWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />

        {/* Voice Mode Button */}
        <TouchableOpacity
          style={[styles.modeButton, { width: buttonWidth }]}
          onPress={() => handleModeSwitch('voice')}
          disabled={disabled || isTransitioning}
        >
          <Text style={[
            styles.modeButtonText,
            currentMode === 'voice' && styles.activeModeText
          ]}>
            🎤 Voice
          </Text>
          {currentMode === 'voice' && (
            <Text style={styles.modeSubtext}>Hands-free</Text>
          )}
        </TouchableOpacity>

        {/* Chat Mode Button */}
        <TouchableOpacity
          style={[styles.modeButton, { width: buttonWidth }]}
          onPress={() => handleModeSwitch('chat')}
          disabled={disabled || isTransitioning}
        >
          <Text style={[
            styles.modeButtonText,
            currentMode === 'chat' && styles.activeModeText
          ]}>
            💬 Chat
          </Text>
          {currentMode === 'chat' && (
            <Text style={styles.modeSubtext}>Text input</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Context Preservation Indicator */}
      <View style={styles.contextIndicator}>
        <Text style={styles.contextText}>
          Context preserved • {chatManager.getConversationHistory().length} messages
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  switcher: {
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    flexDirection: 'row',
    position: 'relative',
    padding: 2,
  },
  indicator: {
    position: 'absolute',
    height: 46,
    backgroundColor: '#007AFF',
    borderRadius: 23,
    top: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 23,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeModeText: {
    color: '#fff',
  },
  modeSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  contextIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  contextText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});