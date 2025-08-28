#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  UNIT_TESTS: 'tests/unit',
  INTEGRATION_TESTS: 'tests/integration',
  E2E_TESTS: 'tests/e2e',
  PERFORMANCE_TESTS: 'tests/performance',
  ACCESSIBILITY_TESTS: 'tests/accessibility',
  COVERAGE_THRESHOLD: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
};

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 },
      accessibility: { passed: 0, failed: 0, total: 0 },
      coverage: { lines: 0, branches: 0, functions: 0, statements: 0 }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description) {
    try {
      this.log(`Running: ${description}`);
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });
      this.log(`✅ ${description} completed successfully`, 'success');
      return { success: true, output };
    } catch (error) {
      this.log(`❌ ${description} failed: ${error.message}`, 'error');
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }

  async runUnitTests() {
    this.log('🧪 Starting Unit Tests...');
    const result = await this.runCommand(
      'npm run test:unit -- --verbose --json --outputFile=test-results-unit.json',
      'Unit Tests'
    );

    if (result.success) {
      try {
        const testResults = JSON.parse(fs.readFileSync('test-results-unit.json', 'utf8'));
        this.results.unit = {
          passed: testResults.numPassedTests,
          failed: testResults.numFailedTests,
          total: testResults.numTotalTests
        };
      } catch (e) {
        this.log('Could not parse unit test results', 'error');
      }
    }

    return result.success;
  }

  async runIntegrationTests() {
    this.log('🔗 Starting Integration Tests...');
    const result = await this.runCommand(
      'npm run test:integration -- --verbose --json --outputFile=test-results-integration.json',
      'Integration Tests'
    );

    if (result.success) {
      try {
        const testResults = JSON.parse(fs.readFileSync('test-results-integration.json', 'utf8'));
        this.results.integration = {
          passed: testResults.numPassedTests,
          failed: testResults.numFailedTests,
          total: testResults.numTotalTests
        };
      } catch (e) {
        this.log('Could not parse integration test results', 'error');
      }
    }

    return result.success;
  }

  async runE2ETests() {
    this.log('🌐 Starting End-to-End Tests...');
    const result = await this.runCommand(
      'npm run test:e2e -- --verbose --json --outputFile=test-results-e2e.json',
      'E2E Tests'
    );

    if (result.success) {
      try {
        const testResults = JSON.parse(fs.readFileSync('test-results-e2e.json', 'utf8'));
        this.results.e2e = {
          passed: testResults.numPassedTests,
          failed: testResults.numFailedTests,
          total: testResults.numTotalTests
        };
      } catch (e) {
        this.log('Could not parse E2E test results', 'error');
      }
    }

    return result.success;
  }

  async runPerformanceTests() {
    this.log('⚡ Starting Performance Tests...');
    const result = await this.runCommand(
      'npm run test:performance -- --verbose --json --outputFile=test-results-performance.json',
      'Performance Tests'
    );

    if (result.success) {
      try {
        const testResults = JSON.parse(fs.readFileSync('test-results-performance.json', 'utf8'));
        this.results.performance = {
          passed: testResults.numPassedTests,
          failed: testResults.numFailedTests,
          total: testResults.numTotalTests
        };
      } catch (e) {
        this.log('Could not parse performance test results', 'error');
      }
    }

    return result.success;
  }

  async runAccessibilityTests() {
    this.log('♿ Starting Accessibility Tests...');
    const result = await this.runCommand(
      'npm run test:accessibility -- --verbose --json --outputFile=test-results-accessibility.json',
      'Accessibility Tests'
    );

    if (result.success) {
      try {
        const testResults = JSON.parse(fs.readFileSync('test-results-accessibility.json', 'utf8'));
        this.results.accessibility = {
          passed: testResults.numPassedTests,
          failed: testResults.numFailedTests,
          total: testResults.numTotalTests
        };
      } catch (e) {
        this.log('Could not parse accessibility test results', 'error');
      }
    }

    return result.success;
  }

  async runCoverageAnalysis() {
    this.log('📊 Running Coverage Analysis...');
    const result = await this.runCommand(
      'npm run test:coverage -- --coverageReporters=json --coverageDirectory=coverage',
      'Coverage Analysis'
    );

    if (result.success) {
      try {
        const coverageReport = JSON.parse(fs.readFileSync('coverage/coverage-final.json', 'utf8'));
        const summary = coverageReport.total;
        
        this.results.coverage = {
          lines: summary.lines.pct,
          branches: summary.branches.pct,
          functions: summary.functions.pct,
          statements: summary.statements.pct
        };
      } catch (e) {
        this.log('Could not parse coverage results', 'error');
      }
    }

    return result.success;
  }

  generateTestReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    const report = `
# 🧪 Test Execution Report

## 📈 Summary
- **Total Duration**: ${duration} seconds
- **Overall Status**: ${this.getOverallStatus()}

## 📊 Test Results

### Unit Tests
- ✅ Passed: ${this.results.unit.passed}
- ❌ Failed: ${this.results.unit.failed}
- 📊 Total: ${this.results.unit.total}
- 📈 Success Rate: ${this.calculateSuccessRate(this.results.unit)}%

### Integration Tests
- ✅ Passed: ${this.results.integration.passed}
- ❌ Failed: ${this.results.integration.failed}
- 📊 Total: ${this.results.integration.total}
- 📈 Success Rate: ${this.calculateSuccessRate(this.results.integration)}%

### End-to-End Tests
- ✅ Passed: ${this.results.e2e.passed}
- ❌ Failed: ${this.results.e2e.failed}
- 📊 Total: ${this.results.e2e.total}
- 📈 Success Rate: ${this.calculateSuccessRate(this.results.e2e)}%

### Performance Tests
- ✅ Passed: ${this.results.performance.passed}
- ❌ Failed: ${this.results.performance.failed}
- 📊 Total: ${this.results.performance.total}
- 📈 Success Rate: ${this.calculateSuccessRate(this.results.performance)}%

### Accessibility Tests
- ✅ Passed: ${this.results.accessibility.passed}
- ❌ Failed: ${this.results.accessibility.failed}
- 📊 Total: ${this.results.accessibility.total}
- 📈 Success Rate: ${this.calculateSuccessRate(this.results.accessibility)}%

## 📊 Coverage Report
- 📈 Lines: ${this.results.coverage.lines}%
- 🌿 Branches: ${this.results.coverage.branches}%
- 🔧 Functions: ${this.results.coverage.functions}%
- 📝 Statements: ${this.results.coverage.statements}%

## 🎯 Coverage Thresholds
- ✅ Lines: ${this.results.coverage.lines >= TEST_CONFIG.COVERAGE_THRESHOLD.lines ? 'PASS' : 'FAIL'} (${TEST_CONFIG.COVERAGE_THRESHOLD.lines}%)
- ✅ Branches: ${this.results.coverage.branches >= TEST_CONFIG.COVERAGE_THRESHOLD.branches ? 'PASS' : 'FAIL'} (${TEST_CONFIG.COVERAGE_THRESHOLD.branches}%)
- ✅ Functions: ${this.results.coverage.functions >= TEST_CONFIG.COVERAGE_THRESHOLD.functions ? 'PASS' : 'FAIL'} (${TEST_CONFIG.COVERAGE_THRESHOLD.functions}%)
- ✅ Statements: ${this.results.coverage.statements >= TEST_CONFIG.COVERAGE_THRESHOLD.statements ? 'PASS' : 'FAIL'} (${TEST_CONFIG.COVERAGE_THRESHOLD.statements}%)

## 🚀 Recommendations
${this.generateRecommendations()}

---
*Report generated on ${new Date().toISOString()}*
`;

    return report;
  }

  calculateSuccessRate(testResult) {
    if (testResult.total === 0) return 0;
    return ((testResult.passed / testResult.total) * 100).toFixed(1);
  }

  getOverallStatus() {
    const allTests = [
      this.results.unit,
      this.results.integration,
      this.results.e2e,
      this.results.performance,
      this.results.accessibility
    ];

    const totalPassed = allTests.reduce((sum, test) => sum + test.passed, 0);
    const totalFailed = allTests.reduce((sum, test) => sum + test.failed, 0);
    const totalTests = totalPassed + totalFailed;

    if (totalTests === 0) return 'NO TESTS RUN';
    if (totalFailed === 0) return 'ALL TESTS PASSED ✅';
    if (totalPassed === 0) return 'ALL TESTS FAILED ❌';
    return `PARTIAL SUCCESS (${totalPassed}/${totalTests} passed) ⚠️`;
  }

  generateRecommendations() {
    const recommendations = [];

    // Test success rate recommendations
    Object.entries(this.results).forEach(([type, result]) => {
      if (type === 'coverage') return;
      
      const successRate = this.calculateSuccessRate(result);
      if (parseFloat(successRate) < 90) {
        recommendations.push(`- Improve ${type} test success rate (currently ${successRate}%)`);
      }
    });

    // Coverage recommendations
    Object.entries(this.results.coverage).forEach(([metric, coverage]) => {
      const threshold = TEST_CONFIG.COVERAGE_THRESHOLD[metric];
      if (coverage < threshold) {
        recommendations.push(`- Increase ${metric} coverage (currently ${coverage}%, target ${threshold}%)`);
      }
    });

    // Performance recommendations
    if (this.results.performance.failed > 0) {
      recommendations.push('- Review and optimize performance bottlenecks');
    }

    // Accessibility recommendations
    if (this.results.accessibility.failed > 0) {
      recommendations.push('- Address accessibility issues for better user experience');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Excellent test coverage and performance! Keep up the good work! 🎉');
    }

    return recommendations.join('\n');
  }

  async cleanup() {
    const filesToRemove = [
      'test-results-unit.json',
      'test-results-integration.json',
      'test-results-e2e.json',
      'test-results-performance.json',
      'test-results-accessibility.json'
    ];

    filesToRemove.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (e) {
        this.log(`Could not remove ${file}: ${e.message}`, 'error');
      }
    });
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive Test Suite...');
    this.log('=====================================');

    const testSuites = [
      { name: 'Unit Tests', runner: () => this.runUnitTests() },
      { name: 'Integration Tests', runner: () => this.runIntegrationTests() },
      { name: 'E2E Tests', runner: () => this.runE2ETests() },
      { name: 'Performance Tests', runner: () => this.runPerformanceTests() },
      { name: 'Accessibility Tests', runner: () => this.runAccessibilityTests() },
      { name: 'Coverage Analysis', runner: () => this.runCoverageAnalysis() }
    ];

    const results = [];
    for (const suite of testSuites) {
      const success = await suite.runner();
      results.push({ name: suite.name, success });
    }

    // Generate and save report
    const report = this.generateTestReport();
    fs.writeFileSync('test-report.md', report);
    
    // Cleanup temporary files
    await this.cleanup();

    // Display summary
    this.log('=====================================');
    this.log('📋 Test Execution Complete!');
    this.log(`📄 Detailed report saved to: test-report.md`);
    this.log(`📊 Overall Status: ${this.getOverallStatus()}`);

    // Exit with appropriate code
    const allPassed = results.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  }
}

// Run the test suite
const runner = new TestRunner();
runner.runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
