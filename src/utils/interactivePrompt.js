// 🤖 Interactive AI Assistant for React Native Projects
// ChatGPT-like CLI interface for making project changes

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { callGeminiAPI } from './geminiClient.js';
import { ProjectAnalyzer } from './projectAnalyzer.js';

export class InteractivePrompt {
  constructor() {
    this.projectPath = process.cwd();
    this.conversationHistory = [];
    this.projectContext = null;
    this.isActive = false;
  }

  async start() {
    console.log(chalk.cyan('🤖 NTRN Interactive AI Assistant'));
    console.log(chalk.cyan('==================================='));
    console.log(chalk.green('ChatGPT-like interface for your React Native project\n'));

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
    console.log(chalk.white('  • "Add a login screen"'));
    console.log(chalk.white('  • "Create a user profile component"'));
    console.log(chalk.white('  • "Fix the navigation styling"'));
    console.log(chalk.white('  • "Add dark mode support"'));
    console.log(chalk.white('  • "Update button styles to be more modern"'));
    console.log(chalk.white('  • "Add pull-to-refresh functionality"'));
    console.log('');
    console.log(chalk.cyan('🔧 Commands:'));
    console.log(chalk.white('  • type "exit" or "quit" to leave'));
    console.log(chalk.white('  • type "clear" to clear conversation history'));
    console.log(chalk.white('  • type "help" to see this again'));
    console.log(chalk.white('  • type "status" to see project info'));
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

      default:
        return false;
    }
  }

  showProjectStatus() {
    console.log(chalk.cyan('\n📊 Project Status:'));
    console.log(`   📁 Directory: ${path.basename(this.projectPath)}`);
    console.log(`   📱 Framework: ${this.projectContext.projectMetadata.framework}`);
    console.log(`   📄 Components: ${this.projectContext.componentFiles.length}`);
    console.log(`   🧩 Screens: ${this.projectContext.pageFiles.length}`);
    console.log(`   💬 Conversation: ${this.conversationHistory.length} messages\n`);
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

      // Generate AI response with project context
      const aiResponse = await this.generateAIResponse(userInput);
      
      // Add AI response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date().toISOString()
      });

      // Execute any file changes
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        await this.executeActions(aiResponse.actions);
      }

      // Display response
      console.log(chalk.green(`\n🤖 NTRN: ${aiResponse.content}\n`));

    } catch (error) {
      console.error(chalk.red(`❌ Error processing request: ${error.message}\n`));
    }
  }

  async generateAIResponse(userInput) {
    const prompt = this.buildContextualPrompt(userInput);
    
    try {
      const response = await callGeminiAPI(prompt, 'interactive-prompt', this.projectContext);
      return this.parseAIResponse(response);
    } catch (error) {
      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  buildContextualPrompt(userInput) {
    return `# 🤖 NTRN Interactive AI Assistant

You are an expert React Native developer helping a user modify their existing React Native project through natural language commands.

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

## 🎨 GUIDELINES
1. **Conversational**: Respond naturally like ChatGPT
2. **React Native Focus**: Generate mobile-optimized code
3. **Best Practices**: Follow RN conventions and patterns
4. **Practical**: Create working, production-ready code
5. **Explanation**: Explain what you're doing and why

## 🚀 EXAMPLES OF WHAT YOU CAN DO:

### "Add a login screen"
- Create LoginScreen.tsx with proper RN components
- Include form validation, loading states, error handling
- Add proper styling and mobile UX patterns

### "Create user profile component"
- Build UserProfile.tsx with avatar, info, settings
- Add proper navigation and state management
- Include edit functionality and proper styling

### "Fix navigation styling"
- Analyze existing navigation code
- Update styles for better mobile experience
- Add proper transitions and animations

### "Add dark mode support"
- Create theme system with light/dark variants
- Update existing components to use theme
- Add theme toggle functionality

Now respond to the user's request: "${userInput}"`;
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
}

export default InteractivePrompt; 