/**
 * Integration Test Runner
 * 
 * Orchestrates the execution of all integration tests with proper setup,
 * teardown, and reporting. Provides utilities for running specific test
 * suites and generating comprehensive test reports.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  estimatedDuration: number; // in seconds
  dependencies: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestReport {
  timestamp: Date;
  totalDuration: number;
  overallResults: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  suiteResults: TestResult[];
  environment: {
    nodeVersion: string;
    platform: string;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

class IntegrationTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Setup and Infrastructure',
      file: 'setup.test.ts',
      description: 'Tests the integration test environment setup and mock systems',
      estimatedDuration: 30,
      dependencies: []
    },
    {
      name: 'Voice-to-Action Workflows',
      file: 'voice-to-action.test.ts',
      description: 'End-to-end voice command processing and execution',
      estimatedDuration: 120,
      dependencies: ['setup']
    },
    {
      name: 'Chat-to-Action Workflows',
      file: 'chat-to-action.test.ts',
      description: 'Complete chat interface workflows and context management',
      estimatedDuration: 90,
      dependencies: ['setup']
    },
    {
      name: 'API Integration',
      file: 'api-integration.test.ts',
      description: 'Host system API communication and data synchronization',
      estimatedDuration: 100,
      dependencies: ['setup']
    },
    {
      name: 'Performance Testing',
      file: 'performance.test.ts',
      description: 'System performance under various load conditions',
      estimatedDuration: 180,
      dependencies: ['setup', 'voice-to-action', 'chat-to-action']
    },
    {
      name: 'Real-World Scenarios',
      file: 'real-world-scenarios.test.ts',
      description: 'Realistic delivery partner workflows and edge cases',
      estimatedDuration: 200,
      dependencies: ['setup', 'voice-to-action', 'chat-to-action', 'api-integration']
    },
    {
      name: 'Comprehensive Integration',
      file: 'comprehensive.test.ts',
      description: 'Cross-component integration and system resilience testing',
      estimatedDuration: 250,
      dependencies: ['setup', 'voice-to-action', 'chat-to-action', 'api-integration', 'performance']
    }
  ];

  private results: TestResult[] = [];
  private startTime: Date = new Date();

  constructor(private options: {
    verbose?: boolean;
    parallel?: boolean;
    maxConcurrency?: number;
    timeout?: number;
    reportDir?: string;
  } = {}) {
    this.options = {
      verbose: false,
      parallel: false,
      maxConcurrency: 3,
      timeout: 300000, // 5 minutes per suite
      reportDir: './test-reports',
      ...options
    };
  }

  /**
   * Run all integration test suites
   */
  async runAll(): Promise<TestReport> {
    console.log('🚀 Starting Voice Agent Integration Test Suite');
    console.log(`📊 Running ${this.testSuites.length} test suites`);
    console.log(`⏱️  Estimated duration: ${this.getTotalEstimatedDuration()} seconds`);
    console.log('');

    this.startTime = new Date();
    this.results = [];

    try {
      if (this.options.parallel) {
        await this.runSuitesInParallel();
      } else {
        await this.runSuitesSequentially();
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }

    const report = this.generateReport();
    await this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  /**
   * Run specific test suites by name
   */
  async runSpecific(suiteNames: string[]): Promise<TestReport> {
    const suitesToRun = this.testSuites.filter(suite => 
      suiteNames.some(name => suite.name.toLowerCase().includes(name.toLowerCase()))
    );

    if (suitesToRun.length === 0) {
      throw new Error(`No test suites found matching: ${suiteNames.join(', ')}`);
    }

    console.log(`🎯 Running specific test suites: ${suitesToRun.map(s => s.name).join(', ')}`);
    
    this.startTime = new Date();
    this.results = [];

    for (const suite of suitesToRun) {
      await this.runSuite(suite);
    }

    const report = this.generateReport();
    await this.saveReport(report);
    this.printSummary(report);

    return report;
  }

  /**
   * Run test suites sequentially
   */
  private async runSuitesSequentially(): Promise<void> {
    for (const suite of this.testSuites) {
      await this.runSuite(suite);
    }
  }

  /**
   * Run test suites in parallel (respecting dependencies)
   */
  private async runSuitesInParallel(): Promise<void> {
    const completed = new Set<string>();
    const running = new Map<string, Promise<void>>();
    const maxConcurrency = this.options.maxConcurrency || 3;

    while (completed.size < this.testSuites.length) {
      // Find suites that can run (dependencies met, not running, not completed)
      const readyToRun = this.testSuites.filter(suite => 
        !completed.has(suite.name) && 
        !running.has(suite.name) &&
        suite.dependencies.every(dep => completed.has(dep)) &&
        running.size < maxConcurrency
      );

      if (readyToRun.length === 0 && running.size === 0) {
        throw new Error('Dependency deadlock detected in test suites');
      }

      // Start ready suites
      for (const suite of readyToRun.slice(0, maxConcurrency - running.size)) {
        const promise = this.runSuite(suite).then(() => {
          completed.add(suite.name);
          running.delete(suite.name);
        });
        running.set(suite.name, promise);
      }

      // Wait for at least one to complete
      if (running.size > 0) {
        await Promise.race(Array.from(running.values()));
      }
    }
  }

  /**
   * Run a single test suite
   */
  private async runSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    
    if (this.options.verbose) {
      console.log(`⏱️  Estimated duration: ${suite.estimatedDuration}s`);
      console.log(`📋 Dependencies: ${suite.dependencies.join(', ') || 'None'}`);
    }

    const startTime = Date.now();
    
    try {
      // Run the test suite using Jest
      const command = `npx jest --testPathPattern=${suite.file} --verbose --no-cache --forceExit`;
      const output = execSync(command, {
        cwd: process.cwd(),
        timeout: this.options.timeout,
        encoding: 'utf8',
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });

      const duration = (Date.now() - startTime) / 1000;
      const result = this.parseJestOutput(output, suite.name, duration);
      this.results.push(result);

      console.log(`✅ ${suite.name} completed in ${duration.toFixed(1)}s`);
      console.log(`   📊 ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);

    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      const result: TestResult = {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error.message || 'Unknown error']
      };
      this.results.push(result);

      console.log(`❌ ${suite.name} failed in ${duration.toFixed(1)}s`);
      console.log(`   💥 Error: ${error.message}`);
      
      if (this.options.verbose) {
        console.log(`   📋 Full error: ${error.stdout || error.stderr || error.message}`);
      }
    }
  }

  /**
   * Parse Jest output to extract test results
   */
  private parseJestOutput(output: string, suiteName: string, duration: number): TestResult {
    // Simple parsing - in a real implementation, you might use Jest's JSON reporter
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const line of lines) {
      if (line.includes('✓') || line.includes('PASS')) {
        passed++;
      } else if (line.includes('✗') || line.includes('FAIL')) {
        failed++;
        errors.push(line.trim());
      } else if (line.includes('○') || line.includes('SKIP')) {
        skipped++;
      }
    }

    // If no specific test results found, assume suite-level result
    if (passed === 0 && failed === 0 && skipped === 0) {
      if (output.includes('PASS')) {
        passed = 1;
      } else if (output.includes('FAIL')) {
        failed = 1;
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      errors
    };
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): TestReport {
    const totalDuration = (Date.now() - this.startTime.getTime()) / 1000;
    
    const overallResults = this.results.reduce(
      (acc, result) => ({
        totalTests: acc.totalTests + result.passed + result.failed + result.skipped,
        passed: acc.passed + result.passed,
        failed: acc.failed + result.failed,
        skipped: acc.skipped + result.skipped
      }),
      { totalTests: 0, passed: 0, failed: 0, skipped: 0 }
    );

    const successRate = overallResults.totalTests > 0 
      ? (overallResults.passed / overallResults.totalTests) * 100 
      : 0;

    return {
      timestamp: this.startTime,
      totalDuration,
      overallResults: {
        ...overallResults,
        successRate
      },
      suiteResults: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Save test report to file
   */
  private async saveReport(report: TestReport): Promise<void> {
    if (!this.options.reportDir) return;

    const reportDir = this.options.reportDir;
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const reportFile = join(reportDir, `integration-test-report-${timestamp}.json`);
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test report saved to: ${reportFile}`);

    // Also save a latest report
    const latestFile = join(reportDir, 'latest-integration-test-report.json');
    writeFileSync(latestFile, JSON.stringify(report, null, 2));
  }

  /**
   * Print test summary
   */
  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Total Duration: ${report.totalDuration.toFixed(1)}s`);
    console.log(`📊 Total Tests: ${report.overallResults.totalTests}`);
    console.log(`✅ Passed: ${report.overallResults.passed}`);
    console.log(`❌ Failed: ${report.overallResults.failed}`);
    console.log(`⏭️  Skipped: ${report.overallResults.skipped}`);
    console.log(`📈 Success Rate: ${report.overallResults.successRate.toFixed(1)}%`);
    
    console.log('\n📋 Suite Results:');
    for (const result of report.suiteResults) {
      const status = result.failed > 0 ? '❌' : '✅';
      console.log(`  ${status} ${result.suite}: ${result.passed}/${result.passed + result.failed} (${result.duration.toFixed(1)}s)`);
      
      if (result.errors.length > 0 && this.options.verbose) {
        result.errors.forEach(error => console.log(`    💥 ${error}`));
      }
    }

    console.log('\n🖥️  Environment:');
    console.log(`  Node.js: ${report.environment.nodeVersion}`);
    console.log(`  Platform: ${report.environment.platform}`);
    console.log(`  Memory: ${(report.environment.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used`);

    if (report.overallResults.failed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed output above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All integration tests passed!');
    }
  }

  /**
   * Get total estimated duration for all suites
   */
  private getTotalEstimatedDuration(): number {
    return this.testSuites.reduce((total, suite) => total + suite.estimatedDuration, 0);
  }

  /**
   * Validate test environment
   */
  static async validateEnvironment(): Promise<boolean> {
    console.log('🔍 Validating test environment...');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      console.log(`✅ Node.js version: ${nodeVersion}`);
      
      // Check required dependencies
      const requiredPackages = ['jest', 'fast-check', '@types/jest'];
      for (const pkg of requiredPackages) {
        try {
          require.resolve(pkg);
          console.log(`✅ ${pkg} is available`);
        } catch (error) {
          console.log(`❌ ${pkg} is missing`);
          return false;
        }
      }
      
      // Check test files exist
      const testDir = join(__dirname);
      const requiredFiles = [
        'setup.ts',
        'voice-to-action.test.ts',
        'chat-to-action.test.ts',
        'api-integration.test.ts',
        'performance.test.ts',
        'comprehensive.test.ts',
        'real-world-scenarios.test.ts'
      ];
      
      for (const file of requiredFiles) {
        const filePath = join(testDir, file);
        if (existsSync(filePath)) {
          console.log(`✅ ${file} exists`);
        } else {
          console.log(`❌ ${file} is missing`);
          return false;
        }
      }
      
      console.log('✅ Environment validation passed');
      return true;
      
    } catch (error) {
      console.log(`❌ Environment validation failed: ${error}`);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    parallel: args.includes('--parallel') || args.includes('-p'),
    timeout: args.includes('--timeout') ? parseInt(args[args.indexOf('--timeout') + 1]) * 1000 : undefined
  };

  const runner = new IntegrationTestRunner(options);

  // Check for specific suite names
  const suiteArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  async function main() {
    // Validate environment first
    const isValid = await IntegrationTestRunner.validateEnvironment();
    if (!isValid) {
      console.log('❌ Environment validation failed. Please fix the issues above.');
      process.exit(1);
    }

    try {
      if (suiteArgs.length > 0) {
        await runner.runSpecific(suiteArgs);
      } else {
        await runner.runAll();
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  main().catch(console.error);
}

export { IntegrationTestRunner, TestReport, TestResult };