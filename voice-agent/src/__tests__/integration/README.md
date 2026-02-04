# Voice Agent Integration Test Suite

This directory contains comprehensive integration tests for the Voice Agent system. The tests validate end-to-end functionality, cross-component integration, performance characteristics, and real-world usage scenarios.

## Overview

The integration test suite is designed to:

- **Validate Complete Workflows**: Test entire user journeys from voice input to system response
- **Verify Cross-Component Integration**: Ensure all services work together seamlessly
- **Test Real-World Scenarios**: Simulate actual delivery partner usage patterns
- **Monitor Performance**: Validate response times, memory usage, and scalability
- **Ensure Reliability**: Test error handling, recovery, and edge cases

## Test Structure

### Core Test Files

- **`setup.ts`** - Test environment configuration and mock services
- **`basic-setup.test.ts`** - Basic environment verification tests
- **`voice-to-action.test.ts`** - End-to-end voice command workflows
- **`chat-to-action.test.ts`** - Complete chat interface workflows
- **`api-integration.test.ts`** - Host system API communication tests
- **`performance.test.ts`** - System performance and scalability tests
- **`real-world-scenarios.test.ts`** - Realistic delivery partner scenarios
- **`comprehensive.test.ts`** - Cross-component integration and resilience tests

### Support Files

- **`global-setup.ts`** - One-time test environment initialization
- **`global-teardown.ts`** - Test cleanup and reporting
- **`test-results-processor.ts`** - Enhanced test result analysis
- **`test-sequencer.ts`** - Optimized test execution ordering
- **`run-integration-tests.ts`** - Test runner with advanced features

### Mock Implementations

- **`__mocks__/react-native-voice.ts`** - Voice recognition mock
- **`__mocks__/react-native-tts.ts`** - Text-to-speech mock
- **`setup/react-native-mock.ts`** - React Native environment mock

## Running Tests

### Basic Commands

```bash
# Run all integration tests
npm run test:integration

# Run basic setup verification
npm run test:integration:basic

# Run specific test file
npm test -- --testPathPattern=voice-to-action

# Run with verbose output
npm test -- --testPathPattern=integration --verbose
```

### Advanced Test Runner

```bash
# Run all tests with detailed reporting
node src/__tests__/integration/run-integration-tests.ts

# Run specific test suites
node src/__tests__/integration/run-integration-tests.ts voice chat

# Run with parallel execution
node src/__tests__/integration/run-integration-tests.ts --parallel

# Run with custom timeout
node src/__tests__/integration/run-integration-tests.ts --timeout 300
```

## Test Environment

### Mock Services

The integration tests use comprehensive mocks for:

- **Voice Recognition**: Simulates speech-to-text with configurable results
- **Text-to-Speech**: Mocks audio output with event simulation
- **Host System API**: Provides realistic API responses and error conditions
- **React Native**: Mocks platform-specific functionality
- **Network Conditions**: Simulates various connectivity scenarios

### Test Data

The test environment includes:

- **Delivery Contexts**: Realistic delivery partner scenarios
- **Voice Commands**: Common delivery-related voice inputs
- **Chat Messages**: Typical text-based interactions
- **Error Conditions**: Various failure scenarios for resilience testing

### Configuration

Test behavior can be controlled through:

- **Environment Variables**: Control logging, timeouts, and mock behavior
- **Test Configuration**: Customize network conditions, authentication, and data
- **Mock Settings**: Adjust response times, error rates, and data volumes

## Test Categories

### 1. Functional Tests

Verify that all features work correctly:

- Voice command processing
- Chat interface functionality
- API communication
- Domain restriction enforcement
- Quick message handling

### 2. Integration Tests

Validate cross-component interactions:

- Voice-to-chat mode switching
- Context preservation across modes
- Service coordination
- Event propagation
- State synchronization

### 3. Performance Tests

Monitor system performance characteristics:

- Response time measurements
- Memory usage tracking
- Concurrent operation handling
- Scalability under load
- Resource optimization

### 4. Resilience Tests

Test error handling and recovery:

- Network failure scenarios
- Authentication errors
- Service timeouts
- Resource exhaustion
- Graceful degradation

