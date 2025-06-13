import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';

export class ConversionConfig {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, 'ntrn.config.js');
    this.defaultConfig = {
      // AI Model settings
      ai: {
        model: 'gemini-2.0-flash',
        temperature: 0.3,
        maxTokens: 8192,
        batchSize: 5,
        rateLimitDelay: 1000,
        retryAttempts: 3,
        timeout: 60000
      },
      
      // Conversion preferences
      conversion: {
        preserveFileStructure: true,
        generateNavigation: true,
        optimizeImports: true,
        generateDocs: true,
        includeErrorBoundaries: true,
        addAccessibility: true
      },
      
      // Navigation setup
      navigation: {
        type: 'stack', // stack, tab, drawer
        enableDeepLinking: false,
        screens: []
      },
      
      // Styling preferences
      styling: {
        framework: 'nativewind', // nativewind, stylesheet, styled-components
        generateTheme: true,
        responsiveDesign: true,
        darkModeSupport: false,
        customTheme: null
      },
      
      // Development features
      development: {
        enableFlipperIntegration: false,
        addDevMenu: true,
        enableHotReload: true,
        includeStorybook: false
      },
      
      // File handling
      files: {
        excludePatterns: ['*.test.*', '*.spec.*', '__tests__/**', 'node_modules/**'],
        includePatterns: ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'],
        backupOriginals: false
      },
      
      processing: {
        includeAssets: true,
        optimizeImages: true,
        generateTypes: true,
        batchSize: 5
      },
      
      output: {
        includeReadme: true,
        includeDocumentation: false,
        includeExampleScreens: false
      },
      
      qualityImprovement: {
        enabled: true,
        maxIterations: 5,
        targetScore: 100,
        autoFixCriticalIssues: true
      }
    };
  }

  async loadConfig() {
    if (await fs.exists(this.configPath)) {
      try {
        const configModule = await import(this.configPath);
        return { ...this.defaultConfig, ...configModule.default };
      } catch (error) {
        console.warn(chalk.yellow('⚠️ Failed to load config file, using defaults'));
        return this.defaultConfig;
      }
    }
    
    return this.defaultConfig;
  }

  async createInteractiveConfig() {
    console.log(chalk.cyan('\n🛠️ Let\'s customize your conversion settings...'));
    
    const responses = await prompts([
      {
        type: 'select',
        name: 'navigationType',
        message: 'What navigation structure do you prefer?',
        choices: [
          { title: 'Auto-detect (recommended)', value: 'auto' },
          { title: 'Stack Navigation only', value: 'stack' },
          { title: 'Tab Navigation', value: 'tabs' },
          { title: 'Drawer Navigation', value: 'drawer' }
        ],
        initial: 0
      },
      {
        type: 'list',
        name: 'stylingOption',
        message: 'Choose styling approach:',
        choices: [
          { name: 'NativeWind (Tailwind for React Native)', value: 'nativewind' },
          { name: 'React Native StyleSheet', value: 'stylesheet' },
          { name: 'Styled Components', value: 'styled-components' }
        ],
        default: 'nativewind'
      },
      {
        type: 'toggle',
        name: 'generateDocs',
        message: 'Generate conversion documentation?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'toggle',
        name: 'optimizeImports',
        message: 'Auto-fix import paths?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'toggle',
        name: 'addAccessibility',
        message: 'Add accessibility improvements?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'toggle',
        name: 'darkModeSupport',
        message: 'Add dark mode support?',
        initial: false,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'number',
        name: 'batchSize',
        message: 'AI processing batch size (1-10):',
        initial: 5,
        min: 1,
        max: 10
      },
      {
        type: 'confirm',
        name: 'enableAutoImprovement',
        message: 'Enable automatic quality improvement? (Iterates up to 5 times to reach 100% quality)',
        default: true
      },
      {
        type: 'input',
        name: 'maxImprovementIterations',
        message: 'Maximum improvement iterations (1-10):',
        default: '5',
        validate: (input) => {
          const num = parseInt(input);
          if (isNaN(num) || num < 1 || num > 10) {
            return 'Please enter a number between 1 and 10';
          }
          return true;
        },
        when: (answers) => answers.enableAutoImprovement
      },
      {
        type: 'input',
        name: 'targetQualityScore',
        message: 'Target quality score (80-100):',
        default: '100',
        validate: (input) => {
          const num = parseInt(input);
          if (isNaN(num) || num < 80 || num > 100) {
            return 'Please enter a number between 80 and 100';
          }
          return true;
        },
        when: (answers) => answers.enableAutoImprovement
      },
      {
        type: 'toggle',
        name: 'enableDeepLinking',
        message: 'Enable deep linking?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      },
      {
        type: 'toggle',
        name: 'includeExampleScreens',
        message: 'Include example screens?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      }
    ]);

    const customConfig = {
      ...this.defaultConfig,
      navigation: {
        ...this.defaultConfig.navigation,
        type: responses.navigationType,
        enableDeepLinking: responses.enableDeepLinking
      },
      styling: {
        ...this.defaultConfig.styling,
        framework: responses.stylingOption,
        darkModeSupport: responses.darkModeSupport
      },
      conversion: {
        ...this.defaultConfig.conversion,
        generateDocs: responses.generateDocs,
        optimizeImports: responses.optimizeImports,
        addAccessibility: responses.addAccessibility
      },
      ai: {
        ...this.defaultConfig.ai,
        batchSize: responses.batchSize
      },
      processing: {
        ...this.defaultConfig.processing,
        batchSize: parseInt(responses.batchSize) || 5
      },
      output: {
        ...this.defaultConfig.output,
        includeExampleScreens: responses.includeExampleScreens
      },
      qualityImprovement: {
        enabled: responses.enableAutoImprovement || false,
        maxIterations: parseInt(responses.maxImprovementIterations) || 5,
        targetScore: parseInt(responses.targetQualityScore) || 100
      }
    };

    await this.saveConfig(customConfig);
    return customConfig;
  }

  async saveConfig(config) {
    const configContent = `
// NTRN Conversion Configuration
// Generated on ${new Date().toISOString()}

export default ${JSON.stringify(config, null, 2)};
    `.trim();

    await fs.writeFile(this.configPath, configContent);
    console.log(chalk.green('✅ Configuration saved to ntrn.config.js'));
  }

  async promptForMissingApiKey() {
    const response = await prompts({
      type: 'text',
      name: 'apiKey',
      message: '🔐 Enter your Gemini API Key:',
      validate: value => {
        if (!value || value.trim().length < 10) {
          return 'API key is required and must be at least 10 characters';
        }
        return true;
      }
    });

    if (!response.apiKey) {
      console.error(chalk.red('❌ API key is required for conversion. Exiting.'));
      process.exit(1);
    }

    return response.apiKey.trim();
  }

  async getEffectiveConfig() {
    const config = await this.loadConfig();
    
    // Check if this is a first-time run
    const isFirstRun = !await fs.exists(this.configPath);
    
    if (isFirstRun) {
      console.log(chalk.cyan('👋 Welcome to NTRN Enhanced!'));
      console.log(chalk.white('This appears to be your first time using the enhanced converter.'));
      
      const response = await prompts({
        type: 'toggle',
        name: 'customize',
        message: 'Would you like to customize conversion settings?',
        initial: false,
        active: 'yes',
        inactive: 'no (use defaults)'
      });

      if (response.customize) {
        return await this.createInteractiveConfig();
      } else {
        await this.saveConfig(config);
      }
    }

    return config;
  }

  static validateConfig(config) {
    const errors = [];

    if (config.ai.batchSize < 1 || config.ai.batchSize > 10) {
      errors.push('ai.batchSize must be between 1 and 10');
    }

    if (config.ai.temperature < 0 || config.ai.temperature > 1) {
      errors.push('ai.temperature must be between 0 and 1');
    }

    if (!['stack', 'tabs', 'drawer', 'auto'].includes(config.navigation.type)) {
      errors.push('navigation.type must be one of: stack, tabs, drawer, auto');
    }

    if (!['nativewind', 'stylesheet', 'styled-components'].includes(config.styling.framework)) {
      errors.push('styling.framework must be one of: nativewind, stylesheet, styled-components');
    }

    return errors;
  }

  async ensureValidConfig() {
    const config = await this.getEffectiveConfig();
    const errors = ConversionConfig.validateConfig(config);

    if (errors.length > 0) {
      console.error(chalk.red('❌ Configuration validation failed:'));
      errors.forEach(error => console.error(chalk.red(`  • ${error}`)));
      process.exit(1);
    }

    return config;
  }
} 