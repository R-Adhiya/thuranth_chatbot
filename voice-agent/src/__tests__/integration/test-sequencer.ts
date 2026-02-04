/**
 * Custom Test Sequencer for Integration Tests
 * 
 * Controls the order of test execution to optimize for:
 * - Dependency resolution
 * - Resource utilization
 * - Failure isolation
 * - Performance optimization
 */

import { Test } from '@jest/test-result';
import { Config } from '@jest/types';

interface TestWithMetadata extends Test {
  metadata?: {
    priority: number;
    dependencies: string[];
    estimatedDuration: number;
    resourceRequirements: string[];
    category: string;
  };
}

class IntegrationTestSequencer {
  /**
   * Sort tests based on integration-specific criteria
   */
  sort(tests: Array<Test>): Array<Test> {
    console.log(`🔄 Sequencing ${tests.length} integration tests...`);
    
    // Add metadata to tests based on file names and content analysis
    const testsWithMetadata = tests.map(test => this.addTestMetadata(test));
    
    // Sort tests based on multiple criteria
    const sortedTests = testsWithMetadata.sort((a, b) => {
      // 1. Priority (higher priority first)
      if (a.metadata!.priority !== b.metadata!.priority) {
        return b.metadata!.priority - a.metadata!.priority;
      }
      
      // 2. Dependencies (tests with fewer dependencies first)
      if (a.metadata!.dependencies.length !== b.metadata!.dependencies.length) {
        return a.metadata!.dependencies.length - b.metadata!.dependencies.length;
      }
      
      // 3. Estimated duration (shorter tests first for faster feedback)
      if (a.metadata!.estimatedDuration !== b.metadata!.estimatedDuration) {
        return a.metadata!.estimatedDuration - b.metadata!.estimatedDuration;
      }
      
      // 4. Alphabetical order as final tiebreaker
      return a.path.localeCompare(b.path);
    });
    
    // Log the execution order
    this.logExecutionOrder(sortedTests);
    
    return sortedTests;
  }
  
  /**
   * Add metadata to tests based on file analysis
   */
  private addTestMetadata(test: Test): TestWithMetadata {
    const fileName = test.path.split('/').pop() || '';
    const testWithMetadata = test as TestWithMetadata;
    
    // Determine test category and metadata based on file name
    if (fileName.includes('setup')) {
      testWithMetadata.metadata = {
        priority: 100, // Highest priority
        dependencies: [],
        estimatedDuration: 30000, // 30 seconds
        resourceRequirements: ['filesystem', 'network'],
        category: 'setup'
      };
    } else if (fileName.includes('voice-to-action')) {
      testWithMetadata.metadata = {
        priority: 80,
        dependencies: ['setup'],
        estimatedDuration: 120000, // 2 minutes
        resourceRequirements: ['audio', 'network', 'processing'],
        category: 'voice'
      };
    } else if (fileName.includes('chat-to-action')) {
      testWithMetadata.metadata = {
        priority: 80,
        dependencies: ['setup'],
        estimatedDuration: 90000, // 1.5 minutes
        resourceRequirements: ['network', 'processing'],
        category: 'chat'
      };
    } else if (fileName.includes('api-integration')) {
      testWithMetadata.metadata = {
        priority: 70,
        dependencies: ['setup'],
        estimatedDuration: 100000, // 1.67 minutes
        resourceRequirements: ['network', 'authentication'],
        category: 'api'
      };
    } else if (fileName.includes('performance')) {
      testWithMetadata.metadata = {
        priority: 60,
        dependencies: ['setup', 'voice-to-action', 'chat-to-action'],
        estimatedDuration: 180000, // 3 minutes
        resourceRequirements: ['cpu', 'memory', 'network'],
        category: 'performance'
      };
    } else if (fileName.includes('real-world-scenarios')) {
      testWithMetadata.metadata = {
        priority: 50,
        dependencies: ['setup', 'voice-to-action', 'chat-to-action', 'api-integration'],
        estimatedDuration: 200000, // 3.33 minutes
        resourceRequirements: ['cpu', 'memory', 'network', 'audio'],
        category: 'scenarios'
      };
    } else if (fileName.includes('comprehensive')) {
      testWithMetadata.metadata = {
        priority: 40,
        dependencies: ['setup', 'voice-to-action', 'chat-to-action', 'api-integration', 'performance'],
        estimatedDuration: 250000, // 4.17 minutes
        resourceRequirements: ['cpu', 'memory', 'network', 'audio', 'filesystem'],
        category: 'comprehensive'
      };
    } else {
      // Default metadata for unknown tests
      testWithMetadata.metadata = {
        priority: 30,
        dependencies: [],
        estimatedDuration: 60000, // 1 minute
        resourceRequirements: ['basic'],
        category: 'other'
      };
    }
    
    return testWithMetadata;
  }
  