### 5. Real-World Scenarios

Simulate actual usage patterns:

- Complete delivery workflows
- Multi-stop routes
- Emergency situations
- Challenging conditions (weather, traffic)
- Extended operation periods

## Property-Based Testing

The test suite includes property-based tests that:

- Generate random inputs to test universal properties
- Validate system behavior across diverse scenarios
- Ensure consistency and reliability
- Catch edge cases that manual tests might miss

### Property Examples

- **Voice Command Consistency**: Any valid delivery command should be processed correctly
- **Context Preservation**: Mode switches should maintain conversation state
- **Error Recovery**: Any error condition should result in graceful recovery
- **Data Integrity**: All data operations should maintain consistency

## Test Reports

The integration tests generate comprehensive reports:

### Execution Reports

- **Test Results**: Pass/fail status for all tests
- **Performance Metrics**: Response times, memory usage, throughput
- **Error Analysis**: Failure patterns and common issues
- **Coverage Information**: Code coverage from integration tests

### Generated Files

- `test-reports/integration-test-detailed-report.json` - Complete test results
- `test-reports/integration-performance-report.json` - Performance analysis
- `test-reports/integration-failure-analysis.json` - Failure investigation
- `test-reports/final-summary.json` - Overall execution summary

## Best Practices

### Writing Integration Tests

1. **Test Real Workflows**: Focus on complete user journeys
2. **Use Realistic Data**: Test with data that matches production scenarios
3. **Validate End-to-End**: Ensure the entire system works together
4. **Test Error Conditions**: Include failure scenarios and recovery
5. **Monitor Performance**: Track response times and resource usage

### Test Maintenance

1. **Keep Tests Independent**: Each test should be able to run in isolation
2. **Use Proper Setup/Teardown**: Clean up resources after each test
3. **Mock External Dependencies**: Use reliable mocks for external services
4. **Update Test Data**: Keep test scenarios current with system changes
5. **Review Test Results**: Regularly analyze failures and performance trends

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values for slow operations
2. **Mock Failures**: Verify mock configurations match expected behavior
3. **Memory Issues**: Check for resource leaks in test cleanup
4. **Network Errors**: Ensure mock network conditions are properly set
5. **Authentication Problems**: Verify mock authentication is configured correctly

### Debugging Tips

1. **Enable Verbose Logging**: Use `VERBOSE_LOGGING=true` environment variable
2. **Run Single Tests**: Isolate failing tests for easier debugging
3. **Check Mock State**: Verify mocks are in expected state before tests
4. **Monitor Resources**: Watch memory and CPU usage during test execution
5. **Review Event Logs**: Examine event logs for unexpected behavior

## Configuration Options

### Environment Variables

- `NODE_ENV=test` - Set test environment
- `VERBOSE_LOGGING=true` - Enable detailed logging
- `DEBUG_LOGGING=true` - Enable debug output
- `SUPPRESS_CONSOLE=true` - Suppress console output
- `LOG_TO_FILE=true` - Write logs to files

### Test Configuration

```json
{
  "environment": "integration-test",
  "mockServices": {
    "voiceRecognition": true,
    "textToSpeech": true,
    "apiClient": true,
    "hostSystem": true
  },
  "performance": {
    "maxResponseTime": 2000,
    "maxMemoryUsage": 512,
    "maxConcurrentOperations": 10
  },
  "network": {
    "simulateLatency": true,
    "defaultLatency": 100,
    "simulateFailures": true,
    "failureRate": 0.05
  }
}
```

## Contributing

When adding new integration tests:

1. **Follow Naming Conventions**: Use descriptive test names
2. **Add Proper Documentation**: Document test purpose and expectations
3. **Include Error Cases**: Test both success and failure scenarios
4. **Update Test Data**: Add new test data as needed
5. **Verify Performance**: Ensure new tests don't significantly slow down the suite

## Support

For questions about the integration test suite:

1. **Check Documentation**: Review this README and inline comments
2. **Examine Examples**: Look at existing tests for patterns
3. **Run Diagnostics**: Use the test runner's validation features
4. **Review Reports**: Check generated reports for insights
5. **Contact Team**: Reach out to the Voice Agent development team