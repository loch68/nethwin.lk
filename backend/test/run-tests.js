#!/usr/bin/env node

const { exec } = require('child_process');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📚 NethwinLK Test Runner');
console.log('=======================\n');

const testFiles = {
  '1': 'member1.js',    // User Management
  '2': 'member2.js',    // Product Management
  '3': 'member3.js',    // Order Management
  '4': 'member4.js',    // Print Order Management
  '5': 'member5.js',    // Reviews & Messaging
  'all': 'all'          // Run all tests
};

function runTest(memberNumber) {
  if (memberNumber === 'all') {
    console.log('🚀 Running all tests...\n');
    
    // Run each test file in sequence
    const members = Object.entries(testFiles)
      .filter(([key]) => key !== 'all')
      .map(([key, file]) => ({ key, file }));
    
    const runNext = (index) => {
      if (index >= members.length) {
        console.log('\n🎉 All tests completed!');
        process.exit(0);
      }
      
      const { key, file } = members[index];
      console.log(`\n🔍 Running tests for Member ${key} (${file})...\n`);
      
      const child = exec(`node ${path.join(__dirname, file)}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error running tests for Member ${key}:`, error.message);
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
        
        // Run next test
        runNext(index + 1);
      });
      
      // Ensure output is shown in real-time
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    };
    
    runNext(0);
  } else if (testFiles[memberNumber]) {
    const testFile = testFiles[memberNumber];
    console.log(`🚀 Running tests for Member ${memberNumber} (${testFile})...\n`);
    
    const child = exec(`node ${path.join(__dirname, testFile)}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error running tests for Member ${memberNumber}:`, error.message);
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      process.exit(0);
    });
    
    // Ensure output is shown in real-time
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  } else {
    console.error('❌ Invalid member number. Please choose a number between 1-5 or "all".');
    process.exit(1);
  }
}

// Show menu if no arguments provided
if (process.argv.length <= 2) {
  console.log('Please select which module to test:\n');
  console.log('1. Member 1 - User Management');
  console.log('2. Member 2 - Product Management');
  console.log('3. Member 3 - Order Management');
  console.log('4. Member 4 - Print Order Management');
  console.log('5. Member 5 - Reviews & Messaging');
  console.log('all. Run all tests\n');
  
  rl.question('Enter your choice (1-5 or "all"): ', (answer) => {
    const choice = answer.trim().toLowerCase();
    if (testFiles[choice] || choice === 'all') {
      runTest(choice);
    } else {
      console.error('❌ Invalid choice. Please try again.');
      process.exit(1);
    }
    rl.close();
  });
} else {
  // Run with command line argument
  const choice = process.argv[2].toLowerCase();
  runTest(choice);
}
