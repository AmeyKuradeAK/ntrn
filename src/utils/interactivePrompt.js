// 🤖 Interactive AI Assistant for React Native Projects
// ChatGPT-like CLI interface for making project changes

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { aiManager } from './aiProviders.js';
import { ProjectAnalyzer } from './projectAnalyzer.js';

export class InteractivePrompt {
  constructor() {
    this.projectPath = process.cwd();
    this.conversationHistory = [];
    this.projectContext = null;
    this.isActive = false;
  }

  async start() {
    console.log(chalk.cyan('🤖 NTRN AI Assistant Pro'));
    console.log(chalk.cyan('==========================='));
    console.log(chalk.green('Professional AI assistant for your React Native project'));
    console.log(chalk.gray('Powered by Mistral AI & Gemini 2.0 Flash\n'));

    // Initialize AI Manager
    await aiManager.initialize();

    // Verify we're in a React Native project
    const isRNProject = await this.verifyReactNativeProject();
    if (!isRNProject) {
      console.log(chalk.red('❌ This doesn\'t appear to be a React Native project.'));
      console.log(chalk.yellow('💡 Use `ntrn` (without flags) to convert a Next.js project first.'));
      return;
    }

    // Analyze the current project
    console.log(chalk.gray('📊 Analyzing your React Native project...'));
    await this.analyzeProject();

    console.log(chalk.green('✅ Project analyzed! Ready for your requests.\n'));
    
    // Show available commands
    this.showCommands();

    // Start interactive session
    this.isActive = true;
    await this.startInteractiveSession();
  }

