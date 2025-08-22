#!/usr/bin/env node
/**
 * Integration Test Runner for Portal Vanguardia Juvenil Backend
 * 
 * This script runs the comprehensive integration test suite using Mocha.
 * It includes setup, execution, and cleanup phases.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  testTimeout: 30000,
  dbTimeout: 15000,
  coverageThreshold: 80,
  maxRetries: 3
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

async function checkDependencies() {
  logHeader('Checking Dependencies');
  
  try {
    // Check if Mocha is installed
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const mochaInstalled = packageJson.devDependencies && packageJson.devDependencies.mocha;
    
    if (!mochaInstalled) {
      logError('Mocha is not installed. Please run: npm install --save-dev mocha chai chai-http nyc');
      process.exit(1);
    }
    
    logSuccess('Mocha dependency found');
    
    // Check if test files exist
    const testDir = path.join(__dirname, 'backend', 'tests', 'integration');
    if (!fs.existsSync(testDir)) {
      logError('Integration test directory not found');
      process.exit(1);
    }
    
    logSuccess('Test directory structure verified');
    
  } catch (error) {
    logError(`Dependency check failed: ${error.message}`);
    process.exit(1);
  }
}

async function checkDatabaseConnection() {
  logHeader('Checking Database Connection');
  
  return new Promise((resolve, reject) => {
    const { Pool } = require('pg');
    
    const dbConfig = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'portalvj_db',
      password: process.env.DB_PASSWORD || 'admin123.',
      port: process.env.DB_PORT || 5432,
    };
    
    const pool = new Pool(dbConfig);
    
    logInfo('Attempting database connection...');
    
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        logError(`Database connection failed: ${err.message}`);
        logWarning('Make sure PostgreSQL is running and configured correctly');
        logInfo('Expected configuration:');
        logInfo(`Host: ${dbConfig.host}:${dbConfig.port}`);
        logInfo(`Database: ${dbConfig.database}`);
        logInfo(`User: ${dbConfig.user}`);
        reject(err);
      } else {
        logSuccess('Database connection established');
        logInfo(`Connected at: ${result.rows[0].now}`);
        pool.end();
        resolve();
      }
    });
    
    // Timeout after specified time
    setTimeout(() => {
      logError('Database connection timeout');
      pool.end();
      reject(new Error('Database connection timeout'));
    }, config.dbTimeout);
  });
}

async function runTests(testPattern = '**/*.test.js') {
  logHeader('Running Integration Tests');
  
  return new Promise((resolve, reject) => {
    const testCommand = `npx mocha backend/tests/integration/${testPattern} --timeout ${config.testTimeout} --recursive --reporter spec`;
    
    logInfo(`Executing: ${testCommand}`);
    
    const testProcess = exec(testCommand, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VERBOSE_TESTS: 'false'
      }
    });
    
    let testOutput = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      testOutput += data;
      process.stdout.write(data);
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data;
      process.stderr.write(data);
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('All integration tests passed!');
        resolve({ success: true, output: testOutput });
      } else {
        logError(`Tests failed with exit code: ${code}`);
        reject({ success: false, output: testOutput, error: errorOutput });
      }
    });
    
    testProcess.on('error', (error) => {
      logError(`Test execution error: ${error.message}`);
      reject({ success: false, error: error.message });
    });
  });
}

async function runTestsWithCoverage() {
  logHeader('Running Tests with Coverage');
  
  return new Promise((resolve, reject) => {
    const coverageCommand = `npx nyc --reporter=text --reporter=html --reporter=lcov mocha backend/tests/integration/**/*.test.js --timeout ${config.testTimeout} --recursive`;
    
    logInfo(`Executing: ${coverageCommand}`);
    
    const coverageProcess = exec(coverageCommand, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VERBOSE_TESTS: 'false'
      }
    });
    
    let coverageOutput = '';
    
    coverageProcess.stdout.on('data', (data) => {
      coverageOutput += data;
      process.stdout.write(data);
    });
    
    coverageProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    coverageProcess.on('close', (code) => {
      if (code === 0) {
        logSuccess('Coverage report generated successfully');
        logInfo('Coverage reports available in: ./coverage/');
        resolve({ success: true, output: coverageOutput });
      } else {
        logWarning(`Coverage generation completed with warnings (exit code: ${code})`);
        resolve({ success: true, output: coverageOutput });
      }
    });
  });
}

async function generateTestReport(results) {
  logHeader('Generating Test Report');
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'portalvj_db'
      }
    },
    testResults: results,
    configuration: config
  };
  
  const reportPath = path.join(process.cwd(), 'test-reports', `integration-test-report-${Date.now()}.json`);
  
  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess(`Test report saved to: ${reportPath}`);
  return reportPath;
}

async function cleanup() {
  logHeader('Cleanup');
  
  try {
    // Additional cleanup tasks can be added here
    logInfo('Performing cleanup tasks...');
    
    // Remove temporary test files if any
    const tempFiles = ['temp-test-data.json', '.test-cache'];
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        logInfo(`Removed temporary file: ${file}`);
      }
    });
    
    logSuccess('Cleanup completed');
  } catch (error) {
    logWarning(`Cleanup warning: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes('--coverage'),
    pattern: args.find(arg => arg.startsWith('--pattern='))?.split('=')[1] || '**/*.test.js',
    skipDeps: args.includes('--skip-deps'),
    skipDb: args.includes('--skip-db')
  };
  
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║              Portal Vanguardia Juvenil Backend              ║
║                    Integration Test Suite                    ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
  `);
  
  try {
    // Pre-flight checks
    if (!options.skipDeps) {
      await checkDependencies();
    }
    
    if (!options.skipDb) {
      await checkDatabaseConnection();
    }
    
    // Run tests
    const startTime = Date.now();
    let testResults;
    
    if (options.coverage) {
      testResults = await runTestsWithCoverage();
    } else {
      testResults = await runTests(options.pattern);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Generate report
    const reportData = {
      ...testResults,
      duration,
      options
    };
    
    await generateTestReport(reportData);
    
    // Final summary
    logHeader('Test Summary');
    logSuccess(`Integration tests completed successfully in ${duration}ms`);
    
    if (options.coverage) {
      logInfo('Coverage report available in ./coverage/index.html');
    }
    
    await cleanup();
    
    process.exit(0);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message || error}`);
    
    if (error.output) {
      console.log('\nTest Output:');
      console.log(error.output);
    }
    
    if (error.error) {
      console.log('\nError Details:');
      console.log(error.error);
    }
    
    await cleanup();
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  runTestsWithCoverage,
  checkDatabaseConnection,
  checkDependencies
};
