#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import { ProfessionalConverter } from './utils/professionalConverter.js';
import { createExpoProject, createProjectFlow } from './createExpoProject.js';
import InteractivePrompt from './utils/interactivePrompt.js';
import { aiManager } from './utils/aiProviders.js';
import { SmartConverter } from './utils/smartConverter.js';

// Get package version from NTRN package directory
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = await fs.readJson(packageJsonPath);

program
  .name('ntrn')
  .description('🚀 Next.js to React Native Converter with Professional AI Assistant')
  .version(packageJson.version);

// Default command - Professional Conversion (new approach)
program
  .action(async () => {
    await runProfessionalConversion();
  });

// Professional AI Conversion (new default)
program
  .option('--professional', '🧠 Professional AI-powered conversion with Mistral AI and intelligent analysis')
  .option('--ai', '🧠 Professional AI-powered conversion (alias for --professional)')
  .action(async (options) => {
    if (options.professional || options.ai) {
      await runProfessionalConversion();
      return;
    }
    
    // Default professional conversion
    await runProfessionalConversion();
  });

// Legacy NTRN Interactive Experience (for backwards compatibility)
program
  .option('--legacy', '🎨 Legacy NTRN experience with old conversion approach')
  .option('--old', '🎨 Legacy NTRN experience (alias for --legacy)')
  .action(async (options) => {
    if (options.legacy || options.old) {
      await runLegacyNTRN();
      return;
    }
    
    // Default professional conversion
    await runProfessionalConversion();
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
    
    if (options.legacy || options.old) {
      await runLegacyNTRN();
      return;
    }
    
    // Default professional conversion
    await runProfessionalConversion();
  });

// Switch AI Provider command
program
  .option('--switch-provider', '🔄 Switch between Mistral AI and Gemini providers')
  .action(async (options) => {
    if (options.switchProvider) {
      await switchAIProvider();
      return;
    }
    
    if (options.prompt || options.gpt) {
      const interactivePrompt = new InteractivePrompt();
      await interactivePrompt.start();
      return;
    }
    
    if (options.legacy || options.old) {
      await runLegacyNTRN();
      return;
    }
    
    // Default professional conversion
    await runProfessionalConversion();
  });

// Professional conversion command
program
  .command('convert')
  .description('Professional AI-powered conversion with intelligent analysis')
  .action(async () => {
    await runProfessionalConversion();
  });

// Legacy command
program
  .command('legacy')
  .description('Legacy NTRN experience with old conversion approach')
  .action(async () => {
    await runLegacyNTRN();
  });

