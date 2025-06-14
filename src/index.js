#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import { convertPagesToScreens } from './convertPagesToScreens.js';
import { createExpoProject, createProjectFlow } from './createExpoProject.js';
import InteractivePrompt from './utils/interactivePrompt.js';

// Get package version from NTRN package directory
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = await fs.readJson(packageJsonPath);

program
  .name('ntrn')
  .description('🚀 Next.js to React Native Converter with AI Assistant')
  .version(packageJson.version);

// Default command - Convert Next.js to React Native (simple mode)
program
  .action(async () => {
    await runSimpleConversion();
  });

// Original NTRN Interactive Experience
program
  .option('--ntrn', '🎨 Original NTRN experience with interactive prompts and ASCII logo')
  .option('--convert', '🎨 Original NTRN experience with interactive prompts and ASCII logo (alias for --ntrn)')
  .action(async (options) => {
    if (options.ntrn || options.convert) {
      await runOriginalNTRN();
      return;
    }
    
    // Default simple conversion
    await runSimpleConversion();
  });

// Interactive AI Assistant command
program
  .option('--prompt', '🤖 Start interactive AI assistant for React Native projects')
  .option('--gpt', '🤖 Start interactive AI assistant for React Native projects (alias for --prompt)')
  .action(async (options) => {
    if (options.prompt || options.gpt) {
      const interactivePrompt = new InteractivePrompt();
      await interactivePrompt.start();
      return;
    }
    
    if (options.ntrn || options.convert) {
      await runOriginalNTRN();
      return;
    }
    
    // Default simple conversion
    await runSimpleConversion();
  });

// Conversion command
program
  .command('convert')
  .description('Convert Next.js project to React Native')
  .action(async () => {
    await runSimpleConversion();
  });

// Original NTRN command
program
  .command('original')
  .description('Original NTRN experience with interactive setup')
  .action(async () => {
    await runOriginalNTRN();
  });

// 🎨 Original NTRN Experience with ASCII Logo and Interactive Prompts
async function runOriginalNTRN() {
  try {
    // Clear console for better experience
    console.clear();
    
    // Show cool ASCII logo
    console.log(chalk.cyan(figlet.textSync('NTRN', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
    
    console.log(chalk.cyan('🚀 Next.js to React Native Converter'));
    console.log(chalk.gray('Enhanced AI-powered conversion with comprehensive project analysis'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log('');
    
    // Run the original interactive flow
    await createProjectFlow();
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// 🔄 Simple Conversion (current directory detection)
async function runSimpleConversion() {
  try {
    console.log(chalk.cyan('🚀 NTRN - Next.js to React Native Converter'));
    console.log(chalk.cyan('============================================\n'));

    const currentDir = process.cwd();
    
    // Check if this is a Next.js project
    const isNextjsProject = await verifyNextjsProject(currentDir);
    
    if (!isNextjsProject) {
      console.log(chalk.red('❌ This doesn\'t appear to be a Next.js project.'));
      console.log(chalk.yellow('💡 Please run this command in your Next.js project root directory.'));
      console.log(chalk.gray('   Looking for: package.json with "next" dependency\n'));
      
      console.log(chalk.cyan('🎨 Want the original NTRN experience?'));
      console.log(chalk.white('   ntrn --ntrn       ') + chalk.gray('Interactive setup with project selection'));
      console.log(chalk.white('   ntrn --convert    ') + chalk.gray('Same as above'));
      console.log('');
      console.log(chalk.cyan('🤖 Or use the AI Assistant:'));
      console.log(chalk.white('   ntrn --prompt     ') + chalk.gray('ChatGPT-like CLI for React Native projects'));
      return;
    }

    const outputPath = path.join(currentDir, 'converted-react-native');
    
    console.log(chalk.blue('📍 Next.js Project Found!'));
    console.log(chalk.blue(`📂 Input:  ${currentDir}`));
    console.log(chalk.blue(`📂 Output: ${outputPath}\n`));

    // Create Expo project structure
    console.log(chalk.cyan('🏗️ Creating React Native project structure...'));
    await createExpoProject(outputPath);

    // Convert pages and components
    console.log(chalk.cyan('🔄 Converting Next.js components to React Native...\n'));
    const result = await convertPagesToScreens(currentDir, outputPath);

    if (result.success) {
      console.log(chalk.green('\n🎉 Conversion completed successfully!'));
      console.log(chalk.green('📱 Your React Native app is ready!'));
      
      console.log(chalk.cyan('\n📋 Next Steps:'));
      console.log(chalk.white('1. cd converted-react-native'));
      console.log(chalk.white('2. npm install'));
      console.log(chalk.white('3. npx expo start'));
      
      console.log(chalk.cyan('\n🤖 Need to make changes? Use the AI Assistant:'));
      console.log(chalk.green('   ntrn --prompt') + chalk.gray('  (in your RN project directory)'));
      
    } else {
      console.log(chalk.red('\n❌ Conversion encountered some issues.'));
      console.log(chalk.yellow('Check the generated files and logs for details.'));
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function verifyNextjsProject(projectPath) {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!await fs.exists(packageJsonPath)) {
      return false;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    const allDeps = { 
      ...packageJson.dependencies, 
      ...packageJson.devDependencies 
    };

    // Check for Next.js indicators
    return !!(
      allDeps.next || 
      allDeps['@next/bundle-analyzer'] ||
      await fs.exists(path.join(projectPath, 'next.config.js')) ||
      await fs.exists(path.join(projectPath, 'next.config.mjs'))
    );
  } catch (error) {
    return false;
  }
}

// Parse command line arguments
program.parse();
