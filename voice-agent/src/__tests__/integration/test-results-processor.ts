/**
 * Test Results Processor for Integration Tests
 * 
 * Processes Jest test results to generate enhanced reports with
 * integration-specific metrics and analysis.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ProcessedTestResults {
  success: boolean;
  startTime: number;
  endTime: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: Array<{
    testFilePath: string;
    numFailingTests: number;
    numPassingTests: number;
    numPendingTests: number;
    perfStats: {
      start: number;
      end: number;
      runtime: number;
    };
    testResults: Array<{
      title: string;
      status: 'passed' | 'failed' | 'pending';
      duration: number;
      failureMessages: string[];
    }>;
  }>;
}

/**
 * Process Jest test results and generate enhanced integration test report
 */
function processTestResults(results: any): ProcessedTestResults {
  console.log('📊 Processing integration test results...');
  
  try {
    const processedResults: ProcessedTestResults = {
      success: results.success,
      startTime: results.startTime,
      endTime: Date.now(),
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      testResults: []
    };
    
    // Process each test suite
    for (const testResult of results.testResults) {
      const suiteResult = {
        testFilePath: testResult.testFilePath,
        numFailingTests: testResult.numFailingTests,
        numPassingTests: testResult.numPassingTests,
        numPendingTests: testResult.numPendingTests,
        perfStats: testResult.perfStats,
        testResults: testResult.testResults.map((test: any) => ({
          title: test.title,
          status: test.status,
          duration: test.duration || 0,
          failureMessages: test.failureMessages || []
        }))
      };
      
      processedResults.testResults.push(suiteResult);
    }
    
    // Generate enhanced reports
    generateIntegrationReport(processedResults);
    generatePerformanceReport(processedResults);
    generateFailureAnalysis(processedResults);
    
    console.log('✅ Test results processing complete');
    return processedResults;
    
  } catch (error) {
    console.error('❌ Error processing test results:', error);
    throw error;
  }
}

/**
 * Generate comprehensive integration test report
 */
function generateIntegrationReport(results: ProcessedTestResults): void {
  console.log('📄 Generating integration test report...');
  
  const report = {
    summary: {
      timestamp: new Date().toISOString(),
      duration: results.endTime - results.startTime,
      success: results.success,
      totalTests: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      pending: results.numPendingTests,
      successRate: results.numTotalTests > 0 ? (results.numPassedTests / results.numTotalTests) * 100 : 0
    },
    suites: results.testResults.map(suite => ({
      name: extractSuiteName(suite.testFilePath),
      file: suite.testFilePath,
      duration: suite.perfStats.end - suite.perfStats.start,
      tests: {
        total: suite.numPassingTests + suite.numFailingTests + suite.numPendingTests,
        passed: suite.numPassingTests,
        failed: suite.numFailingTests,
        pending: suite.numPendingTests
      },
      details: suite.testResults
    })),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  };
  
  const reportDir = join(process.cwd(), 'test-reports');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = join(reportDir, 'integration-test-detailed-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Integration report saved to: ${reportPath}`);
}

/**
 * Generate performance analysis report
 */
function generatePerformanceReport(results: ProcessedTestResults): void {
  console.log('⚡ Generating performance report...');
  
  const performanceData = {
    overview: {
      totalDuration: results.endTime - results.startTime,
      averageTestDuration: calculateAverageTestDuration(results),
      slowestTests: findSlowestTests(results, 10),
      fastestTests: findFastestTests(results, 5)
    },
    suitePerformance: results.testResults.map(suite => ({
      name: extractSuiteName(suite.testFilePath),
      duration: suite.perfStats.end - suite.perfStats.start,
      testsPerSecond: calculateTestsPerSecond(suite),
      averageTestDuration: calculateSuiteAverageTestDuration(suite),
      performanceGrade: calculatePerformanceGrade(suite)
    })),
    thresholds: {
      slowTestThreshold: 5000, // 5 seconds
      fastTestThreshold: 100,  // 100ms
      acceptableFailureRate: 0.05 // 5%
    },
    recommendations: generatePerformanceRecommendations(results)
  };
  
  const reportDir = join(process.cwd(), 'test-reports');
  const reportPath = join(reportDir, 'integration-performance-report.json');
  writeFileSync(reportPath, JSON.stringify(performanceData, null, 2));
  
  console.log(`⚡ Performance report saved to: ${reportPath}`);
}

/**
 * Generate failure analysis report
 */
function generateFailureAnalysis(results: ProcessedTestResults): void {
  if (results.numFailedTests === 0) {
    console.log('✅ No failures to analyze');
    return;
  }
  
  console.log('🔍 Generating failure analysis...');
  
  const failures = extractFailures(results);
  const analysis = {
    summary: {
      totalFailures: results.numFailedTests,
      failureRate: (results.numFailedTests / results.numTotalTests) * 100,
      affectedSuites: failures.length
    },
    failurePatterns: analyzeFailurePatterns(failures),
    commonErrors: findCommonErrors(failures),
    failedTests: failures.map(failure => ({
      suite: extractSuiteName(failure.testFilePath),
      test: failure.title,
      duration: failure.duration,
      error: failure.failureMessages[0] || 'Unknown error',
      category: categorizeError(failure.failureMessages[0] || '')
    })),
    recommendations: generateFailureRecommendations(failures)
  };
  
  const reportDir = join(process.cwd(), 'test-reports');
  const reportPath = join(reportDir, 'integration-failure-analysis.json');
  writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  
  console.log(`🔍 Failure analysis saved to: ${reportPath}`);
}

/**
 * Extract suite name from file path
 */
function extractSuiteName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  return fileName.replace('.test.ts', '').replace('.test.js', '');
}

