/**
 * Domain Controller Service Tests
 * 
 * Tests for domain restriction enforcement and intent validation.
 * **Feature: voice-agent, Property 8: Domain Restriction Enforcement**
 */

import * as fc from 'fast-check';
import { DomainControllerService } from '../../services/DomainControllerService';
import { Intent } from '../../types';

describe('DomainControllerService', () => {
  let domainController: DomainControllerService;

  beforeEach(() => {
    domainController = new DomainControllerService();
    domainController.clearQueryLog();
  });

  describe('Property 8: Domain Restriction Enforcement', () => {
    /**
     * **Validates: Requirements 4.1, 4.2, 4.4**
     * 
     * Property: For any non-delivery-related query, the Domain_Controller should reject 
     * the request and respond with delivery-only guidance
     */
    it('should reject all non-delivery-related intents', () => {
      fc.assert(
        fc.property(
          // Generator for non-delivery intent types
          fc.oneof(
            fc.constant('entertainment'),
            fc.constant('personal'),
            fc.constant('news'),
            fc.constant('shopping'),
            fc.constant('general_knowledge'),
            fc.constant('weather'),
            fc.constant('sports'),
            fc.constant('technology')
          ),
          // Generator for random actions
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generator for random parameters
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(fc.string(), fc.integer(), fc.boolean())
          ),
          // Generator for confidence scores
          fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
          (intentType, action, parameters, confidence) => {
            const intent: Intent = {
              type: intentType as any,
              action,
              parameters,
              confidence
            };

            const result = domainController.validateIntent(intent);

            // Property: All non-delivery intents should be rejected
            expect(result.isValid).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.suggestedAction).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any intent containing blocked keywords, the Domain_Controller 
     * should reject the request regardless of intent type
     */
    it('should reject intents containing blocked keywords', () => {
      fc.assert(
        fc.property(
          // Generator for delivery intent types (valid types)
          fc.oneof(
            fc.constant('delivery_status'),
            fc.constant('navigation'),
            fc.constant('communication'),
            fc.constant('quick_message')
          ),
          // Generator for approved actions
          fc.constantFrom(
            'delivery_status_check',
            'navigation_to_pickup',
            'communication_send_message',
            'quick_message_reached_pickup'
          ),
          // Generator for blocked keywords
          fc.constantFrom(
            'music', 'entertainment', 'personal', 'news', 'politics',
            'shopping', 'weather', 'sports', 'game', 'movie'
          ),
          // Generator for confidence scores
          fc.float({ min: 0.5, max: 1.0 }),
          (intentType, action, blockedKeyword, confidence) => {
            const intent: Intent = {
              type: intentType as any,
              action,
              parameters: {
                query: `Please help me with ${blockedKeyword}`,
                keyword: blockedKeyword
              },
              confidence
            };

            const result = domainController.validateIntent(intent);

            // Property: Intents with blocked keywords should be rejected
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('blocked keyword');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any valid delivery-related intent with approved actions and 
     * sufficient confidence, the Domain_Controller should approve the request
     */
    it('should approve valid delivery-related intents', () => {
      fc.assert(
        fc.property(
          // Generator for valid delivery intent types
          fc.oneof(
            fc.constant('delivery_status'),
            fc.constant('navigation'),
            fc.constant('communication'),
            fc.constant('quick_message')
          ),
          // Generator for approved actions
          fc.constantFrom(
            'delivery_status_check',
            'delivery_status_update',
            'delivery_mark_delivered',
            'navigation_to_pickup',
            'navigation_to_delivery',
            'navigation_get_directions',
            'communication_send_message',
            'communication_report_delay',
            'quick_message_reached_pickup',
            'quick_message_reached_delivery',
            'quick_message_traffic_delay'
          ),
          // Generator for safe parameters (no blocked keywords)
          fc.record({
            orderId: fc.string({ minLength: 1, maxLength: 20 }),
            location: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.constantFrom(
              'delivery update',
              'pickup location',
              'customer contact',
              'route information'
            )
          }),
          // Generator for sufficient confidence scores
          fc.float({ min: Math.fround(0.3), max: Math.fround(1.0) }),
          (intentType, action, parameters, confidence) => {
            const intent: Intent = {
              type: intentType as any,
              action,
              parameters,
              confidence
            };

            const result = domainController.validateIntent(intent);

            // Property: Valid delivery intents should be approved
            expect(result.isValid).toBe(true);
            expect(result.reason).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any intent with confidence below threshold (0.3), 
     * the Domain_Controller should reject due to low confidence
     */
    it('should reject intents with low confidence scores', () => {
      fc.assert(
        fc.property(
          // Generator for valid intent actions (must be from approved list)
          fc.oneof(
            fc.constant('delivery_status_check'),
            fc.constant('navigation_to_pickup'),
            fc.constant('communication_send_message'),
            fc.constant('quick_message_reached_pickup')
          ),
          // Generator for any parameters
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          // Generator for low confidence scores
          fc.float({ min: Math.fround(0.0), max: Math.fround(0.29) }),
          (action, parameters, confidence) => {
            // Determine intent type based on action
            let intentType: string;
            if (action.startsWith('delivery_status')) {
              intentType = 'delivery_status';
            } else if (action.startsWith('navigation')) {
              intentType = 'navigation';
            } else if (action.startsWith('communication')) {
              intentType = 'communication';
            } else {
              intentType = 'quick_message';
            }

            const intent: Intent = {
              type: intentType as any,
              action,
              parameters,
              confidence
            };

            const result = domainController.validateIntent(intent);

            // Property: Low confidence intents should be rejected
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('confidence too low');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any rejected query, the Domain_Controller should log 
     * the rejection with timestamp and reason
     */
    it('should log all rejected queries with proper details', () => {
      fc.assert(
        fc.property(
          // Generator for invalid intents
          fc.record({
            type: fc.constantFrom('entertainment', 'personal', 'news'),
            action: fc.string({ minLength: 1, maxLength: 30 }),
            parameters: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 10 }),
              fc.string({ minLength: 1, maxLength: 20 })
            ),
            confidence: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) })
          }),
          (intent) => {
            const initialLogLength = domainController.getQueryLog().length;
            
            const result = domainController.validateIntent(intent as Intent);
            
            // Property: Rejected intents should be logged
            expect(result.isValid).toBe(false);
            
            const newLogLength = domainController.getQueryLog().length;
            expect(newLogLength).toBe(initialLogLength + 1);
            
            const latestLog = domainController.getQueryLog()[newLogLength - 1];
            expect(latestLog.query).toBeDefined();
            expect(latestLog.reason).toBeDefined();
            expect(latestLog.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests for Specific Behaviors', () => {
    it('should return the standard rejection message', () => {
      const rejectionMessage = domainController.generateRejectionResponse();
      expect(rejectionMessage).toBe("I can help only with delivery-related tasks");
    });

    it('should return exact rejection message for off-topic queries', () => {
      // Test that off-topic queries return exact message: "I can help only with delivery-related tasks"
      // **Validates: Requirements 4.3**
      
      const offTopicIntents: Intent[] = [
        {
          type: 'entertainment' as any,
          action: 'play_music',
          parameters: { song: 'test song' },
          confidence: 0.8
        },
        {
          type: 'personal' as any,
          action: 'tell_joke',
          parameters: {},
          confidence: 0.9
        },
        {
          type: 'news' as any,
          action: 'get_weather',
          parameters: { location: 'test' },
          confidence: 0.7
        }
      ];

      offTopicIntents.forEach(intent => {
        const result = domainController.validateIntent(intent);
        expect(result.isValid).toBe(false);
        
        // The rejection response should always be the exact message
        const rejectionMessage = domainController.generateRejectionResponse();
        expect(rejectionMessage).toBe("I can help only with delivery-related tasks");
      });
    });

    it('should return approved intents list', () => {
      const approvedIntents = domainController.getApprovedIntents();
      expect(Array.isArray(approvedIntents)).toBe(true);
      expect(approvedIntents.length).toBeGreaterThan(0);
      expect(approvedIntents).toContain('delivery_status_check');
      expect(approvedIntents).toContain('navigation_to_pickup');
    });

    it('should clear query log when requested', () => {
      // Add some log entries
      domainController.logRejectedQuery('test query', 'test reason');
      expect(domainController.getQueryLog().length).toBe(1);
      
      // Clear log
      domainController.clearQueryLog();
      expect(domainController.getQueryLog().length).toBe(0);
    });

    it('should limit query log to 1000 entries', () => {
      // Add more than 1000 entries
      for (let i = 0; i < 1100; i++) {
        domainController.logRejectedQuery(`query ${i}`, `reason ${i}`);
      }
      
      const log = domainController.getQueryLog();
      expect(log.length).toBe(1000);
      
      // Should keep the most recent entries
      expect(log[log.length - 1].query).toBe('query 1099');
    });
  });
});