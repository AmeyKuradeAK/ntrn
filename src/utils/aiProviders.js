import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import prompts from 'prompts';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config file paths
const envPath = path.resolve(__dirname, '../../.env');
const configPath = path.resolve(__dirname, '../../ai-config.json');

// AI Provider configurations
export const AI_PROVIDERS = {
  MISTRAL: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    keyName: 'MISTRAL_API_KEY',
    recommended: true,
    rateLimit: { rpm: 60, rps: 1 }, // Free tier: 1 request/second, 60/minute
    features: ['code-generation', 'debugging', 'analysis', 'professional-conversion'],
    pricing: { input: 0.004, output: 0.012 }, // per 1K tokens
    description: 'Professional React Native development with superior code quality'
  },
  GEMINI: {
    name: 'Gemini 2.0 Flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
    keyName: 'GEMINI_API_KEY',
    recommended: false,
    rateLimit: { rpm: 60, rps: 1 }, // Similar conservative rate
    features: ['code-generation', 'analysis', 'explanation'],
    pricing: { input: 0.000125, output: 0.000375 }, // per 1K tokens
    description: 'Fast and reliable AI with good Next.js understanding'
  }
};

export class AIProviderManager {
  constructor() {
    this.config = null;
    this.selectedProvider = null;
    this.initialized = false;
    this.lastRequestTime = 0;
  }

  async initialize() {
    if (this.initialized) return;

    // Load environment variables
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }

    // Load or create AI configuration
    await this.loadOrCreateConfig();
    
    // Initialize selected provider if configured
    if (this.config.selectedProvider) {
      const providerConfig = AI_PROVIDERS[this.config.selectedProvider];
      const apiKey = process.env[providerConfig.keyName];
      if (apiKey) {
        this.selectedProvider = new AIProvider(this.config.selectedProvider, providerConfig, apiKey);
        console.log(chalk.blue(`🔧 Loaded ${providerConfig.name} from configuration`));
      }
    }