/**
 * Calculate average test duration across all tests
 */
function calculateAverageTestDuration(results: ProcessedTestResults): number {
  let totalDuration = 0;
  let totalTests = 0;
  
  for (const suite of results.testResults) {
    for (const test of suite.testResults) {
      totalDuration += test.duration;
      totalTests++;
    }
  }
  
  return totalTests > 0 ? totalDuration / totalTests : 0;
}

/**
 * Find slowest tests across all suites
 */
function findSlowestTests(results: ProcessedTestResults, count: number): Array<{
  suite: string;
  test: string;
  duration: number;
}> {
  const allTests: Array<{ suite: string; test: string; duration: number }> = [];
  
  for (const suite of results.testResults) {
    for (const test of suite.testResults) {
      allTests.push({
        suite: extractSuiteName(suite.testFilePath),
        test: test.title,
        duration: test.duration
      });
    }
  }
  
  return allTests
    .sort((a, b) => b.duration - a.duration)
    .slice(0, count);
}

/**
 * Find fastest tests across all suites
 */
function findFastestTests(results: ProcessedTestResults, count: number): Array<{
  suite: string;
  test: string;
  duration: number;
}> {
  const allTests: Array<{ suite: string; test: string; duration: number }> = [];
  
  for (const suite of results.testResults) {
    for (const test of suite.testResults) {
      if (test.status === 'passed' && test.duration > 0) {
        allTests.push({
          suite: extractSuiteName(suite.testFilePath),
          test: test.title,
          duration: test.duration
        });
      }
    }
  }
  
  return allTests
    .sort((a, b) => a.duration - b.duration)
    .slice(0, count);
}

/**
 * Calculate tests per second for a suite
 */
function calculateTestsPerSecond(suite: any): number {
  const duration = (suite.perfStats.end - suite.perfStats.start) / 1000; // Convert to seconds
  const totalTests = suite.testResults.length;
  return duration > 0 ? totalTests / duration : 0;
}

/**
 * Calculate average test duration for a suite
 */
function calculateSuiteAverageTestDuration(suite: any): number {
  const totalDuration = suite.testResults.reduce((sum: number, test: any) => sum + test.duration, 0);
  return suite.testResults.length > 0 ? totalDuration / suite.testResults.length : 0;
}

/**
 * Calculate performance grade for a suite
 */
