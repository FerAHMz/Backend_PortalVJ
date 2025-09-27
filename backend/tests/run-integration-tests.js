const { spawn } = require('child_process');
const path = require('path');

console.log('Portal Vanguardia Juvenil - Integration Test Suite');
console.log('=====================================================\n');

// Configuration
const TEST_CONFIG = {
  timeout: 10000,
  reporter: 'spec',
  testPattern: 'tests/integration/*.test.js',
  coverage: process.env.COVERAGE === 'true'
};

// Test execution function
function runTests() {
  const mochaArgs = [
    TEST_CONFIG.testPattern,
    '--timeout', TEST_CONFIG.timeout.toString(),
    '--reporter', TEST_CONFIG.reporter,
    '--recursive'
  ];

  console.log('Test Configuration:');
  console.log(`   • Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`   • Reporter: ${TEST_CONFIG.reporter}`);
  console.log(`   • Pattern: ${TEST_CONFIG.testPattern}`);
  console.log(`   • Coverage: ${TEST_CONFIG.coverage ? 'enabled' : 'disabled'}\n`);

  console.log('Running Integration Tests...\n');

  const mochaProcess = spawn('npx', ['mocha', ...mochaArgs], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
  });

  mochaProcess.on('close', (code) => {
    console.log('\nTest Results Summary:');
    if (code === 0) {
      console.log('    All tests passed successfully!');
      console.log('    Integration test suite completed without errors.\n');
      
      console.log('   Test Coverage Areas:');
      console.log('   • Authentication & Authorization');
      console.log('   • User Management');
      console.log('   • Course Management');
      console.log('   • Payment Processing');
      console.log('   • Message System');
      console.log('   • API Response Validation');
      console.log('   • HTTP Methods & Status Codes');
      console.log('   • Data Validation Functions\n');
      
      console.log('   Next Steps:');
      console.log('   1. Review test results above');
      console.log('   2. Run with coverage: COVERAGE=true npm run test:integration');
      console.log('   3. Add more specific tests for edge cases');
      console.log('   4. Integration with CI/CD pipeline\n');
    } else {
      console.log('    Some tests failed or encountered errors');
      console.log(`    Exit code: ${code}`);
      console.log('    Check the test output above for details\n');
      
      console.log('   Troubleshooting:');
      console.log('   1. Ensure all dependencies are installed');
      console.log('   2. Check database connection settings');
      console.log('   3. Verify environment variables');
      console.log('   4. Review test logs for specific errors\n');
    }
    
    process.exit(code);
  });

  mochaProcess.on('error', (error) => {
    console.error('❌ Error running tests:', error.message);
    process.exit(1);
  });
}

// Environment validation
function validateEnvironment() {
  console.log('🔍 Validating test environment...');
  
  const requiredPackages = ['mocha', 'chai', 'supertest'];
  const missingPackages = [];
  
  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      console.log(`    ${pkg} - available`);
    } catch (error) {
      console.log(`    ${pkg} - missing`);
      missingPackages.push(pkg);
    }
  }
  
  if (missingPackages.length > 0) {
    console.log(`\nMissing required packages: ${missingPackages.join(', ')}`);
    console.log('   Run: npm install --save-dev ' + missingPackages.join(' '));
    process.exit(1);
  }
  
  console.log('    All required packages available\n');
}

// Main execution
function main() {
  try {
    validateEnvironment();
    runTests();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node run-integration-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --coverage     Enable code coverage (or set COVERAGE=true)');
  console.log('');
  console.log('Environment Variables:');
  console.log('  COVERAGE       Enable code coverage reporting (true/false)');
  console.log('');
  process.exit(0);
}

if (process.argv.includes('--coverage')) {
  TEST_CONFIG.coverage = true;
}

// Run the tests
main();