  async verifyReactNativeProject() {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!await fs.exists(packageJsonPath)) {
        return false;
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for React Native indicators
      return !!(
        dependencies['react-native'] || 
        dependencies['expo'] || 
        dependencies['@react-native/metro-config'] ||
        packageJson.main === 'expo/AppEntry.js' ||
        await fs.exists(path.join(this.projectPath, 'app.json'))
      );
    } catch (error) {
      return false;
    }
  }

  async analyzeProject() {
    try {
      const analyzer = new ProjectAnalyzer(this.projectPath);
      this.projectContext = await analyzer.analyzeProject();
      
      console.log(chalk.blue(`📱 Project Type: ${this.projectContext.projectMetadata.framework}`));
      console.log(chalk.blue(`📁 Total Files: ${this.projectContext.totalFiles}`));
      console.log(chalk.blue(`🧩 Components: ${this.projectContext.componentFiles.length}`));
      console.log(chalk.blue(`📄 Screens: ${this.projectContext.pageFiles.length}`));
    } catch (error) {
      console.log(chalk.yellow('⚠️ Could not fully analyze project, but continuing...'));
      this.projectContext = {
        totalFiles: 0,
        componentFiles: [],
        pageFiles: [],
        dependencies: {},
        projectMetadata: { framework: 'React Native' }
      };
    }
  }

  showCommands() {
    console.log(chalk.cyan('💬 What can you ask me?'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.white('  • "Add a login screen with TypeScript"'));
    console.log(chalk.white('  • "Create a user profile component"'));
    console.log(chalk.white('  • "Fix the navigation styling"'));
    console.log(chalk.white('  • "Add dark mode support with context"'));
    console.log(chalk.white('  • "Update button styles to be more modern"'));
    console.log(chalk.white('  • "Add pull-to-refresh functionality"'));
    console.log(chalk.white('  • "Convert this component to TypeScript"'));
    console.log(chalk.white('  • "Add API service for user management"'));
    console.log('');
    console.log(chalk.cyan('🔧 Commands:'));
    console.log(chalk.white('  • type "exit" or "quit" to leave'));
    console.log(chalk.white('  • type "clear" to clear conversation history'));
    console.log(chalk.white('  • type "help" to see this again'));
    console.log(chalk.white('  • type "status" to see project info'));
    console.log(chalk.white('  • type "provider" to switch AI provider'));
    console.log('');
  }

  async startInteractiveSession() {
    while (this.isActive) {
      try {
        const response = await prompts({
          type: 'text',
          name: 'userPrompt',
          message: chalk.cyan('🤖 You:'),
          validate: value => value.trim().length > 0 || 'Please enter a request'
        });

        if (!response.userPrompt) {
          console.log(chalk.yellow('👋 Goodbye!'));
          break;
        }

        const userInput = response.userPrompt.trim();

        // Handle special commands
        if (await this.handleSpecialCommands(userInput)) {
          continue;
        }

        // Process AI request
        await this.processUserRequest(userInput);

      } catch (error) {
        if (error.message === 'cancelled') {
          console.log(chalk.yellow('\n👋 Goodbye!'));
          break;
        }
        console.error(chalk.red(`❌ Error: ${error.message}`));
      }
    }
  }

  async handleSpecialCommands(input) {
    const command = input.toLowerCase();
    
    switch (command) {
      case 'exit':
      case 'quit':
      case 'q':
        console.log(chalk.yellow('👋 Goodbye!'));
        this.isActive = false;
        return true;

      case 'clear':
        this.conversationHistory = [];
        console.log(chalk.green('🗑️ Conversation history cleared!'));
        return true;

      case 'help':
        this.showCommands();
        return true;

      case 'status':
        this.showProjectStatus();
        return true;

      case 'provider':
        await this.switchAIProvider();
        return true;

      default:
        return false;
    }
  }

  async switchAIProvider() {
    try {
      console.log(chalk.cyan('\n🔄 Current AI Provider: ') + chalk.white(aiManager.currentProvider?.name || 'None'));
      
      const response = await prompts({
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
        console.log(chalk.green(`✅ Switched to ${response.provider === 'mistral' ? 'Mistral AI' : 'Gemini 2.0 Flash'}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error switching provider: ${error.message}`));
    }
  }

  showProjectStatus() {
    console.log(chalk.cyan('\n📊 Project Status:'));
    console.log(`   📁 Directory: ${path.basename(this.projectPath)}`);
    console.log(`   📱 Framework: ${this.projectContext.projectMetadata.framework}`);
    console.log(`   📄 Components: ${this.projectContext.componentFiles.length}`);
    console.log(`   🧩 Screens: ${this.projectContext.pageFiles.length}`);
    console.log(`   💬 Conversation: ${this.conversationHistory.length} messages`);
    console.log(`   🤖 AI Provider: ${aiManager.currentProvider?.name || 'None'}\n`);
  }

  async processUserRequest(userInput) {
    console.log(chalk.gray('🤖 Processing your request...'));
    
    try {
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userInput,
        timestamp: new Date().toISOString()
      });

      // Generate AI response with project context and retry logic
      const aiResponse = await this.generateAIResponseWithRetry(userInput);
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date().toISOString()
      });

      // Display AI response
      console.log(chalk.cyan('\n🤖 AI Assistant:'));
      console.log(chalk.white(aiResponse.content));

      // Execute any actions if the AI provided them
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        await this.executeActions(aiResponse.actions);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.log(chalk.yellow('\n⏱️ Rate limit reached. Suggestions:'));
        console.log(chalk.white('1. Wait a moment and try again'));
        console.log(chalk.white('2. Switch AI provider: type "provider"'));
        console.log(chalk.white('3. Break your request into smaller parts'));
      }
    }
    
    console.log(''); // Add spacing
  }

  async generateAIResponseWithRetry(userInput, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Show retry attempt if not the first
        if (attempt > 1) {
          console.log(chalk.yellow(`🔄 Retry attempt ${attempt}/${maxRetries}...`));
          
          // Wait before retry with exponential backoff
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const aiResponse = await this.generateAIResponse(userInput);
        return aiResponse;
        
      } catch (error) {
        lastError = error;
        
        // If it's a rate limit error, wait longer
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          if (attempt < maxRetries) {
            const waitTime = 5000 * attempt; // 5s, 10s, 15s
            console.log(chalk.yellow(`⏱️ Rate limit hit. Waiting ${waitTime/1000}s before retry...`));
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // If it's the last attempt or non-rate-limit error, break
        if (attempt === maxRetries || !error.message.includes('rate limit')) {
          break;
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw lastError;
  }

  async generateAIResponse(userInput) {
    const prompt = this.buildContextualPrompt(userInput);
    
    try {
      const response = await aiManager.callAI(prompt, {
        task: 'interactive-assistance',
        temperature: 0.3,
        maxTokens: 4096
      });
      
      return this.parseAIResponse(response.content);
    } catch (error) {
      // Enhanced error handling
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error(`Rate limit exceeded. Please wait a moment before trying again. Current provider: ${aiManager.currentProvider?.name || 'Unknown'}`);
      }
      
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  buildContextualPrompt(userInput) {
    return `# 🤖 NTRN AI Assistant Pro

You are a Senior React Native Developer helping modify an existing React Native project through natural language commands.

## 📱 PROJECT CONTEXT
- **Project Type**: ${this.projectContext.projectMetadata.framework}
- **Components**: ${this.projectContext.componentFiles.length} files
- **Screens**: ${this.projectContext.pageFiles.length} files
- **Dependencies**: ${Object.keys(this.projectContext.dependencies || {}).join(', ')}

## 📜 CONVERSATION HISTORY
${this.conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

## 🎯 USER REQUEST
"${userInput}"

## 📋 RESPONSE INSTRUCTIONS

You must respond in this JSON format:
\`\`\`json
{
  "content": "Your conversational response to the user",
  "actions": [
    {
      "type": "create_file" | "modify_file" | "delete_file",
      "path": "relative/path/to/file.tsx",
      "content": "file content here (for create/modify)",
      "description": "What this action does"
    }
  ]
}
\`\`\`

## 🎨 PROFESSIONAL GUIDELINES

### 1. **TypeScript-First Development**
- All files must be .tsx/.ts (NO .jsx/.js)
- Strict TypeScript types for all props, state, functions
- Proper interface definitions and generic types
- Import types with \`import type\`

### 2. **React Native Best Practices**
- **ALL text must be in <Text> components**
- Use proper React Native components (View, TouchableOpacity, etc.)
- Mobile-optimized styling with StyleSheet.create()
- Touch targets minimum 44pt for accessibility
- Handle keyboard interactions properly

### 3. **Professional Architecture**
- Follow established project structure:
  - Screens: \`src/screens/ScreenName.tsx\`
  - Components: \`src/components/ComponentName.tsx\`
  - Services: \`src/services/ServiceName.ts\`
  - Contexts: \`src/contexts/ContextName.tsx\`
  - Types: \`src/types/TypeName.ts\`

### 4. **Navigation & State Management**
- Use proper TypeScript navigation types
- Context providers for global state
- Proper screen lifecycle management
- Update navigation configuration when adding screens

### 5. **Code Quality Standards**
- Production-ready, maintainable code
- Proper error handling and validation
- Performance optimizations (memoization, FlatList)
- Accessibility considerations

## 🚀 ENHANCED CAPABILITIES:

### "Add a login screen with TypeScript"
- Create LoginScreen.tsx with proper TypeScript types
- Include form validation with proper error states
- Add to navigation with type safety
- Modern mobile UX with loading states

### "Create API service for users"
- Build UserService.ts with TypeScript interfaces
- Proper API client integration
- Error handling and response types
- Authentication token management

### "Add dark mode with context"
- Create ThemeContext.tsx with TypeScript
- Light/dark theme definitions
- Provider integration in App.tsx
- Update existing components to use theme

### "Convert component to TypeScript"
- Analyze existing JavaScript component
- Add proper TypeScript types and interfaces
- Convert styling to mobile-optimized patterns
- Ensure React Native best practices

### "Fix navigation and add new screen"
- Update navigation types in src/types/navigation.ts
- Add screen component with proper props
- Update AppNavigator.tsx with new route
- Test navigation flow

Now respond professionally to: "${userInput}"`;
  }

  parseAIResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse entire response as JSON
      try {
        return JSON.parse(response);
      } catch {
        // Fallback: treat entire response as content
        return {
          content: response,
          actions: []
        };
      }
    } catch (error) {
      return {
        content: response,
        actions: []
      };
    }
  }

  async executeActions(actions) {
    console.log(chalk.cyan(`🔧 Executing ${actions.length} action(s)...`));

    for (const action of actions) {
      try {
        await this.executeAction(action);
        console.log(chalk.green(`✅ ${action.description}`));
      } catch (error) {
        console.log(chalk.red(`❌ Failed: ${action.description} - ${error.message}`));
      }
    }
  }

  async executeAction(action) {
    const fullPath = path.join(this.projectPath, action.path);

    switch (action.type) {
      case 'create_file':
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, action.content, 'utf-8');
        console.log(chalk.blue(`📄 Created: ${action.path}`));
        break;

      case 'modify_file':
        if (await fs.exists(fullPath)) {
          await fs.writeFile(fullPath, action.content, 'utf-8');
          console.log(chalk.blue(`📝 Modified: ${action.path}`));
        } else {
          // Create if doesn't exist
          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, action.content, 'utf-8');
          console.log(chalk.blue(`📄 Created: ${action.path}`));
        }
        break;

      case 'delete_file':
        if (await fs.exists(fullPath)) {
          await fs.remove(fullPath);
          console.log(chalk.blue(`🗑️ Deleted: ${action.path}`));
        }
        break;

      default:
        console.log(chalk.yellow(`⚠️ Unknown action type: ${action.type}`));
    }
  }

  async switchAIProvider() {
    // Implement the logic to switch between AI providers
    console.log(chalk.cyan('🤖 Switching AI provider...'));
    // This is a placeholder and should be replaced with actual provider switching logic
  }
}

export default InteractivePrompt; 