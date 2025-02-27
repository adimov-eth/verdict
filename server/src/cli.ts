#!/usr/bin/env node

import { analyzeConflict, createAnalysisStream, checkAPIStatus } from './ai_new';
import { CounselingMode } from '../schema';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env file found in project root, checking current directory');
  dotenv.config();
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

// Sample data for testing
const sampleData = {
  dinner: {
    partner1: 'I like Italian food, especially pasta and pizza. I\'m also a fan of fresh ingredients and homemade meals. I don\'t like spicy food that much.',
    partner2: 'I prefer Asian cuisine, especially Thai and Japanese. I love spicy food and enjoy trying new and exotic dishes. I\'m also vegetarian.'
  },
  entertainment: {
    partner1: 'I enjoy sci-fi movies and TV shows like Star Trek and The Expanse. I also like documentaries about space and technology.',
    partner2: 'I prefer comedy and drama series like The Office and Breaking Bad. I also enjoy true crime documentaries and reality TV shows.'
  },
  relationship: {
    partner1: 'My partner never does their share of household chores. I always have to remind them to do the dishes and take out the trash.',
    partner2: 'I feel like my efforts around the house go unnoticed. I do different chores than my partner expects, but I contribute in my own way.'
  }
};

// Main menu
async function mainMenu() {
  console.clear();
  console.log('=== AI Prompt Testing CLI ===');
  console.log('1. Test API Status');
  console.log('2. Test Dinner Recommendation');
  console.log('3. Test Entertainment Recommendation');
  console.log('4. Test Relationship Analysis (Evaluator Mode)');
  console.log('5. Test Relationship Analysis (Counselor Mode)');
  console.log('6. Exit');
  
  const choice = await question('\nEnter your choice (1-6): ');
  
  switch (choice) {
    case '1':
      await testAPIStatus();
      break;
    case '2':
      await testDinnerRecommendation();
      break;
    case '3':
      await testEntertainmentRecommendation();
      break;
    case '4':
      await testRelationshipAnalysis('evaluator');
      break;
    case '5':
      await testRelationshipAnalysis('counselor');
      break;
    case '6':
      console.log('Exiting...');
      rl.close();
      return;
    default:
      console.log('Invalid choice. Please try again.');
      await waitForKeypress();
      await mainMenu();
      break;
  }
}

// Test API Status
async function testAPIStatus() {
  console.clear();
  console.log('=== Testing API Status ===');
  
  try {
    const status = await checkAPIStatus();
    console.log('\nAPI Status:', status);
  } catch (error) {
    console.error('Error checking API status:', error);
  }
  
  await waitForKeypress();
  await mainMenu();
}

// Test Dinner Recommendation
async function testDinnerRecommendation() {
  console.clear();
  console.log('=== Testing Dinner Recommendation ===');
  
  const partner1Name = await question('\nEnter name for Partner 1 (default: Partner1): ') || 'Partner1';
  const partner2Name = await question('Enter name for Partner 2 (default: Partner2): ') || 'Partner2';
  
  console.log('\nSelect test type:');
  console.log('1. Live Discussion');
  console.log('2. Separate Preferences');
  
  const testType = await question('\nEnter your choice (1-2): ');
  const isLiveArgument = testType === '1';
  
  console.log('\nSelect input method:');
  console.log('1. Use sample data');
  console.log('2. Enter custom data');
  
  const inputMethod = await question('\nEnter your choice (1-2): ');
  
  let partner1Text: string;
  let partner2Text: string | null = null;
  
  if (inputMethod === '1') {
    partner1Text = sampleData.dinner.partner1;
    partner2Text = sampleData.dinner.partner2;
    
    console.log(`\nPartner 1 (${partner1Name}) sample data: ${partner1Text}`);
    console.log(`Partner 2 (${partner2Name}) sample data: ${partner2Text}`);
  } else {
    partner1Text = await question(`\nEnter text for ${partner1Name}: `);
    partner2Text = await question(`Enter text for ${partner2Name} (leave empty for none): `);
  }

  // Wrap text in JSON format as expected by the AI functions
  const partner1Json = JSON.stringify({ text: partner1Text, segments: [{ text: partner1Text }] });
  const partner2Json = partner2Text ? JSON.stringify({ text: partner2Text, segments: [{ text: partner2Text }] }) : null;
  
  console.log('\nProcessing...');
  
  try {
    const result = await analyzeConflict(
      partner1Json,
      partner2Json ?? '',
      'dinner',
      isLiveArgument,
      partner1Name,
      partner2Name
    );
    
    const parsedResult = JSON.parse(result);
    console.log('\n=== Result ===\n');
    console.log(parsedResult.verdict);
  } catch (error) {
    console.error('Error analyzing conflict:', error);
  }
  
  await waitForKeypress();
  await mainMenu();
}