function calculatePerformanceGrade(suite: any): string {
  const avgDuration = calculateSuiteAverageTestDuration(suite);
  const testsPerSecond = calculateTestsPerSecond(suite);
  
  if (avgDuration < 100 && testsPerSecond > 10) return 'A';
  if (avgDuration < 500 && testsPerSecond > 5) return 'B';
  if (avgDuration < 1000 && testsPerSecond > 2) return 'C';
  if (avgDuration < 2000 && testsPerSecond > 1) return 'D';
  return 'F';
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(results: ProcessedTestResults): string[] {
  const recommendations: string[] = [];
  const avgDuration = calculateAverageTestDuration(results);
  
  if (avgDuration > 2000) {
    recommendations.push('Consider optimizing slow tests or breaking them into smaller units');
  }
  
  if (results.numFailedTests > results.numTotalTests * 0.1) {
    recommendations.push('High failure rate detected - review test stability and environment setup');
  }
  
  const slowTests = findSlowestTests(results, 5);
  if (slowTests.length > 0 && slowTests[0].duration > 10000) {
    recommendations.push(`Slowest test takes ${slowTests[0].duration}ms - consider optimization`);
  }
  
  return recommendations;
}

/**
 * Extract all failures from test results
 */
function extractFailures(results: ProcessedTestResults): any[] {
  const failures: any[] = [];
  
  for (const suite of results.testResults) {
    for (const test of suite.testResults) {
      if (test.status === 'failed') {
        failures.push({
          testFilePath: suite.testFilePath,
          title: test.title,
          duration: test.duration,
          failureMessages: test.failureMessages
        });
      }
    }
  }
  
  return failures;
}

/**
 * Analyze failure patterns
 */
function analyzeFailurePatterns(failures: any[]): any {
  const patterns = {
    timeoutFailures: failures.filter(f => 
      f.failureMessages.some((msg: string) => msg.toLowerCase().includes('timeout'))
    ).length,
    networkFailures: failures.filter(f => 
      f.failureMessages.some((msg: string) => 
        msg.toLowerCase().includes('network') || msg.toLowerCase().includes('connection')
      )
    ).length,
    assertionFailures: failures.filter(f => 
      f.failureMessages.some((msg: string) => msg.toLowerCase().includes('expect'))
    ).length,
    unknownFailures: 0
  };
  
  patterns.unknownFailures = failures.length - patterns.timeoutFailures - patterns.networkFailures - patterns.assertionFailures;
  
  return patterns;
}

/**
 * Find common error messages
 */
function findCommonErrors(failures: any[]): Array<{ error: string; count: number }> {
  const errorCounts = new Map<string, number>();
  
  for (const failure of failures) {
    for (const message of failure.failureMessages) {
      // Extract the first line of the error message
      const errorLine = message.split('\n')[0];
      const count = errorCounts.get(errorLine) || 0;
      errorCounts.set(errorLine, count + 1);
    }
  }
  
  return Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Categorize error types
 */
function categorizeError(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('network') || message.includes('connection')) return 'network';
  if (message.includes('expect') || message.includes('assertion')) return 'assertion';
  if (message.includes('memory') || message.includes('heap')) return 'memory';
  if (message.includes('permission') || message.includes('access')) return 'permission';
  
  return 'unknown';
}

/**
 * Generate failure recommendations
 */
function generateFailureRecommendations(failures: any[]): string[] {
  const recommendations: string[] = [];
  const patterns = analyzeFailurePatterns(failures);
  
  if (patterns.timeoutFailures > 0) {
    recommendations.push('Consider increasing test timeouts or optimizing slow operations');
  }
  
  if (patterns.networkFailures > 0) {
    recommendations.push('Review network-dependent tests and consider better mocking');
  }
  
  if (patterns.assertionFailures > 0) {
    recommendations.push('Review test assertions and expected behavior');
  }
  
  if (failures.length > 5) {
    recommendations.push('High number of failures - consider reviewing test environment setup');
  }
  
  return recommendations;
}

// Export the main processor function
module.exports = processTestResults;