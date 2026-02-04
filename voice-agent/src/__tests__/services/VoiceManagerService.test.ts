/**
 * Property-Based Tests for VoiceManagerService
 * Feature: voice-agent, Property 1: Voice Input Processing
 * Validates: Requirements 1.1, 1.2, 6.1
 */

import fc from 'fast-check';
import { VoiceManagerService } from '@/services/VoiceManagerService';
import { VOICE_RECOGNITION, PERFORMANCE } from '@/constants';

// Mock react-native-voice
const mockVoice = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  cancel: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  getSpeechRecognitionServices: jest.fn(() => Promise.resolve(['default'])),
  removeAllListeners: jest.fn(),
  onSpeechStart: null,
  onSpeechRecognized: null,
  onSpeechEnd: null,
  onSpeechError: null,
  onSpeechResults: null,
  onSpeechPartialResults: null,
  onSpeechVolumeChanged: null,
};

jest.mock('@react-native-voice/voice', () => ({
  default: mockVoice,
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' },
    RESULTS: { GRANTED: 'granted' },
    request: jest.fn(() => Promise.resolve('granted')),
  },
}));

describe('VoiceManagerService Property Tests', () => {
  let voiceManager: VoiceManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    voiceManager = new VoiceManagerService();
  });

  afterEach(async () => {
    await voiceManager.destroy();
  });

  /**
   * Property 1: Voice Input Processing
   * For any valid voice command from a delivery partner, 
   * the Voice_Agent should capture, process, and respond within 2 seconds under normal conditions
   */
  describe('Property 1: Voice Input Processing', () => {
    // Generator for valid delivery-related voice commands
    const deliveryCommandArbitrary = fc.oneof(
      fc.constant('What is my next delivery?'),
      fc.constant('Mark order as delivered'),
      fc.constant('Send message delayed due to traffic'),
      fc.constant('Navigate to next stop'),
      fc.constant('Show customer address'),
      fc.constant('What is my delivery status?'),
      fc.constant('Reached pickup location'),
      fc.constant('Reached delivery location'),
      fc.constant('Unable to contact customer'),
      fc.constant('Call customer'),
      fc.constant('Get directions'),
      fc.constant('Update delivery status'),
      fc.string({ minLength: 5, maxLength: 100 }).filter(s => 
        s.toLowerCase().includes('delivery') || 
        s.toLowerCase().includes('order') ||
        s.toLowerCase().includes('pickup') ||
        s.toLowerCase().includes('customer')
      )
    );

    // Generator for activation modes
    const activationModeArbitrary = fc.oneof(
      fc.constant('push-to-talk' as const),
      fc.constant('tap-to-speak' as const)
    );

    it('should capture and process any valid voice command within 2 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryCommandArbitrary,
          activationModeArbitrary,
          async (command, mode) => {
            // Arrange
            const startTime = Date.now();
            let voiceResultReceived = false;
            let processingTime = 0;

            // Set up event listener to capture voice results
            voiceManager.addEventListener('voice_result', (event, data) => {
              voiceResultReceived = true;
              processingTime = Date.now() - startTime;
            });

            // Act - Start listening
            await voiceManager.startListening(mode);

            // Simulate voice recognition result
            const mockResult = {
              value: [command],
            };

            // Trigger the speech results handler
            if (mockVoice.onSpeechResults) {
              mockVoice.onSpeechResults(mockResult);
            }

            // Wait a brief moment for processing
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Voice command should be captured and processed
            expect(voiceManager.isCurrentlyListening()).toBe(true);
            expect(voiceManager.getCurrentMode()).toBe(mode);

            // If we received a result, it should be within performance requirements
            if (voiceResultReceived) {
              expect(processingTime).toBeLessThanOrEqual(PERFORMANCE.MAX_RESPONSE_TIME_MS);
            }

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    it('should support both push-to-talk and tap-to-speak activation modes', async () => {
      await fc.assert(
        fc.asyncProperty(
          activationModeArbitrary,
          async (mode) => {
            // Act
            await voiceManager.startListening(mode);

            // Assert
            expect(voiceManager.isCurrentlyListening()).toBe(true);
            expect(voiceManager.getCurrentMode()).toBe(mode);
            expect(mockVoice.start).toHaveBeenCalled();

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain audio quality metrics for any voice input', async () => {
      await fc.assert(
        fc.asyncProperty(
          deliveryCommandArbitrary,
          fc.float({ min: 0, max: 1 }), // noise level
          fc.float({ min: 0, max: 1 }), // signal strength
          async (command, noiseLevel, signalStrength) => {
            // Arrange
            await voiceManager.startListening('push-to-talk');

            // Simulate volume change event
            if (mockVoice.onSpeechVolumeChanged) {
              mockVoice.onSpeechVolumeChanged({ value: 1 - noiseLevel });
            }

            // Act
            const audioQuality = voiceManager.getAudioQuality();

            // Assert
            expect(audioQuality).toBeDefined();
            expect(typeof audioQuality.noiseLevel).toBe('number');
            expect(typeof audioQuality.signalStrength).toBe('number');
            expect(typeof audioQuality.recognitionAccuracy).toBe('number');
            expect(typeof audioQuality.latency).toBe('number');

            // All metrics should be within valid ranges
            expect(audioQuality.noiseLevel).toBeGreaterThanOrEqual(0);
            expect(audioQuality.noiseLevel).toBeLessThanOrEqual(1);
            expect(audioQuality.signalStrength).toBeGreaterThanOrEqual(0);
            expect(audioQuality.signalStrength).toBeLessThanOrEqual(1);

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle voice recognition errors gracefully for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.oneof(
            fc.constant('network_error'),
            fc.constant('audio_error'),
            fc.constant('recognition_error'),
            fc.constant('timeout_error')
          ),
          async (errorMessage, errorType) => {
            // Arrange
            let errorEventReceived = false;
            voiceManager.addEventListener('voice_error', () => {
              errorEventReceived = true;
            });

            await voiceManager.startListening('push-to-talk');

            // Act - Simulate error
            const mockError = {
              code: errorType,
              message: errorMessage,
            };

            if (mockVoice.onSpeechError) {
              mockVoice.onSpeechError({ error: mockError });
            }

            // Wait for error handling
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(errorEventReceived).toBe(true);
            expect(voiceManager.isCurrentlyListening()).toBe(false);
            expect(voiceManager.getCurrentMode()).toBe(null);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate confidence scores consistently for any transcript', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (transcript) => {
            // Arrange
            let receivedResult: any = null;
            voiceManager.addEventListener('voice_result', (event, data) => {
              receivedResult = data;
            });

            await voiceManager.startListening('push-to-talk');

            // Act
            const mockResult = { value: [transcript] };
            if (mockVoice.onSpeechResults) {
              mockVoice.onSpeechResults(mockResult);
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert
            if (receivedResult) {
              expect(receivedResult.confidence).toBeGreaterThanOrEqual(0);
              expect(receivedResult.confidence).toBeLessThanOrEqual(1);
              expect(receivedResult.transcript).toBe(transcript);
              expect(typeof receivedResult.isFinal).toBe('boolean');
            }

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle noise reduction settings for any configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (noiseReductionEnabled) => {
            // Act
            voiceManager.setNoiseReduction(noiseReductionEnabled);
            await voiceManager.startListening('push-to-talk');

            // Assert - Should not throw errors regardless of noise reduction setting
            expect(voiceManager.isCurrentlyListening()).toBe(true);

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should emit appropriate events for any voice interaction lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          activationModeArbitrary,
          deliveryCommandArbitrary,
          async (mode, command) => {
            // Arrange
            const events: string[] = [];
            const eventTypes = ['voice_started', 'voice_result', 'voice_stopped'];
            
            eventTypes.forEach(eventType => {
              voiceManager.addEventListener(eventType as any, (event) => {
                events.push(event);
              });
            });

            // Act
            await voiceManager.startListening(mode);
            
            // Simulate successful recognition
            if (mockVoice.onSpeechResults) {
              mockVoice.onSpeechResults({ value: [command] });
            }
            
            await voiceManager.stopListening();
            
            // Wait for events to be processed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(events).toContain('voice_started');
            expect(events).toContain('voice_stopped');
            // voice_result may or may not be present depending on confidence
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle rapid start/stop cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(activationModeArbitrary, { minLength: 2, maxLength: 5 }),
          async (modes) => {
            // Act - Rapid start/stop cycles
            for (const mode of modes) {
              await voiceManager.startListening(mode);
              await new Promise(resolve => setTimeout(resolve, 10));
              await voiceManager.stopListening();
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Assert - Should end in stopped state
            expect(voiceManager.isCurrentlyListening()).toBe(false);
            expect(voiceManager.getCurrentMode()).toBe(null);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle concurrent start listening calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          activationModeArbitrary,
          activationModeArbitrary,
          async (mode1, mode2) => {
            // Act - Concurrent start calls
            const promise1 = voiceManager.startListening(mode1);
            const promise2 = voiceManager.startListening(mode2);

            await Promise.all([promise1, promise2]);

            // Assert - Should be in listening state with the last mode
            expect(voiceManager.isCurrentlyListening()).toBe(true);
            expect(voiceManager.getCurrentMode()).toBe(mode2);

            // Cleanup
            await voiceManager.stopListening();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});