  /**
   * Log the planned execution order
   */
  private logExecutionOrder(tests: TestWithMetadata[]): void {
    console.log('\n📋 Integration Test Execution Order:');
    console.log('='.repeat(60));
    
    let totalEstimatedTime = 0;
    
    tests.forEach((test, index) => {
      const fileName = test.path.split('/').pop() || '';
      const metadata = test.metadata!;
      const estimatedMinutes = (metadata.estimatedDuration / 60000).toFixed(1);
      
      console.log(`${index + 1}. ${fileName}`);
      console.log(`   📊 Priority: ${metadata.priority}`);
      console.log(`   ⏱️  Estimated: ${estimatedMinutes}m`);
      console.log(`   📋 Category: ${metadata.category}`);
      console.log(`   🔗 Dependencies: ${metadata.dependencies.join(', ') || 'None'}`);
      console.log(`   🔧 Resources: ${metadata.resourceRequirements.join(', ')}`);
      console.log('');
      
      totalEstimatedTime += metadata.estimatedDuration;
    });
    
    const totalMinutes = (totalEstimatedTime / 60000).toFixed(1);
    console.log(`⏱️  Total Estimated Time: ${totalMinutes} minutes`);
    console.log('='.repeat(60));
  }
  
  /**
   * Validate test dependencies
   */
  private validateDependencies(tests: TestWithMetadata[]): boolean {
    console.log('🔍 Validating test dependencies...');
    
    const testCategories = new Set(tests.map(t => t.metadata!.category));
    const issues: string[] = [];
    
    for (const test of tests) {
      for (const dependency of test.metadata!.dependencies) {
        if (!testCategories.has(dependency)) {
          issues.push(`Test ${test.path} depends on missing category: ${dependency}`);
        }
      }
    }
    
    if (issues.length > 0) {
      console.warn('⚠️  Dependency issues found:');
      issues.forEach(issue => console.warn(`   - ${issue}`));
      return false;
    }
    
    console.log('✅ All dependencies validated');
    return true;
  }
  
  /**
   * Optimize test order for parallel execution
   */
  private optimizeForParallelExecution(tests: TestWithMetadata[]): TestWithMetadata[] {
    // Group tests by resource requirements to avoid conflicts
    const resourceGroups = new Map<string, TestWithMetadata[]>();
    
    for (const test of tests) {
      const resourceKey = test.metadata!.resourceRequirements.sort().join(',');
      if (!resourceGroups.has(resourceKey)) {
        resourceGroups.set(resourceKey, []);
      }
      resourceGroups.get(resourceKey)!.push(test);
    }
    
    // Interleave tests from different resource groups
    const optimizedOrder: TestWithMetadata[] = [];
    const groupArrays = Array.from(resourceGroups.values());
    
    let maxLength = Math.max(...groupArrays.map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (const group of groupArrays) {
        if (i < group.length) {
          optimizedOrder.push(group[i]);
        }
      }
    }
    
    return optimizedOrder;
  }
  
  /**
   * Calculate optimal batch sizes for parallel execution
   */
  private calculateOptimalBatchSize(tests: TestWithMetadata[]): number {
    const totalDuration = tests.reduce((sum, test) => sum + test.metadata!.estimatedDuration, 0);
    const averageDuration = totalDuration / tests.length;
    
    // Aim for batches that complete in roughly 2-3 minutes
    const targetBatchDuration = 150000; // 2.5 minutes
    const optimalBatchSize = Math.ceil(targetBatchDuration / averageDuration);
    
    // Ensure batch size is reasonable (between 1 and 10)
    return Math.max(1, Math.min(10, optimalBatchSize));
  }
  
  /**
   * Generate execution plan with timing estimates
   */
  private generateExecutionPlan(tests: TestWithMetadata[]): any {
    const plan = {
      totalTests: tests.length,
      estimatedDuration: tests.reduce((sum, test) => sum + test.metadata!.estimatedDuration, 0),
      categories: {} as Record<string, number>,
      resourceUtilization: {} as Record<string, number>,
      criticalPath: [] as string[],
      parallelizationOpportunities: [] as string[]
    };
    
    // Count tests by category
    for (const test of tests) {
      const category = test.metadata!.category;
      plan.categories[category] = (plan.categories[category] || 0) + 1;
    }
    
    // Calculate resource utilization
    for (const test of tests) {
      for (const resource of test.metadata!.resourceRequirements) {
        plan.resourceUtilization[resource] = (plan.resourceUtilization[resource] || 0) + 1;
      }
    }
    
    // Identify critical path (tests with most dependencies)
    const criticalTests = tests
      .filter(test => test.metadata!.dependencies.length > 2)
      .map(test => test.path.split('/').pop() || '');
    plan.criticalPath = criticalTests;
    
    // Identify parallelization opportunities
    const independentTests = tests
      .filter(test => test.metadata!.dependencies.length === 0)
      .map(test => test.path.split('/').pop() || '');
    plan.parallelizationOpportunities = independentTests;
    
    return plan;
  }
}

// Export the sequencer
export default IntegrationTestSequencer;