    this.initialized = true;
  }

  async loadOrCreateConfig() {
    if (fs.existsSync(configPath)) {
      try {
        this.config = await fs.readJson(configPath);
        return;
      } catch (error) {
        console.warn(chalk.yellow('⚠️ Failed to load AI config, creating new one...'));
      }
    }

    // Create default config
    this.config = {
      selectedProvider: null, // User will choose
      features: {
        smartAnalysis: true,
        codeFixing: true,
        contextualConversion: true,
        qualityValidation: true
      },
      created: new Date().toISOString()
    };

    await this.saveConfig();
  }

  async saveConfig() {
    await fs.writeJson(configPath, this.config, { spaces: 2 });
  }

  async ensureApiKeys() {
    console.log(chalk.cyan('\n🔑 AI Provider Setup'));
    console.log(chalk.gray('NTRN needs an AI provider to convert your Next.js project professionally.\n'));

    // Check if user already has a configured provider with valid API key
    if (this.config.selectedProvider) {
      const providerConfig = AI_PROVIDERS[this.config.selectedProvider];
      const apiKey = process.env[providerConfig.keyName];
      
      if (apiKey && apiKey.length > 10) {
        console.log(chalk.green(`✅ Using ${providerConfig.name}`));
        console.log(chalk.gray(`   API Key: Configured in ${envPath}\n`));
        
        // Initialize the provider
        this.selectedProvider = new AIProvider(this.config.selectedProvider, providerConfig, apiKey);
        return true;
      }
    }

    // Show provider options
    console.log(chalk.cyan('📋 Available AI Providers:'));
    console.log('');

    for (const [key, provider] of Object.entries(AI_PROVIDERS)) {
      const recommended = provider.recommended ? chalk.green(' (RECOMMENDED)') : '';
      const rateInfo = provider.rateLimit.rps ? 
        `${provider.rateLimit.rpm}/min, ${provider.rateLimit.rps}/sec` : 
        `${provider.rateLimit.rpm}/min`;
      
      console.log(chalk.blue(`${provider.recommended ? '🥇' : '🔹'} ${provider.name}${recommended}`));
      console.log(chalk.gray(`   ${provider.description}`));
      console.log(chalk.gray(`   Rate Limit: ${rateInfo}`));
      console.log(chalk.gray(`   Features: ${provider.features.join(', ')}`));
      console.log('');
    }

    // Let user choose provider
    const providerChoice = await prompts({
      type: 'select',
      name: 'provider',
      message: 'Choose your AI provider:',
      choices: Object.entries(AI_PROVIDERS).map(([key, provider]) => ({
        title: `${provider.name}${provider.recommended ? ' (Recommended)' : ''}`,
        description: provider.description,
        value: key
      })),
      initial: 0, // Default to Mistral (first option)
      hint: 'Use arrow keys to select, Enter to confirm'
    });

    if (!providerChoice.provider) {
      console.log(chalk.yellow('\n⚠️ No provider selected. Using Mistral AI as default...'));
      const selectedProviderKey = 'MISTRAL';
      const selectedProvider = AI_PROVIDERS[selectedProviderKey];
      
      console.log(chalk.cyan(`\n🎯 Setting up ${selectedProvider.name}...`));
      
      // Check if API key already exists in environment
      const existingKey = process.env[selectedProvider.keyName];
      if (existingKey && existingKey.length > 10) {
        console.log(chalk.green(`✅ Found existing ${selectedProvider.name} API key`));
        
        // Update config with selected provider
        this.config.selectedProvider = selectedProviderKey;
        await this.saveConfig();
        
        // Initialize provider
        this.selectedProvider = new AIProvider(selectedProviderKey, selectedProvider, existingKey);
        
        console.log(chalk.cyan('\n📍 API Key Storage Location:'));
        console.log(chalk.white(`   File: ${envPath}`));
        console.log(chalk.gray('   You can edit this file manually to update your API keys\n'));
        
        return true;
      }
      
      // Get API key for default provider
      const apiKeyResponse = await prompts({
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${selectedProvider.name} API key:`,
        validate: value => {
          if (!value || value.trim().length < 10) {
            return 'API key is required and must be valid';
          }
          return true;
        }
      });

      if (!apiKeyResponse.apiKey) {
        console.log(chalk.red('❌ API key is required. Exiting...'));
        process.exit(1);
      }

      // Save the API key
      await this.saveApiKey(selectedProvider.keyName, apiKeyResponse.apiKey.trim());

      // Update config with selected provider
      this.config.selectedProvider = selectedProviderKey;
      await this.saveConfig();

      // Initialize provider
      this.selectedProvider = new AIProvider(selectedProviderKey, selectedProvider, apiKeyResponse.apiKey.trim());

      console.log(chalk.green(`✅ ${selectedProvider.name} configured successfully!`));
      console.log(chalk.gray(`   API Key saved to: ${envPath}\n`));

      console.log(chalk.cyan('\n📍 API Key Storage Location:'));
      console.log(chalk.white(`   File: ${envPath}`));
      console.log(chalk.gray('   You can edit this file manually to update your API keys\n'));

      return true;
    }

    const selectedProviderKey = providerChoice.provider;
    const selectedProvider = AI_PROVIDERS[selectedProviderKey];

    console.log(chalk.cyan(`\n🎯 Setting up ${selectedProvider.name}...`));

    // Check if API key already exists in environment
    const existingKey = process.env[selectedProvider.keyName];
    if (existingKey && existingKey.length > 10) {
      console.log(chalk.green(`✅ Found existing ${selectedProvider.name} API key`));
      
      // Update config with selected provider
      this.config.selectedProvider = selectedProviderKey;
      await this.saveConfig();
      
      // Initialize provider
      this.selectedProvider = new AIProvider(selectedProviderKey, selectedProvider, existingKey);
      
      console.log(chalk.cyan('\n📍 API Key Storage Location:'));
      console.log(chalk.white(`   File: ${envPath}`));
      console.log(chalk.gray('   You can edit this file manually to update your API keys\n'));
      
      return true;
    }

    // Get API key for selected provider
    const apiKeyResponse = await prompts({
      type: 'password',
      name: 'apiKey',
      message: `Enter your ${selectedProvider.name} API key:`,
      validate: value => {
        if (!value || value.trim().length < 10) {
          return 'API key is required and must be valid';
        }
        return true;
      }
    });

    if (!apiKeyResponse.apiKey) {
      console.log(chalk.red('❌ API key is required. Exiting...'));
      process.exit(1);
    }

    // Save the API key
    await this.saveApiKey(selectedProvider.keyName, apiKeyResponse.apiKey.trim());

    // Update config with selected provider
    this.config.selectedProvider = selectedProviderKey;
    await this.saveConfig();

    // Ask if user wants to configure the other provider too (optional)
    const otherProviderKey = selectedProviderKey === 'MISTRAL' ? 'GEMINI' : 'MISTRAL';
    const otherProvider = AI_PROVIDERS[otherProviderKey];

    console.log(chalk.green(`✅ ${selectedProvider.name} configured successfully!`));
    console.log(chalk.gray(`   API Key saved to: ${envPath}\n`));

    const configureOther = await prompts({
      type: 'confirm',
      name: 'setup',
      message: `Would you like to also configure ${otherProvider.name}? (Optional - for future use)`,
      initial: false
    });

    if (configureOther.setup) {
      const otherApiKeyResponse = await prompts({
        type: 'password',
        name: 'apiKey',
        message: `Enter your ${otherProvider.name} API key:`,
        validate: value => {
          if (value && value.trim().length < 10) {
            return 'API key seems too short';
          }
          return true;
        }
      });

      if (otherApiKeyResponse.apiKey) {
        await this.saveApiKey(otherProvider.keyName, otherApiKeyResponse.apiKey.trim());
        console.log(chalk.green(`✅ ${otherProvider.name} also configured!`));
      }
    }

    // Reload environment and initialize selected provider
    dotenv.config({ path: envPath });
    this.selectedProvider = new AIProvider(
      selectedProviderKey,
      selectedProvider,
      process.env[selectedProvider.keyName]
    );

    console.log(chalk.cyan('\n📍 API Key Storage Location:'));
    console.log(chalk.white(`   File: ${envPath}`));
    console.log(chalk.gray('   You can edit this file manually to update your API keys\n'));

    return true;
  }

  async saveApiKey(keyName, apiKey) {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = await fs.readFile(envPath, 'utf-8');
    }

    // Update or add the API key
    const keyPattern = new RegExp(`^${keyName}=.*$`, 'm');
    const newKeyLine = `${keyName}=${apiKey}`;

    if (keyPattern.test(envContent)) {
      envContent = envContent.replace(keyPattern, newKeyLine);
    } else {
      envContent += `\n${newKeyLine}`;
    }

    await fs.writeFile(envPath, envContent.trim() + '\n');
  }

  async callAI(prompt, options = {}) {
    if (!this.selectedProvider) {
      throw new Error('No AI provider configured. Please run setup first.');
    }

    const {
      task = 'code-generation',
      temperature = 0.1,
      maxTokens = 8192
    } = options;

    try {
      console.log(chalk.blue(`🧠 Using ${this.selectedProvider.config.name}...`));
      return await this.selectedProvider.generateResponse(prompt, {
        temperature,
        maxTokens,
        task
      });
    } catch (error) {
      console.error(chalk.red(`❌ ${this.selectedProvider.config.name} Error: ${error.message}`));
      
      // Check if it's a rate limit error
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(chalk.yellow(`⏳ Rate limit reached. ${this.selectedProvider.config.name} free tier:`));
        console.log(chalk.gray(`   • 1 request per second`));
        console.log(chalk.gray(`   • Wait a moment and try again`));
      }
      
      // Suggest switching providers if there's an error
      const otherProviderKey = this.config.selectedProvider === 'MISTRAL' ? 'GEMINI' : 'MISTRAL';
      const otherProvider = AI_PROVIDERS[otherProviderKey];
      const hasOtherKey = process.env[otherProvider.keyName];
      
      if (hasOtherKey) {
        console.log(chalk.yellow(`💡 You have ${otherProvider.name} configured.`));
        console.log(chalk.cyan(`   Run: ntrn --switch-provider`));
      }
      
      throw error;
    }
  }

  async switchProvider() {
    console.log(chalk.cyan('\n🔄 Switching AI Provider'));
    
    const currentProvider = this.config.selectedProvider;
    const otherProviderKey = currentProvider === 'MISTRAL' ? 'GEMINI' : 'MISTRAL';
    const otherProvider = AI_PROVIDERS[otherProviderKey];
    
    // Check if other provider is configured
    const hasOtherKey = process.env[otherProvider.keyName];
    
    if (!hasOtherKey) {
      console.log(chalk.yellow(`⚠️ ${otherProvider.name} is not configured.`));
      const setup = await prompts({
        type: 'confirm',
        name: 'configure',
        message: `Would you like to configure ${otherProvider.name} now?`,
        initial: true
      });
      
      if (setup.configure) {
        const apiKeyResponse = await prompts({
          type: 'password',
          name: 'apiKey',
          message: `Enter your ${otherProvider.name} API key:`,
          validate: value => value && value.trim().length > 10 || 'Valid API key required'
        });
        
        if (apiKeyResponse.apiKey) {
          await this.saveApiKey(otherProvider.keyName, apiKeyResponse.apiKey.trim());
          dotenv.config({ path: envPath });
        }
      } else {
        return false;
      }
    }
    
    // Switch to other provider
    this.config.selectedProvider = otherProviderKey;
    await this.saveConfig();
    
    this.selectedProvider = new AIProvider(
      otherProviderKey,
      otherProvider,
      process.env[otherProvider.keyName]
    );
    
    console.log(chalk.green(`✅ Switched to ${otherProvider.name}`));
    return true;
  }
}

export class AIProvider {
  constructor(key, config, apiKey) {
    this.key = key;
    this.config = config;
    this.apiKey = apiKey;
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.lastRequest = 0;
  }

  async generateResponse(prompt, options = {}) {
    const { temperature = 0.1, maxTokens = 8192, task = 'code-generation' } = options;

    // Rate limiting check
    await this.checkRateLimit();

    try {
      if (this.config.name.includes('Mistral')) {
        return await this.callMistralAPI(prompt, { temperature, maxTokens });
      } else if (this.config.name.includes('Gemini')) {
        return await this.callGeminiAPI(prompt, { temperature, maxTokens });
      }
    } catch (error) {
      console.error(chalk.red(`❌ ${this.config.name} API Error: ${error.message}`));
      throw error;
    }
  }

  async callMistralAPI(prompt, options) {
    const response = await axios.post(
      this.config.baseUrl,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a senior React Native developer who specializes in converting Next.js projects to React Native. You write clean, production-ready code with proper error handling and best practices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    this.requestCount++;

    return {
      content: response.data.choices[0].message.content,
      tokensUsed: response.data.usage?.total_tokens || 0,
      provider: this.config.name,
      model: this.config.model
    };
  }

  async callGeminiAPI(prompt, options) {
    const response = await axios.post(
      `${this.config.baseUrl}?key=${this.apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          topP: 0.8,
          topK: 40
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    this.requestCount++;

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      content,
      tokensUsed: response.data.usageMetadata?.totalTokenCount || 0,
      provider: this.config.name,
      model: this.config.model
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    
    // Check requests per second limit
    if (this.config.rateLimit.rps) {
      const timeSinceLastRequest = now - this.lastRequest;
      const minInterval = 1000 / this.config.rateLimit.rps; // ms between requests
      
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        console.log(chalk.yellow(`⏳ Rate limiting: waiting ${Math.round(waitTime)}ms...`));
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequest = Date.now();
    }
    
    // Check requests per minute limit
    const timeWindow = 60000; // 1 minute
    if (now - this.lastReset > timeWindow) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (this.requestCount >= this.config.rateLimit.rpm) {
      const waitTime = timeWindow - (now - this.lastReset);
      console.log(chalk.yellow(`⏳ Rate limit reached for ${this.config.name}. Waiting ${Math.round(waitTime/1000)}s...`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastReset = Date.now();
    }
  }
}

// Global instance
export const aiManager = new AIProviderManager(); 