// Test Entertainment Recommendation
async function testEntertainmentRecommendation() {
  console.clear();
  console.log('=== Testing Entertainment Recommendation ===');
  
  const partner1Name = await question('\nEnter name for Partner 1 (default: Partner1): ') || 'Partner1';
  const partner2Name = await question('Enter name for Partner 2 (default: Partner2): ') || 'Partner2';
  
  console.log('\nSelect test type:');
  console.log('1. Live Discussion');
  console.log('2. Separate Preferences');
  
  const testType = await question('\nEnter your choice (1-2): ');
  const isLiveArgument = testType === '1';
  
  console.log('\nSelect input method:');
  console.log('1. Use sample data');
  console.log('2. Enter custom data');
  
  const inputMethod = await question('\nEnter your choice (1-2): ');
  
  let partner1Text: string;
  let partner2Text: string | null = null;
  
  if (inputMethod === '1') {
    partner1Text = sampleData.entertainment.partner1;
    partner2Text = sampleData.entertainment.partner2;
    
    console.log(`\nPartner 1 (${partner1Name}) sample data: ${partner1Text}`);
    console.log(`Partner 2 (${partner2Name}) sample data: ${partner2Text}`);
  } else {
    partner1Text = await question(`\nEnter text for ${partner1Name}: `);
    partner2Text = await question(`Enter text for ${partner2Name} (leave empty for none): `);
  }

  // Wrap text in JSON format as expected by the AI functions
  const partner1Json = JSON.stringify({ text: partner1Text, segments: [{ text: partner1Text }] });
  const partner2Json = partner2Text ? JSON.stringify({ text: partner2Text, segments: [{ text: partner2Text }] }) : null;
  
  console.log('\nProcessing...');
  
  try {
    const result = await analyzeConflict(
      partner1Json,
      partner2Json ?? '',
      'entertainment',
      isLiveArgument,
      partner1Name,
      partner2Name
    );
    
    const parsedResult = JSON.parse(result);
    console.log('\n=== Result ===\n');
    console.log(parsedResult.verdict);
  } catch (error) {
    console.error('Error analyzing conflict:', error);
  }
  
  await waitForKeypress();
  await mainMenu();
}

// Test Relationship Analysis
async function testRelationshipAnalysis(mode: 'evaluator' | 'counselor') {
  console.clear();
  console.log(`=== Testing Relationship Analysis (${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode) ===`);
  
  const counselingMode: CounselingMode = mode;
  
  const partner1Name = await question('\nEnter name for Partner 1 (default: Partner1): ') || 'Partner1';
  const partner2Name = await question('Enter name for Partner 2 (default: Partner2): ') || 'Partner2';
  
  console.log('\nSelect test type:');
  console.log('1. Live Argument');
  console.log('2. Separate Perspectives');
  
  const testType = await question('\nEnter your choice (1-2): ');
  const isLiveArgument = testType === '1';
  
  console.log('\nSelect input method:');
  console.log('1. Use sample data');
  console.log('2. Enter custom data');
  
  const inputMethod = await question('\nEnter your choice (1-2): ');
  
  let partner1Text: string;
  let partner2Text: string | null = null;
  
  if (inputMethod === '1') {
    partner1Text = sampleData.relationship.partner1;
    partner2Text = sampleData.relationship.partner2;
    
    console.log(`\nPartner 1 (${partner1Name}) sample data: ${partner1Text}`);
    console.log(`Partner 2 (${partner2Name}) sample data: ${partner2Text}`);
  } else {
    partner1Text = await question(`\nEnter text for ${partner1Name}: `);
    partner2Text = await question(`Enter text for ${partner2Name} (leave empty for none): `);
  }

  // Wrap text in JSON format as expected by the AI functions
  const partner1Json = JSON.stringify({ text: partner1Text, segments: [{ text: partner1Text }] });
  const partner2Json = partner2Text ? JSON.stringify({ text: partner2Text, segments: [{ text: partner2Text }] }) : null;
  
  console.log('\nProcessing...');
  
  try {
    // Choose whether to test analyzeConflict or createAnalysisStream
    console.log('\nSelect function to test:');
    console.log('1. analyzeConflict (synchronous)');
    console.log('2. createAnalysisStream (streaming)');
    
    const functionChoice = await question('\nEnter your choice (1-2): ');
    
    if (functionChoice === '1') {
      const result = await analyzeConflict(
        partner1Json,
        partner2Json ?? '',
        counselingMode,
        isLiveArgument,
        partner1Name,
        partner2Name
      );
      
      const parsedResult = JSON.parse(result);
      console.log('\n=== Result ===\n');
      console.log(parsedResult.verdict);
    } else {
      // Using createAnalysisStream
      const result = await createAnalysisStream({
        partner1Name,
        partner2Name,
        partner1Transcription: partner1Text,
        partner2Transcription: partner2Text,
        mode: counselingMode,
        isLiveArgument,
        sessionId: 12345, // Dummy session ID
        onComplete: async (response) => {
          console.log('\n=== Stream Complete ===');
          const parsedResponse = JSON.parse(response);
          console.log(parsedResponse.verdict);
        }
      });
      
      console.log('\n=== Stream Result ===\n');
      console.log(result.aiResponse);
    }
  } catch (error) {
    console.error('Error analyzing relationship:', error);
  }
  
  await waitForKeypress();
  await mainMenu();
}

// Helper to wait for a keypress
async function waitForKeypress() {
  console.log('\nPress any key to continue...');
  process.stdin.setRawMode(true);
  return new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

// Start the CLI
console.log('Starting AI Prompt Testing CLI...');
mainMenu().catch(console.error); 