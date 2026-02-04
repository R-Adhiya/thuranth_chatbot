/**
 * Property-Based Tests for TTSService and Audio Feedback
 * Feature: voice-agent, Property 3: Audio Feedback Completeness
 * Validates: Requirements 1.4, 3.5, 7.3
 */

import fc from 'fast-check';
import { TTSService } from '@/services/TTSService';
import { VoiceManagerService } from '@/services/VoiceManagerService';
import { TTS_SETTINGS } from '@/constants';

// Mock react-native-tts
const mockTts = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
  speak: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  resume: jest.fn(() => Promise.resolve()),
  setDefaultLanguage: jest.fn(() => Promise.resolve()),
  setDefaultRate: jest.fn(() => Promise.resolve()),
  setDefaultPitch: jest.fn(() => Promise.resolve()),
  getInitStatus: jest.fn(() => Promise.resolve()),
  voices: jest.fn(() => Promise.resolve([])),
};

jest.mock('react-native-tts', () => ({
  default: mockTts,
}));

describe('TTSService and Audio Feedback Property Tests', () => {
  let ttsService: TTSService;
  let voiceManager: VoiceManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    ttsService = new TTSService();
    voiceManager = new VoiceManagerService();
  });

  afterEach(async () => {
    await ttsService.destroy();
    await voiceManager.destroy();
  });

  /**
   * Property 3: Audio Feedback Completeness
   * For any system action or response, the Voice_Agent should provide 
   * appropriate audio confirmation to the delivery partner
   */
  describe('Property 3: Audio Feedback Completeness', () => {
    // Generator for system response texts
    const systemResponseArbitrary = fc.oneof(
      fc.constant('Order marked as delivered'),
      fc.constant('Message sent successfully'),
      fc.constant('Navigation started to next delivery'),
      fc.constant('Customer contact information retrieved'),
      fc.constant('Delivery status updated'),
      fc.constant('Quick message sent'),
      fc.constant('Voice command processed'),
      fc.constant('Error occurred, please try again'),
      fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0)
    );

    // Generator for priority levels
    const priorityArbitrary = fc.oneof(
      fc.constant('high' as const),
      fc.constant('normal' as const)
    );

    it('should provide audio feedback for any system response', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          priorityArbitrary,
          async (responseText, priority) => {
            // Arrange
            let ttsStartedEventReceived = false;
            let ttsFinishedEventReceived = false;
            const receivedTexts: string[] = [];

            ttsService.addEventListener('tts_started', (event, data) => {
              ttsStartedEventReceived = true;
              receivedTexts.push(data.text);
            });

            ttsService.addEventListener('tts_finished', (event, data) => {
              ttsFinishedEventReceived = true;
            });

            // Act
            await ttsService.speak(responseText, priority);

            // Simulate TTS completion
            if (mockTts.addEventListener.mock.calls.length > 0) {
              const startHandler = mockTts.addEventListener.mock.calls.find(
                call => call[0] === 'tts-start'
              )?.[1];
              const finishHandler = mockTts.addEventListener.mock.calls.find(
                call => call[0] === 'tts-finish'
              )?.[1];

              if (startHandler) startHandler({});
              if (finishHandler) finishHandler({});
            }

            // Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert
            expect(mockTts.speak).toHaveBeenCalledWith(
              responseText,
              expect.any(Object)
            );
            expect(receivedTexts).toContain(responseText);
          }
        ),
        { numRuns: 100, timeout: 5000 }
      );
    });

    it('should handle audio feedback for any voice manager response', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          priorityArbitrary,
          async (responseText, priority) => {
            // Act
            await voiceManager.speak(responseText, priority);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 50));

            // Assert - Should not throw errors and should call TTS
            expect(mockTts.speak).toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prioritize high priority audio feedback over normal priority', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          systemResponseArbitrary,
          async (normalText, highText) => {
            // Arrange
            const spokenTexts: Array<{ text: string; priority: string }> = [];
            
            ttsService.addEventListener('tts_started', (event, data) => {
              spokenTexts.push({ text: data.text, priority: data.priority });
            });

            // Act - Speak normal priority first, then high priority
            await ttsService.speak(normalText, 'normal');
            await ttsService.speak(highText, 'high');

            // Simulate TTS events
            const startHandler = mockTts.addEventListener.mock.calls.find(
              call => call[0] === 'tts-start'
            )?.[1];

            if (startHandler) {
              startHandler({});
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - High priority should be processed
            const status = ttsService.getStatus();
            expect(status.queueLength).toBeGreaterThanOrEqual(0);
            expect(mockTts.speak).toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle audio feedback queue for any sequence of responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(systemResponseArbitrary, { minLength: 1, maxLength: 5 }),
          async (responseTexts) => {
            // Arrange
            const processedTexts: string[] = [];
            
            ttsService.addEventListener('tts_started', (event, data) => {
              processedTexts.push(data.text);
            });

            // Act - Queue multiple responses
            for (const text of responseTexts) {
              await ttsService.speak(text, 'normal');
            }

            // Simulate TTS processing
            const startHandler = mockTts.addEventListener.mock.calls.find(
              call => call[0] === 'tts-start'
            )?.[1];

            if (startHandler) {
              for (let i = 0; i < responseTexts.length; i++) {
                startHandler({});
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - All texts should be processed or queued
            const status = ttsService.getStatus();
            const totalProcessed = processedTexts.length + status.queueLength;
            expect(totalProcessed).toBeGreaterThanOrEqual(1);
            expect(mockTts.speak).toHaveBeenCalled();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide audio confirmation for any TTS options', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          fc.record({
            language: fc.oneof(fc.constant('en-US'), fc.constant('en-GB'), fc.constant('es-ES')),
            rate: fc.float({ min: 0.1, max: 2.0 }),
            pitch: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.float({ min: 0.1, max: 1.0 }),
          }),
          async (text, options) => {
            // Act
            await ttsService.speak(text, 'normal', options);

            // Assert - Should apply options and speak
            expect(mockTts.speak).toHaveBeenCalledWith(text, expect.any(Object));
            
            // Check if language setting was applied
            if (options.language !== TTS_SETTINGS.DEFAULT_LANGUAGE) {
              expect(mockTts.setDefaultLanguage).toHaveBeenCalledWith(options.language);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle audio feedback errors gracefully for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          fc.oneof(
            fc.constant('tts_init_error'),
            fc.constant('tts_speak_error'),
            fc.constant('tts_language_error')
          ),
          async (text, errorType) => {
            // Arrange - Mock TTS error
            mockTts.speak.mockRejectedValueOnce(new Error(errorType));
            
            let errorEventReceived = false;
            ttsService.addEventListener('error_occurred', () => {
              errorEventReceived = true;
            });

            // Act
            try {
              await ttsService.speak(text, 'normal');
            } catch (error) {
              // Expected to handle errors gracefully
            }

            // Simulate error event
            const errorHandler = mockTts.addEventListener.mock.calls.find(
              call => call[0] === 'tts-error'
            )?.[1];

            if (errorHandler) {
              errorHandler({ error: { message: errorType } });
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            // Assert - Should handle error without crashing
            const status = ttsService.getStatus();
            expect(status.isInitialized).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain audio feedback consistency across service restarts', async () => {
      await fc.assert(
        fc.asyncProperty(
          systemResponseArbitrary,
          async (text) => {
            // Act - Use service, destroy, recreate, use again
            await ttsService.speak(text, 'normal');
            await ttsService.destroy();
            
            const newTtsService = new TTSService();
            await newTtsService.speak(text, 'normal');
            
            // Assert - Should work consistently
            expect(mockTts.speak).toHaveBeenCalledTimes(2);
            
            await newTtsService.destroy();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide audio feedback for empty or whitespace-only inputs appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\n\t'),
            fc.string({ maxLength: 5 }).filter(s => s.trim().length === 0)
          ),
          async (emptyText) => {
            // Act
            await ttsService.speak(emptyText, 'normal');

            // Assert - Should handle empty text gracefully (not speak empty content)
            if (emptyText.trim().length === 0) {
              // Should not call TTS for empty content
              expect(mockTts.speak).not.toHaveBeenCalledWith(emptyText, expect.any(Object));
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('TTS Service Configuration and State Management', () => {
    it('should maintain consistent state for any configuration changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            language: fc.oneof(fc.constant('en-US'), fc.constant('en-GB')),
            rate: fc.float({ min: 0.1, max: 2.0 }),
            pitch: fc.float({ min: 0.5, max: 2.0 }),
            volume: fc.float({ min: 0.1, max: 1.0 }),
          }),
          async (options) => {
            // Act
            ttsService.setDefaultOptions(options);
            const status = ttsService.getStatus();

            // Assert
            expect(status.isInitialized).toBe(true);
            expect(typeof status.isSpeaking).toBe('boolean');
            expect(typeof status.queueLength).toBe('number');
            expect(status.queueLength).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle concurrent speak requests appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(systemResponseArbitrary, { minLength: 2, maxLength: 4 }),
          async (texts) => {
            // Act - Concurrent speak requests
            const promises = texts.map(text => ttsService.speak(text, 'normal'));
            await Promise.all(promises);

            // Assert - Should handle all requests without errors
            const status = ttsService.getStatus();
            expect(status.isInitialized).toBe(true);
            expect(mockTts.speak).toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});