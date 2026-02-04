/**
 * Global Teardown for Integration Tests
 * 
 * Performs cleanup after all integration tests complete.
 * Cleans up resources, generates final reports, and handles test artifacts.
 */

import { unlinkSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting integration test cleanup...');
  
  try {
    // Clean up test resources
    await cleanupTestResources();
    
    // Generate final test summary
    await generateFinalSummary();
    
    // Clean up temporary files
    await cleanupTemporaryFiles();
    
    // Archive test artifacts
    await archiveTestArtifacts();
    
    console.log('✅ Integration test cleanup complete');
    
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
    // Don't throw - cleanup errors shouldn't fail the test run
  }
}

/**
 * Clean up test resources and mock services
 */
async function cleanupTestResources(): Promise<void> {
  console.log('🔧 Cleaning up test resources...');
  
  try {
    // Clean up global test objects
    if ((global as any).__MOCK_MODULES__) {
      delete (global as any).__MOCK_MODULES__;
    }
    
    if ((global as any).__TEST_DATA__) {
      delete (global as any).__TEST_DATA__;
    }
    
    if ((global as any).__TEST_LOGGER__) {
      delete (global as any).__TEST_LOGGER__;
    }
    
    // Clean up environment variables
    delete process.env.VOICE_AGENT_TEST_MODE;
    delete process.env.MOCK_API_ENABLED;
    delete process.env.TEST_TIMEOUT;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Test resources cleaned up');
    
  } catch (error) {
    console.warn('⚠️  Warning during resource cleanup:', error);
  }
}

/**
 * Generate final test summary and statistics
 */
async function generateFinalSummary(): Promise<void> {
  console.log('📊 Generating final test summary...');
  
  try {
    const summaryData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      testExecution: {
        startTime: process.env.TEST_START_TIME || 'unknown',
        endTime: new Date().toISOString(),
        duration: process.uptime(),
        exitCode: process.exitCode || 0
      },
      resources: {
        peakMemoryUsage: getPeakMemoryUsage(),
        totalCPUTime: process.cpuUsage(),
        fileSystemOperations: getFileSystemStats()
      }
    };
    
    const summaryPath = join(process.cwd(), 'test-reports', 'final-summary.json');
    writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    
    console.log(`📄 Final summary saved to: ${summaryPath}`);
    
    // Print summary to console
    printSummaryToConsole(summaryData);
    
  } catch (error) {
    console.warn('⚠️  Warning during summary generation:', error);
  }
}

/**
 * Clean up temporary files created during testing
 */
async function cleanupTemporaryFiles(): Promise<void> {
  console.log('🗑️  Cleaning up temporary files...');
  
  try {
    const tempFiles = [
      'test-config.json',
      'test-data.json'
    ];
    
    for (const file of tempFiles) {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`🗑️  Removed: ${file}`);
      }
    }
    
    // Clean up any .tmp files in test directories
    const testReportsDir = join(process.cwd(), 'test-reports');
    if (existsSync(testReportsDir)) {
      const files = readdirSync(testReportsDir);
      for (const file of files) {
        if (file.endsWith('.tmp') || file.endsWith('.temp')) {
          const filePath = join(testReportsDir, file);
          unlinkSync(filePath);
          console.log(`🗑️  Removed temp file: ${file}`);
        }
      }
    }
    
    console.log('✅ Temporary files cleaned up');
    
  } catch (error) {
    console.warn('⚠️  Warning during temp file cleanup:', error);
  }
}

/**
 * Archive test artifacts for later analysis
 */
async function archiveTestArtifacts(): Promise<void> {
  console.log('📦 Archiving test artifacts...');
  
  try {
    const testReportsDir = join(process.cwd(), 'test-reports');
    if (!existsSync(testReportsDir)) {
      return;
    }
    
    // Create archive metadata
    const archiveMetadata = {
      timestamp: new Date().toISOString(),
      testRun: {
        id: generateTestRunId(),
        environment: process.env.NODE_ENV || 'unknown',
        branch: process.env.GIT_BRANCH || 'unknown',
        commit: process.env.GIT_COMMIT || 'unknown'
      },
      artifacts: {
        reports: [],
        logs: [],
        coverage: [],
        screenshots: []
      }
    };
    
    // Catalog artifacts
    const files = readdirSync(testReportsDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile()) {
        const filePath = join(testReportsDir, file.name);
        const stats = statSync(filePath);
        
        const artifactInfo = {
          name: file.name,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString()
        };
        
        if (file.name.includes('report')) {
          archiveMetadata.artifacts.reports.push(artifactInfo);
        } else if (file.name.includes('log')) {
          archiveMetadata.artifacts.logs.push(artifactInfo);
        } else if (file.name.includes('coverage')) {
          archiveMetadata.artifacts.coverage.push(artifactInfo);
        } else if (file.name.includes('screenshot')) {
          archiveMetadata.artifacts.screenshots.push(artifactInfo);
        }
      }
    }
    
    // Save archive metadata
    const metadataPath = join(testReportsDir, 'archive-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(archiveMetadata, null, 2));
    
    console.log(`📦 Archive metadata saved to: ${metadataPath}`);
    console.log(`📊 Archived ${getTotalArtifactCount(archiveMetadata)} artifacts`);
    
  } catch (error) {
    console.warn('⚠️  Warning during artifact archiving:', error);
  }
}

/**
 * Get peak memory usage during test execution
 */
function getPeakMemoryUsage(): number {
  const memUsage = process.memoryUsage();
  return Math.max(
    memUsage.heapUsed,
    memUsage.heapTotal,
    memUsage.external
  );
}

/**
 * Get file system operation statistics
 */
function getFileSystemStats(): any {
  // This would typically track file operations during tests
  // For now, return basic info
  return {
    tempFilesCreated: 0,
    reportsGenerated: 0,
    logsWritten: 0
  };
}

/**
 * Print summary to console
 */
function printSummaryToConsole(summaryData: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 INTEGRATION TEST EXECUTION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`⏱️  Duration: ${summaryData.testExecution.duration.toFixed(1)}s`);
  console.log(`🖥️  Platform: ${summaryData.environment.platform} (${summaryData.environment.arch})`);
  console.log(`📦 Node.js: ${summaryData.environment.nodeVersion}`);
  console.log(`💾 Peak Memory: ${(summaryData.resources.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
  console.log(`🔄 CPU Time: ${summaryData.resources.totalCPUTime.user + summaryData.resources.totalCPUTime.system}μs`);
  console.log(`🚪 Exit Code: ${summaryData.testExecution.exitCode}`);
  
  if (summaryData.testExecution.exitCode === 0) {
    console.log('✅ All integration tests completed successfully');
  } else {
    console.log('❌ Some integration tests failed');
  }
  
  console.log('='.repeat(60));
}

/**
 * Generate unique test run ID
 */
function generateTestRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `integration-${timestamp}-${random}`;
}

/**
 * Get total count of archived artifacts
 */
function getTotalArtifactCount(metadata: any): number {
  return (
    metadata.artifacts.reports.length +
    metadata.artifacts.logs.length +
    metadata.artifacts.coverage.length +
    metadata.artifacts.screenshots.length
  );
}

/**
 * Handle process signals for graceful shutdown
 */
function setupGracefulShutdown(): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, performing graceful shutdown...`);
      
      try {
        await cleanupTestResources();
        console.log('✅ Graceful shutdown complete');
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
      }
      
      process.exit(0);
    });
  });
}

// Set up graceful shutdown handlers
setupGracefulShutdown();