// 🧠 Professional AI-Powered Conversion (New Default Approach)
async function runProfessionalConversion() {
  try {
    // Clear console for better experience
    console.clear();
    
    // Show professional ASCII logo
    console.log(chalk.cyan(figlet.textSync('NTRN PRO', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
    
    console.log(chalk.cyan('🚀 Professional Next.js to React Native Converter'));
    console.log(chalk.yellow('Powered by Mistral AI & Gemini 2.0 Flash'));
    console.log(chalk.gray('Acting as Senior React Native + Next.js Developer'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log('');

    // Initialize Professional Converter with project selection
    const converter = new ProfessionalConverter();
    
    // Run professional conversion with project selection
    const result = await converter.start();

    if (result.success) {
      console.log(chalk.cyan('\n🔧 Project Features:'));
      console.log(chalk.white('• Professional code quality with best practices'));
      console.log(chalk.white('• Mobile-first design patterns'));
      console.log(chalk.white('• Proper React Navigation setup'));
      console.log(chalk.white('• TypeScript support'));
      console.log(chalk.white('• Auto-fixed common issues'));
      console.log(chalk.white('• Production-ready structure'));
      
      console.log(chalk.cyan('\n🤖 Need to make changes? Use the AI Assistant:'));
      console.log(chalk.green('   ntrn --prompt') + chalk.gray('  (in your RN project directory)'));
      
    } else {
      console.log(chalk.red('\n❌ Professional conversion encountered some issues.'));
      console.log(chalk.yellow('Check the generated files and logs for details.'));
      console.log(chalk.gray('Consider trying the legacy approach: ntrn --legacy'));
    }

  } catch (error) {
    console.error(chalk.red(`\n❌ Professional Conversion Error: ${error.message}`));
    console.log(chalk.yellow('\n💡 Suggestions:'));
    console.log(chalk.white('1. Check your API keys are properly configured'));
    console.log(chalk.white('2. Ensure you have a stable internet connection'));
    console.log(chalk.white('3. Try the legacy approach: ntrn --legacy'));
    console.log(chalk.white('4. Use the interactive prompt: ntrn --prompt'));
    process.exit(1);
  }
}

// 🎨 Legacy NTRN Experience (Old Approach for Backwards Compatibility)
async function runLegacyNTRN() {
  try {
    // Clear console for better experience
    console.clear();
    
    // Show legacy ASCII logo
    console.log(chalk.yellow(figlet.textSync('NTRN', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
    
    console.log(chalk.yellow('🎨 Legacy Next.js to React Native Converter'));
    console.log(chalk.gray('Traditional file-by-file conversion approach'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log('');
    
    // Initialize Smart Converter with project selection
    const converter = new SmartConverter();
    
    // Run legacy conversion with project selection
    await converter.start();
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Legacy Error: ${error.message}`));
    console.log(chalk.yellow('\n💡 Try the new professional approach: ntrn'));
    process.exit(1);
  }
}

// 🔄 Switch AI Provider
async function switchAIProvider() {
  try {
    // Clear console for better experience
    console.clear();
    
    console.log(chalk.cyan('🔄 NTRN AI Provider Switch'));
    console.log(chalk.cyan('==========================='));
    console.log('');

    // Initialize AI Manager
    await aiManager.initialize();
    
    console.log(chalk.cyan('Current AI Provider: ') + chalk.white(aiManager.currentProvider?.name || 'None'));
    console.log('');
    
    const prompts = await import('prompts');
    const response = await prompts.default({
      type: 'select',
      name: 'provider',
      message: 'Choose AI provider:',
      choices: [
        { title: '🧠 Mistral AI (Recommended)', value: 'mistral' },
        { title: '🤖 Gemini 2.0 Flash', value: 'gemini' },
        { title: '❌ Cancel', value: 'cancel' }
      ]
    });

    if (response.provider && response.provider !== 'cancel') {
      await aiManager.switchProvider(response.provider);
      console.log(chalk.green(`\n✅ Successfully switched to ${response.provider === 'mistral' ? 'Mistral AI' : 'Gemini 2.0 Flash'}`));
      console.log(chalk.gray('Your choice has been saved for future conversions.'));
    } else {
      console.log(chalk.yellow('Provider switch cancelled.'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Error switching provider: ${error.message}`));
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

// Show help information
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ ntrn                    # Professional AI conversion (default)');
  console.log('  $ ntrn --professional     # Professional AI conversion');
  console.log('  $ ntrn --legacy           # Legacy conversion approach');
  console.log('  $ ntrn --prompt           # Interactive AI assistant');
  console.log('');
  console.log(chalk.cyan('Features:'));
  console.log('  🧠 Professional AI conversion with Mistral AI & Gemini 2.0 Flash');
  console.log('  🔍 Intelligent project analysis and planning');
  console.log('  🔧 Auto-fixing of common React Native issues');
  console.log('  📱 Mobile-first design patterns');
  console.log('  🏗️ Production-ready project structure');
  console.log('  🤖 Interactive AI assistant for ongoing development');
  console.log('');
});

// Parse command line arguments
program.parse();

export async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isLegacyMode = args.includes('--legacy') || args.includes('-l');
    const showHelp = args.includes('--help') || args.includes('-h');
    const showVersion = args.includes('--version') || args.includes('-v');
    const switchProvider = args.includes('--switch-provider');

    // Show version
    if (showVersion) {
      const packageJson = await fs.readJson(path.resolve(process.cwd(), 'package.json'));
      console.log(chalk.cyan(`NTRN v${packageJson.version}`));
      return;
    }

    // Show help
    if (showHelp) {
      showHelpText();
      return;
    }

    // Initialize AI Manager
    await aiManager.initialize();

    // Handle provider switching
    if (switchProvider) {
      const switched = await aiManager.switchProvider();
      if (switched) {
        console.log(chalk.green('🚀 Provider switched successfully! You can now run ntrn again.'));
      }
      return;
    }

    // Ensure API keys are configured
    const keysConfigured = await aiManager.ensureApiKeys();
    if (!keysConfigured) {
      console.log(chalk.red('❌ AI provider setup is required. Please configure your API keys.'));
      return;
    }

    // Professional conversion (default)
    if (!isLegacyMode) {
      console.log(chalk.cyan('\n🚀 NTRN v4.0 - Professional AI Conversion'));
      console.log(chalk.gray('Using advanced AI analysis and professional code generation\n'));
      
      const converter = new ProfessionalConverter();
      await converter.start();
    } else {
      // Legacy mode
      console.log(chalk.yellow('\n⚙️ NTRN Legacy Mode'));
      console.log(chalk.gray('Using traditional file-by-file conversion\n'));
      
      const converter = new SmartConverter();
      await converter.start();
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    
    if (error.message.includes('API') || error.message.includes('provider')) {
      console.log(chalk.yellow('\n💡 AI Provider Issues:'));
      console.log(chalk.gray('   • Check your API keys are correctly configured'));
      console.log(chalk.gray('   • Try switching providers: ntrn --switch-provider'));
      console.log(chalk.gray('   • Verify your internet connection'));
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      console.log(chalk.yellow('\n⏳ Rate Limit Solutions:'));
      console.log(chalk.gray('   • Mistral AI free tier: 1 request/second'));
      console.log(chalk.gray('   • Wait a moment and try again'));
      console.log(chalk.cyan('   • Switch to Gemini: ntrn --switch-provider'));
      console.log(chalk.gray('   • Or use legacy mode: ntrn --legacy'));
    }
    
    process.exit(1);
  }
}

function showHelpText() {
  console.log(chalk.cyan('\n🚀 NTRN v4.0 - Next.js to React Native Converter\n'));
  
  console.log(chalk.white('USAGE:'));
  console.log('  ntrn                    Professional AI conversion (recommended)');
  console.log('  ntrn --legacy          Traditional file-by-file conversion');
  console.log('  ntrn --switch-provider # Change AI provider');
  console.log('  ntrn --help            Show this help');
  console.log('  ntrn --version         Show version\n');

  console.log(chalk.white('AI PROVIDERS:'));
  console.log(chalk.green('  🥇 Mistral AI          Professional React Native development (Recommended)'));
  console.log('     • Superior code quality and architecture');
  console.log('     • Free tier: 1 request/second, 60/min');
  console.log('     • Advanced debugging and optimization');
  console.log('');
  console.log(chalk.blue('  🔹 Gemini 2.0 Flash    Fast and reliable conversion'));
  console.log('     • Quick Next.js analysis and conversion');
  console.log('     • Free tier: 60 requests/min');
  console.log('     • Good for simple projects\n');

  console.log(chalk.white('API KEYS SETUP:'));
  console.log('  NTRN will prompt you to choose and configure your preferred AI provider');
  console.log('  API keys are saved securely in: .env file in your project root');
  console.log('  You can configure both providers but only use one at a time\n');

  console.log(chalk.white('RATE LIMITS & SOLUTIONS:'));
  console.log('  If you hit rate limits:');
  console.log('  • Wait a moment (Mistral: 1 req/sec)');
  console.log('  • Switch providers: ntrn --switch-provider');
  console.log('  • Use legacy mode: ntrn --legacy\n');

  console.log(chalk.white('FEATURES:'));
  console.log('  ✨ Intelligent project analysis');
  console.log('  🧠 Professional code generation');
  console.log('  🔧 Auto-fixing and error resolution');
  console.log('  📱 Mobile-first React Native architecture');
  console.log('  🎯 Quality validation and optimization\n');

  console.log(chalk.white('EXAMPLES:'));
  console.log('  cd my-nextjs-app');
  console.log('  ntrn                    # Professional conversion with AI');
  console.log('  ntrn --legacy          # Traditional conversion');
  console.log('  ntrn --switch-provider # Change AI provider\n');

  console.log(chalk.gray('For more information: https://github.com/your-repo/ntrn'));
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected Error:'), error.message);
  console.log(chalk.yellow('\n💡 Troubleshooting:'));
  console.log(chalk.gray('   • Try running: ntrn --switch-provider'));
  console.log(chalk.gray('   • Check your API keys are valid'));
  console.log(chalk.gray('   • Ensure stable internet connection'));
  
  if (error.message.includes('429')) {
    console.log(chalk.cyan('   • Rate limit: try ntrn --legacy'));
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Promise Rejection:'), reason);
  console.log(chalk.yellow('\n💡 This might be an API issue. Try switching providers.'));
  process.exit(1);
});
