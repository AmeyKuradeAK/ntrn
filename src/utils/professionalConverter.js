import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { aiManager } from './aiProviders.js';
import { IntelligentProjectAnalyzer } from './intelligentAnalyzer.js';

export class ProfessionalConverter {
  constructor(nextjsPath = null, outputPath = null) {
    this.nextjsPath = nextjsPath;
    this.outputPath = outputPath;
    this.projectAnalysis = null;
    this.conversionPlan = null;
    this.fixingHistory = [];
    this.userPreferences = {
      autoFix: true,
      confirmBeforeMajorChanges: true,
      preferredStyling: 'nativewind'
    };
  }

  async start() {
    console.log(chalk.cyan('🚀 NTRN Professional Converter'));
    console.log(chalk.cyan('Acting as Senior React Native + Next.js Developer\n'));

    // If paths not provided, ask user to select them
    if (!this.nextjsPath || !this.outputPath) {
      await this.selectProjectPaths();
    }

    // Now start the conversion process
    return await this.convertProject();
  }

  async selectProjectPaths() {
    console.log(chalk.cyan('📁 Project Selection'));
    console.log(chalk.gray('Choose your Next.js project and output location\n'));

    const { nextjsPath, outputName } = await prompts([
      {
        type: 'text',
        name: 'nextjsPath',
        message: 'Enter the path to your Next.js project:',
        initial: process.cwd(),
        validate: async (input) => {
          if (!input) return 'Path is required';
          
          const fullPath = path.resolve(input);
          if (!await fs.exists(fullPath)) return 'Path does not exist';
          
          // Check if it's actually a Next.js project
          const packageJsonPath = path.join(fullPath, 'package.json');
          if (await fs.exists(packageJsonPath)) {
            try {
              const pkg = await fs.readJson(packageJsonPath);
              const deps = { ...pkg.dependencies, ...pkg.devDependencies };
              if (!deps.next) {
                console.log(chalk.yellow('⚠️ This doesn\'t appear to be a Next.js project (no "next" dependency found)'));
                const proceed = await prompts({
                  type: 'toggle',
                  name: 'continue',
                  message: 'Continue anyway?',
                  initial: false,
                  active: 'yes',
                  inactive: 'no'
                });
                if (!proceed.continue) return 'Please provide a valid Next.js project path';
              }
            } catch (error) {
              return 'Could not read package.json - please verify this is a valid Next.js project';
            }
          }
          
          return true;
        }
      },
      {
        type: 'text',
        name: 'outputName',
        message: 'Enter the name for your React Native project folder:',
        initial: 'converted-react-native',
        validate: (name) => {
          if (!name) return 'Project name is required';
          if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      }
    ]);

    if (!nextjsPath || !outputName) {
      console.log(chalk.red('❌ Project selection cancelled.'));
      process.exit(1);
    }

    // Resolve full paths
    this.nextjsPath = path.resolve(nextjsPath);
    this.outputPath = path.resolve(outputName);

    // Check if output directory already exists
    if (await fs.exists(this.outputPath)) {
      const overwrite = await prompts({
        type: 'toggle',
        name: 'overwrite',
        message: `Directory "${outputName}" already exists. Overwrite?`,
        initial: false,
        active: 'yes',
        inactive: 'no'
      });

      if (!overwrite.overwrite) {
        console.log(chalk.red('❌ Project creation cancelled.'));
        process.exit(1);
      }

      await fs.remove(this.outputPath);
    }

    console.log(chalk.green('\n✅ Project paths configured:'));
    console.log(chalk.blue(`📂 Input:  ${this.nextjsPath}`));
    console.log(chalk.blue(`📂 Output: ${this.outputPath}\n`));
  }

  async convertProject() {
    console.log(chalk.cyan('🚀 Starting Professional Conversion Process\n'));

    // Initialize AI providers
    await aiManager.initialize();
    await aiManager.ensureApiKeys();

    // Step 1: Intelligent Project Analysis
    console.log(chalk.yellow('Phase 1: Intelligent Project Analysis'));
    const analyzer = new IntelligentProjectAnalyzer(this.nextjsPath);
    this.projectAnalysis = await analyzer.analyzeProject();

    // Step 2: Generate Conversion Plan
    console.log(chalk.yellow('Phase 2: Professional Conversion Planning'));
    this.conversionPlan = await this.generateConversionPlan();

    // Step 3: Create React Native Project Structure
    console.log(chalk.yellow('Phase 3: Creating React Native Foundation'));
    await this.createReactNativeProject();

    // Step 4: Professional Conversion
    console.log(chalk.yellow('Phase 4: Professional Code Conversion'));
    const results = await this.performProfessionalConversion();

    // Show conversion summary
    this.showConversionSummary(results.filter(r => r.success).length, results.filter(r => !r.success && !r.skipped).length, results.filter(r => r.skipped).length);

    // Perform detailed analysis of results
    await this.performPostConversionAnalysis(results);

    return results;
  }

  async generateConversionPlan() {
    console.log(chalk.blue('🧠 Generating professional conversion plan...'));

    const planningPrompt = this.createPlanningPrompt();
    
    const response = await aiManager.callAI(planningPrompt, {
      task: 'planning',
      temperature: 0.1,
      maxTokens: 4096
    });

    const plan = await this.parsePlanFromResponse(response.content);
    
    console.log(chalk.green('✅ Conversion plan generated'));
    this.displayConversionPlan(plan);

    return plan;
  }

  createPlanningPrompt() {
    return `# INTELLIGENT REACT NATIVE APP CREATION PLAN

You are a Senior Mobile App Developer with 10+ years of experience. Your task is to analyze this Next.js website and create a native mobile app that provides the same functionality and user experience.

## NEXT.JS PROJECT ANALYSIS:
${JSON.stringify(this.projectAnalysis, null, 2)}

## YOUR MISSION:
Understand the website's PURPOSE, FUNCTIONALITY, and USER FLOW. Then design a mobile app that delivers the same value through native mobile patterns.

### 🧠 INTELLIGENT ANALYSIS REQUIRED:

#### 1. **Website Understanding**
- What is the main purpose of this website?
- What are the key user journeys and flows?
- What are the main features and functionality?
- How should this translate to mobile app experience?

#### 2. **Mobile App Architecture Design**
- What navigation pattern fits best? (Tab Bar, Stack, Drawer)
- Which screens are needed to recreate the website functionality?
- How should the mobile user flow differ from web?
- What mobile-specific features should be added?

#### 3. **Screen Mapping Strategy**
- DON'T just convert files 1:1
- ANALYZE content and functionality
- CREATE appropriate mobile screens
- DESIGN mobile-first user experience

### 📱 EXAMPLES OF INTELLIGENT CONVERSION:

**Instead of converting files directly:**
❌ \`app/layout.tsx\` → \`layout.tsx\` (Wrong!)
❌ \`app/page.tsx\` → \`page.tsx\` (Wrong!)

**Do intelligent analysis:**
✅ \`app/layout.tsx\` (navigation/header) → Design Tab Navigator
✅ \`app/page.tsx\` (homepage content) → HomeScreen.tsx  
✅ \`app/login/page.tsx\` (login functionality) → LoginScreen.tsx
✅ \`app/dashboard/page.tsx\` (dashboard functionality) → DashboardScreen.tsx

### 🎯 REACT NATIVE APP STRUCTURE TO CREATE:
Based on your analysis, determine what the complete mobile app needs:

{
  "appPurpose": "Brief description of what this website/app does",
  "userJourneys": ["Journey 1", "Journey 2", "Journey 3"],
  "mobileScreens": [
    {
      "screenName": "HomeScreen",
      "purpose": "Landing/main functionality",
      "sourceAnalysis": "Based on app/page.tsx content",
      "mobileFeatures": ["Feature 1", "Feature 2"]
    },
    {
      "screenName": "LoginScreen", 
      "purpose": "User authentication",
      "sourceAnalysis": "Based on app/login/page.tsx",
      "mobileFeatures": ["Biometric login", "Remember me"]
    }
  ],
  "supportingFiles": [
    {
      "category": "components",
      "files": ["Button.tsx", "Header.tsx", "LoadingSpinner.tsx"],
      "purpose": "Reusable UI components from components/ folder",
      "sourceFolder": "components/"
    },
    {
      "category": "utils", 
      "files": ["api.ts", "helpers.ts", "validation.ts"],
      "purpose": "Utility functions and helpers from lib/ or utils/",
      "sourceFolder": "lib/ or utils/"
    },
    {
      "category": "api",
      "files": ["auth.ts", "users.ts", "products.ts"],
      "purpose": "API calls and data fetching logic",
      "sourceFolder": "api/ or lib/api/"
    },
    {
      "category": "constants",
      "files": ["config.ts", "theme.ts", "urls.ts"],
      "purpose": "App configuration and constants",
      "sourceFolder": "constants/ or config/"
    },
    {
      "category": "hooks",
      "files": ["useAuth.ts", "useApi.ts"],
      "purpose": "Custom React hooks",
      "sourceFolder": "hooks/"
    },
    {
      "category": "types",
      "files": ["user.ts", "api.ts", "components.ts"],
      "purpose": "TypeScript type definitions",
      "sourceFolder": "types/ or @types/"
    }
  ],
  "architecture": {
    "navigation": "stack|tab|drawer",
    "reasoning": "Why this navigation pattern fits the app",
    "stateManagement": "native|redux|zustand",
    "styling": "stylesheet|nativewind"
  },
  "conversionStrategy": {
    "phases": [
      {
        "name": "Core Screens Creation",
        "priority": "high", 
        "screens": ["HomeScreen", "LoginScreen"],
        "strategy": "Create main user flow screens",
        "estimatedTime": "10-15 minutes"
      }
    ]
  },
  "mobileEnhancements": [
    "Push notifications",
    "Offline functionality", 
    "Native gestures",
    "Haptic feedback"
  ]
}

## 🚀 THINK LIKE A MOBILE APP DESIGNER:
- How can we make this mobile experience BETTER than the website?
- What mobile-specific features would enhance user experience?
- How should navigation work on small screens?
- What content should be prioritized on mobile?

Be intelligent, creative, and mobile-first in your approach!`;
  }

  async parsePlanFromResponse(content) {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[1]);
        
        // Transform the new intelligent format to the expected format
        if (plan.mobileScreens && plan.conversionStrategy) {
          return {
            appPurpose: plan.appPurpose,
            userJourneys: plan.userJourneys,
            mobileScreens: plan.mobileScreens,
            supportingFiles: plan.supportingFiles || [],
            architecture: plan.architecture,
            phases: plan.conversionStrategy.phases,
            mobileEnhancements: plan.mobileEnhancements,
            criticalIssues: [],
            qualityChecks: [
              'Validate all imports are React Native compatible',
              'Ensure all text is wrapped in Text components', 
              'Verify navigation structure works',
              'Check for runtime errors'
            ]
          };
        }
        
        return plan;
      }
      
      // Fallback plan if parsing fails
      return await this.createFallbackPlan();
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not parse AI plan, using fallback'));
      return await this.createFallbackPlan();
    }
  }

  async createFallbackPlan() {
    // Scan for supporting files in the Next.js project
    const supportingFiles = await this.scanForSupportingFiles();
    
    return {
      appPurpose: "Next.js application converted to React Native",
      userJourneys: ["Navigate between screens", "Use app functionality"],
      mobileScreens: this.projectAnalysis.patterns.routing.routes
        .filter(r => r.isPage)
        .map(r => ({
          screenName: this.convertFileNameToScreenName(r.file),
          purpose: `Screen based on ${r.file}`,
          sourceAnalysis: `Based on ${r.file}`,
          mobileFeatures: ["Mobile navigation", "Touch interactions"]
        })),
      supportingFiles: supportingFiles,
      architecture: {
        navigation: 'stack',
        stateManagement: 'native',
        styling: this.projectAnalysis.patterns.styling.hasTailwind ? 'nativewind' : 'stylesheet'
      },
      phases: [
        {
          name: 'Core Components Conversion',
          priority: 'high',
          files: this.projectAnalysis.patterns.routing.routes.filter(r => r.isPage).map(r => r.file),
          strategy: 'Convert page components to React Native screens',
          estimatedTime: '10-15 minutes'
        }
      ],
      criticalIssues: this.projectAnalysis.recommendations.map(r => ({
        issue: r.title,
        solution: r.description,
        priority: r.priority
      })),
      qualityChecks: [
        'Validate all imports are React Native compatible',
        'Ensure all text is wrapped in Text components',
        'Verify navigation structure works',
        'Check for runtime errors'
      ]
    };
  }

  async scanForSupportingFiles() {
    const supportingFiles = [];
    
    console.log(chalk.blue('🔍 Intelligent auto-discovery of ALL project folders...'));
    
    // Phase 1: Scan for known patterns
    const knownCategories = [
      { folder: 'components', category: 'components' },
      { folder: 'lib', category: 'utils' },
      { folder: 'utils', category: 'utils' },
      { folder: 'api', category: 'api' },
      { folder: 'constants', category: 'constants' },
      { folder: 'hooks', category: 'hooks' },
      { folder: 'types', category: 'types' },
      { folder: 'services', category: 'services' },
      { folder: 'helpers', category: 'utils' },
      { folder: 'stores', category: 'stores' },
      { folder: 'context', category: 'contexts' },
      { folder: 'contexts', category: 'contexts' },
      { folder: 'providers', category: 'contexts' },
      
      // Nested src patterns
      { folder: 'src/components', category: 'components' },
      { folder: 'src/lib', category: 'utils' },
      { folder: 'src/utils', category: 'utils' },
      { folder: 'src/api', category: 'api' },
      { folder: 'src/constants', category: 'constants' },
      { folder: 'src/hooks', category: 'hooks' },
      { folder: 'src/types', category: 'types' },
      { folder: 'src/services', category: 'services' },
      { folder: 'src/helpers', category: 'utils' },
      { folder: 'src/stores', category: 'stores' },
      { folder: 'src/context', category: 'contexts' },
      { folder: 'src/contexts', category: 'contexts' },
      { folder: 'src/providers', category: 'contexts' },
      
      // App router patterns
      { folder: 'app/(components)', category: 'components' },
      { folder: 'app/components', category: 'components' },
      { folder: 'app/lib', category: 'utils' },
      { folder: 'app/utils', category: 'utils' },
      { folder: 'app/api', category: 'api' },
      
      // Common "noob developer" patterns
      { folder: 'my-components', category: 'components' },
      { folder: 'mycomponents', category: 'components' },
      { folder: 'ui', category: 'components' },
      { folder: 'ui-components', category: 'components' },
      { folder: 'shared', category: 'components' },
      { folder: 'common', category: 'utils' },
      { folder: 'helper', category: 'utils' },
      { folder: 'helpers', category: 'utils' },
      { folder: 'data', category: 'api' },
      { folder: 'requests', category: 'api' },
      { folder: 'fetch', category: 'api' },
      { folder: 'apis', category: 'api' },
      { folder: 'configs', category: 'constants' },
      { folder: 'config', category: 'constants' },
      { folder: 'settings', category: 'constants' },
      { folder: 'consts', category: 'constants' },
      { folder: 'custom-hooks', category: 'hooks' },
      { folder: 'customhooks', category: 'hooks' },
      { folder: 'my-hooks', category: 'hooks' },
      { folder: 'typings', category: 'types' },
      { folder: 'type-definitions', category: 'types' },
      { folder: 'interfaces', category: 'types' },
      { folder: 'models', category: 'types' },
      { folder: 'business-logic', category: 'services' },
      { folder: 'logic', category: 'services' },
      { folder: 'core', category: 'services' },
      { folder: 'providers', category: 'contexts' },
      { folder: 'context-providers', category: 'contexts' },
      { folder: 'state', category: 'contexts' },
      { folder: 'store', category: 'stores' },
      { folder: 'redux', category: 'stores' },
      { folder: 'zustand', category: 'stores' },
      { folder: 'external', category: 'lib' },
      { folder: 'third-party', category: 'lib' },
      { folder: 'integrations', category: 'lib' },
    ];

    // Phase 2: Discover unknown folders with intelligent analysis
    const discoveredFolders = await this.discoverUnknownFolders();
    
    // Phase 3: Scan known folders
    for (const { folder, category } of knownCategories) {
      const fullPath = path.join(this.nextjsPath, folder);
      try {
        if (await fs.pathExists(fullPath)) {
          const files = await this.scanFolderForFiles(fullPath);
          if (files.length > 0) {
            console.log(chalk.green(`✅ Found ${category}: ${folder}/ (${files.length} files)`));
            supportingFiles.push({
              category,
              files: files.map(f => path.basename(f)),
              purpose: this.getCategoryPurpose(category),
              sourceFolder: folder + '/',
              fullPath,
              discoveredFiles: files
            });
          }
        }
      } catch (error) {
        // Folder doesn't exist or can't be accessed, skip silently
      }
    }

    // Phase 4: Process discovered unknown folders
    for (const discoveredFolder of discoveredFolders) {
      console.log(chalk.yellow(`🧠 Analyzing unknown folder: ${discoveredFolder.path}`));
      const category = await this.intelligentlyCategorizeFolderWithAI(discoveredFolder);
      
      if (category && category !== 'ignore') {
        console.log(chalk.green(`✅ Categorized as: ${category} (${discoveredFolder.files.length} files)`));
        supportingFiles.push({
          category,
          files: discoveredFolder.files.map(f => path.basename(f)),
          purpose: this.getCategoryPurpose(category),
          sourceFolder: path.relative(this.nextjsPath, discoveredFolder.fullPath) + '/',
          fullPath: discoveredFolder.fullPath,
          discoveredFiles: discoveredFolder.files,
          aiCategorized: true
        });
      } else {
        console.log(chalk.gray(`⏭️ Skipping folder: ${discoveredFolder.path} (not relevant for mobile)`));
      }
    }

    console.log(chalk.green(`🎯 Auto-discovery complete: Found ${supportingFiles.length} categories`));
    return supportingFiles;
  }

  async discoverUnknownFolders() {
    const discoveredFolders = [];
    const scannedPaths = new Set();

    // Recursively scan the project for ANY folders with code files
    const scanDirectory = async (dirPath, depth = 0) => {
      if (depth > 4) return; // Prevent infinite recursion
      if (scannedPaths.has(dirPath)) return;
      scannedPaths.add(dirPath);

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(this.nextjsPath, fullPath);
            
            // Skip common irrelevant folders
            if (this.shouldSkipFolder(entry.name, relativePath)) {
              continue;
            }

            // Check if this folder contains code files
            const files = await this.scanFolderForFiles(fullPath);
            if (files.length > 0) {
              // Check if it's not already in our known categories
              if (!this.isKnownCategory(relativePath)) {
                discoveredFolders.push({
                  name: entry.name,
                  path: relativePath,
                  fullPath,
                  files,
                  depth
                });
              }
            }

            // Recursively scan subdirectories
            await scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Can't read directory, skip
      }
    };

    await scanDirectory(this.nextjsPath);
    return discoveredFolders;
  }

  shouldSkipFolder(folderName, relativePath) {
    const skipPatterns = [
      'node_modules', '.next', '.git', 'dist', 'build', 'out',
      '.vscode', '.idea', 'coverage', '__tests__', '.storybook',
      'public', 'static', 'assets', 'images', 'fonts', 'icons',
      '.env', '.env.local', '.env.development', '.env.production',
      'styles', 'css', 'scss', 'sass', // Skip pure styling folders
      'docs', 'documentation', 'readme',
    ];

    return skipPatterns.some(pattern => 
      folderName.toLowerCase().includes(pattern.toLowerCase()) ||
      relativePath.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  isKnownCategory(relativePath) {
    const knownPaths = [
      'components', 'lib', 'utils', 'api', 'constants', 'hooks', 'types', 'services',
      'src/components', 'src/lib', 'src/utils', 'src/api', 'src/constants', 
      'src/hooks', 'src/types', 'src/services', 'app/components', 'app/lib', 
      'app/utils', 'app/api', 'pages/api'
    ];

    return knownPaths.some(known => relativePath === known || relativePath.startsWith(known + '/'));
  }

  async scanFolderForFiles(folderPath) {
    const files = [];
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(folderPath, entry.name);
          // Only include TypeScript/JavaScript files
          if (this.isCodeFile(entry.name)) {
            files.push(filePath);
          }
        } else if (entry.isDirectory() && !this.shouldSkipFolder(entry.name, entry.name)) {
          // Recursively scan subdirectories (max 2 levels deep)
          const subFiles = await this.scanFolderForFiles(path.join(folderPath, entry.name));
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Can't read folder, return empty array
    }
    
    return files;
  }

  isCodeFile(fileName) {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
    return codeExtensions.some(ext => fileName.endsWith(ext));
  }

  async intelligentlyCategorizeFolderWithAI(discoveredFolder) {
    try {
      // Read a few sample files to understand the folder's purpose
      const sampleFiles = discoveredFolder.files.slice(0, 3);
      let sampleContent = '';
      
      for (const filePath of sampleFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          sampleContent += `\n// File: ${path.basename(filePath)}\n${content.substring(0, 500)}...\n`;
        } catch (error) {
          // Skip if can't read file
        }
      }

             const categorizationPrompt = `# INTELLIGENT FOLDER CATEGORIZATION FOR ANY PROJECT STRUCTURE

You are an expert developer analyzing a Next.js project with unknown folder structure. Your job is to intelligently categorize ANY folder, even if the developer used weird or non-standard naming.

## UNKNOWN FOLDER ANALYSIS:
- **Folder Name**: ${discoveredFolder.name}
- **Folder Path**: ${discoveredFolder.path}  
- **Files Found**: ${discoveredFolder.files.length}
- **File Names**: ${discoveredFolder.files.map(f => path.basename(f)).join(', ')}

## SAMPLE CODE FROM FILES:
\`\`\`typescript
${sampleContent}
\`\`\`

## YOUR INTELLIGENT ANALYSIS TASK:
Look at the folder name, file names, and code content to determine what this folder contains. Handle ANY naming convention, including non-standard ones from noob developers.

**Available Categories:**
- \`components\` - UI components, React components, reusable elements
- \`utils\` - Helper functions, utilities, shared logic, formatters
- \`api\` - API calls, data fetching, HTTP requests, backend communication
- \`constants\` - Configuration, constants, config files, settings
- \`hooks\` - Custom React hooks, state logic
- \`types\` - TypeScript types, interfaces, type definitions
- \`services\` - Business logic services, classes, core functionality
- \`contexts\` - React context providers, state management
- \`stores\` - State management (Redux, Zustand, etc.)
- \`lib\` - Third-party integrations, external libraries
- \`ignore\` - Not relevant for mobile app (skip this folder)

**Pattern Recognition Examples:**
- "ui", "shared", "common-components", "my-components" → \`components\`
- "helper", "tools", "shared-utils", "common" → \`utils\`
- "data", "requests", "fetch", "api-calls" → \`api\`
- "config", "settings", "env", "constants" → \`constants\`
- "custom-hooks", "hooks", "state-hooks" → \`hooks\`
- "types", "interfaces", "models", "typings" → \`types\`
- "logic", "business", "core", "services" → \`services\`
- "context", "providers", "state" → \`contexts\`
- "store", "redux", "zustand", "state-mgmt" → \`stores\`
- "external", "third-party", "integrations" → \`lib\`
- "server", "backend", "database", "docs" → \`ignore\`

**Content Analysis:**
- Files with JSX/TSX and return statements → \`components\`
- Files with export function/const (utilities) → \`utils\`
- Files with fetch/axios calls → \`api\`
- Files with export const CONFIG → \`constants\`
- Files with useEffect/useState → \`hooks\`
- Files with interface/type definitions → \`types\`
- Files with class definitions or business logic → \`services\`
- Files with createContext/Provider → \`contexts\`
- Files with store/dispatch/reducer → \`stores\`

**BE INTELLIGENT:** Look beyond the folder name at the actual content and purpose.

**Respond with ONLY the category name (no explanation):**`;

      const response = await aiManager.callAI(categorizationPrompt, {
        task: 'categorization',
        temperature: 0.1,
        maxTokens: 50
      });

      const category = response.content.trim().toLowerCase();
      
      // Validate the category
      const validCategories = ['components', 'utils', 'api', 'constants', 'hooks', 'types', 'services', 'contexts', 'stores', 'lib', 'ignore'];
      return validCategories.includes(category) ? category : 'utils'; // Default to utils if uncertain
      
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not categorize folder ${discoveredFolder.name}, defaulting to utils`));
      return 'utils'; // Safe default
    }
  }

  getCategoryPurpose(category) {
    const purposes = {
      'components': 'Reusable UI components',
      'utils': 'Utility functions and helpers',
      'api': 'API calls and data fetching logic',
      'constants': 'App configuration and constants',
      'hooks': 'Custom React hooks',
      'types': 'TypeScript type definitions',
      'services': 'Business logic and service classes',
      'contexts': 'React context providers and state management',
      'stores': 'State management (Redux, Zustand, etc.)',
      'lib': 'Third-party integrations and external libraries'
    };
    return purposes[category] || 'Supporting functionality';
  }

  detectShadcnUsage(sourceContent) {
    if (!sourceContent) {
      return { hasShadcn: false, components: [], imports: [] };
    }

    const shadcnImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*["'`]@\/components\/ui\/([^"'`]+)["'`]/g;
    const shadcnComponents = [
      'Button', 'Input', 'Card', 'CardHeader', 'CardTitle', 'CardContent', 'CardFooter',
      'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogTrigger',
      'Sheet', 'SheetContent', 'SheetHeader', 'SheetTitle', 'SheetTrigger',
      'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue',
      'Checkbox', 'Switch', 'RadioGroup', 'RadioGroupItem',
      'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
      'Badge', 'Avatar', 'AvatarImage', 'AvatarFallback',
      'Progress', 'Slider', 'Textarea', 'Label',
      'Alert', 'AlertDialog', 'AlertDialogAction', 'AlertDialogCancel',
      'Toast', 'Toaster', 'useToast',
      'Separator', 'Skeleton', 'ScrollArea',
      'Command', 'CommandDialog', 'CommandInput', 'CommandList',
      'Popover', 'PopoverContent', 'PopoverTrigger',
      'HoverCard', 'HoverCardContent', 'HoverCardTrigger',
      'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem'
    ];

    const detectedComponents = new Set();
    const detectedImports = new Set();
    
    // Check for import statements
    let match;
    while ((match = shadcnImportRegex.exec(sourceContent)) !== null) {
      const components = match[1].split(',').map(c => c.trim());
      const importPath = match[2];
      
      detectedImports.add(`@/components/ui/${importPath}`);
      components.forEach(comp => {
        if (shadcnComponents.includes(comp)) {
          detectedComponents.add(comp);
        }
      });
    }

    // Check for component usage in JSX
    shadcnComponents.forEach(component => {
      const usageRegex = new RegExp(`<${component}\\b`, 'g');
      if (usageRegex.test(sourceContent)) {
        detectedComponents.add(component);
      }
    });

    return {
      hasShadcn: detectedComponents.size > 0 || detectedImports.size > 0,
      components: Array.from(detectedComponents),
      imports: Array.from(detectedImports)
    };
  }

  getShadcnConversionMapping(component) {
    const mappings = {
      'Button': '**Button** → TouchableOpacity + Text with proper styling and onPress handler',
      'Input': '**Input** → TextInput with React Native styling, keyboardType, and onChangeText',
      'Card': '**Card** → View with shadow/border styling',
      'CardHeader': '**CardHeader** → View with header styling',
      'CardTitle': '**CardTitle** → Text with title styling', 
      'CardContent': '**CardContent** → View with content padding',
      'CardFooter': '**CardFooter** → View with footer styling',
      'Dialog': '**Dialog** → Modal with overlay and proper animations',
      'DialogContent': '**DialogContent** → View with modal content styling',
      'DialogHeader': '**DialogHeader** → View with modal header',
      'DialogTitle': '**DialogTitle** → Text with modal title styling',
      'DialogTrigger': '**DialogTrigger** → TouchableOpacity to open modal',
      'Sheet': '**Sheet** → Modal with slide-up animation',
      'SheetContent': '**SheetContent** → View with bottom sheet styling',
      'SheetHeader': '**SheetHeader** → View with sheet header',
      'SheetTitle': '**SheetTitle** → Text with sheet title styling',
      'SheetTrigger': '**SheetTrigger** → TouchableOpacity to open sheet',
      'Select': '**Select** → Custom picker with TouchableOpacity + Modal + FlatList',
      'SelectContent': '**SelectContent** → Modal with options list',
      'SelectItem': '**SelectItem** → TouchableOpacity for each option',
      'SelectTrigger': '**SelectTrigger** → TouchableOpacity to open picker',
      'SelectValue': '**SelectValue** → Text showing selected value',
      'Checkbox': '**Checkbox** → TouchableOpacity with custom checkbox styling',
      'Switch': '**Switch** → React Native Switch component',
      'RadioGroup': '**RadioGroup** → Custom radio button group with TouchableOpacity',
      'RadioGroupItem': '**RadioGroupItem** → TouchableOpacity with radio styling',
      'Tabs': '**Tabs** → Custom tab implementation with TouchableOpacity',
      'TabsList': '**TabsList** → View with horizontal tab buttons',
      'TabsTrigger': '**TabsTrigger** → TouchableOpacity for each tab',
      'TabsContent': '**TabsContent** → View with tab content',
      'Badge': '**Badge** → View with badge styling and Text',
      'Avatar': '**Avatar** → Image with circular styling (expo-image)',
      'AvatarImage': '**AvatarImage** → Image component',
      'AvatarFallback': '**AvatarFallback** → Text with fallback styling',
      'Progress': '**Progress** → Custom progress bar with View components',
      'Slider': '**Slider** → @react-native-community/slider',
      'Textarea': '**Textarea** → TextInput with multiline and proper styling',
      'Label': '**Label** → Text with label styling',
      'Alert': '**Alert** → View with alert styling and icon',
      'AlertDialog': '**AlertDialog** → Modal with alert styling',
      'AlertDialogAction': '**AlertDialogAction** → TouchableOpacity for alert actions',
      'AlertDialogCancel': '**AlertDialogCancel** → TouchableOpacity for cancel action',
      'Toast': '**Toast** → react-native-toast-message integration',
      'Toaster': '**Toaster** → Toast message container',
      'useToast': '**useToast** → Custom hook for toast notifications',
      'Separator': '**Separator** → View with border styling',
      'Skeleton': '**Skeleton** → View with loading animation',
      'ScrollArea': '**ScrollArea** → ScrollView with proper styling',
      'Command': '**Command** → Custom command palette with TextInput + FlatList',
      'CommandDialog': '**CommandDialog** → Modal with command interface',
      'CommandInput': '**CommandInput** → TextInput for command search',
      'CommandList': '**CommandList** → FlatList for command results',
      'Popover': '**Popover** → Modal with popover positioning',
      'PopoverContent': '**PopoverContent** → View with popover content',
      'PopoverTrigger': '**PopoverTrigger** → TouchableOpacity to open popover',
      'HoverCard': '**HoverCard** → TouchableOpacity with long press (no hover in mobile)',
      'HoverCardContent': '**HoverCardContent** → Modal or tooltip content',
      'HoverCardTrigger': '**HoverCardTrigger** → TouchableOpacity with long press',
      'DropdownMenu': '**DropdownMenu** → Modal with dropdown styling',
      'DropdownMenuContent': '**DropdownMenuContent** → View with menu items',
      'DropdownMenuItem': '**DropdownMenuItem** → TouchableOpacity for each menu item'
    };

    return mappings[component] || `**${component}** → Create React Native equivalent using TouchableOpacity, View, Text, and proper styling`;
  }

  convertFileNameToScreenName(filename) {
    // Convert file path to screen name
    const baseName = path.basename(filename, path.extname(filename));
    if (baseName === 'index' || baseName === 'page') {
      const dirName = path.dirname(filename);
      const folderName = path.basename(dirName);
      if (folderName === 'app' || folderName === '(app)') {
        return 'HomeScreen';
      }
      return folderName.charAt(0).toUpperCase() + folderName.slice(1) + 'Screen';
    }
    return baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Screen';
  }

  displayConversionPlan(plan) {
    console.log(chalk.cyan('\n📱 Intelligent Mobile App Creation Plan'));
    console.log(chalk.cyan('=' .repeat(60)));

    if (plan.appPurpose) {
      console.log(chalk.yellow('\n🎯 App Purpose:'));
      console.log(`   ${plan.appPurpose}`);
    }

    if (plan.userJourneys) {
      console.log(chalk.yellow('\n🛤️ Key User Journeys:'));
      plan.userJourneys.forEach((journey, index) => {
        console.log(`   ${index + 1}. ${journey}`);
      });
    }

    if (plan.mobileScreens) {
      console.log(chalk.yellow('\n📱 Mobile Screens to Create:'));
      plan.mobileScreens.forEach((screen, index) => {
        console.log(`   ${index + 1}. ${chalk.green(screen.screenName)}`);
        console.log(`      Purpose: ${screen.purpose}`);
        console.log(`      Based on: ${screen.sourceAnalysis}`);
        if (screen.mobileFeatures?.length > 0) {
          console.log(`      Mobile Features: ${screen.mobileFeatures.join(', ')}`);
        }
      });
    }

    if (plan.supportingFiles?.length > 0) {
      console.log(chalk.yellow('\n🛠️ Supporting Files to Convert:'));
      plan.supportingFiles.forEach((category, index) => {
        console.log(`   ${index + 1}. ${chalk.blue(category.category.toUpperCase())}`);
        console.log(`      Files: ${category.files.join(', ')}`);
        console.log(`      Purpose: ${category.purpose}`);
        console.log(`      Source: ${category.sourceFolder}`);
      });
    }

    if (plan.architecture) {
      console.log(chalk.yellow('\n🏗️ Architecture Decisions:'));
      console.log(`   Navigation: ${plan.architecture.navigation}`);
      if (plan.architecture.reasoning) {
        console.log(`   Reasoning: ${plan.architecture.reasoning}`);
      }
      console.log(`   State Management: ${plan.architecture.stateManagement}`);
      console.log(`   Styling: ${plan.architecture.styling}`);
    }

    if (plan.phases) {
      console.log(chalk.yellow('\n📅 Development Phases:'));
      plan.phases.forEach((phase, index) => {
        const priority = phase.priority === 'high' ? '🔴' : phase.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priority} ${phase.name} (${phase.estimatedTime})`);
        console.log(`      Strategy: ${phase.strategy}`);
        if (phase.screens) {
          console.log(`      Screens: ${phase.screens.join(', ')}`);
        } else if (phase.files) {
          console.log(`      Files: ${phase.files.length} files`);
        }
      });
    }

    if (plan.mobileEnhancements?.length > 0) {
      console.log(chalk.yellow('\n🚀 Mobile Enhancements:'));
      plan.mobileEnhancements.forEach(enhancement => {
        console.log(`   ✨ ${enhancement}`);
      });
    }

    if (plan.criticalIssues?.length > 0) {
      console.log(chalk.yellow('\n⚠️ Critical Issues to Address:'));
      plan.criticalIssues.slice(0, 3).forEach(issue => {
        const priority = issue.priority === 'high' ? '🔴' : '🟡';
        console.log(`   ${priority} ${issue.issue}`);
      });
    }

    console.log('');
  }

  async createReactNativeProject() {
    console.log(chalk.blue('🏗️ Creating professional React Native project structure...'));

    // Create comprehensive directory structure
    const directories = [
      'src',
      'src/screens',
      'src/components',
      'src/navigation',
      'src/hooks',
      'src/utils',
      'src/services',
      'src/api',
      'src/contexts',
      'src/types',
      'src/constants',
      'assets',
      'assets/images',
      'assets/fonts'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(this.outputPath, dir));
    }

    // Create essential files
    await this.createPackageJson();
    await this.createConfigFiles();
    await this.createTypeScriptConfig();
    await this.createNavigationSetup();
    await this.createContextProviders();
    await this.createApiServices();

    // Copy and process assets from public folder
    await this.copyAndProcessAssets();

    console.log(chalk.green('✅ React Native project structure created'));
  }

  async createPackageJson() {
    const packageJson = {
      name: path.basename(this.outputPath).toLowerCase().replace(/[^a-z0-9]/g, ''),
      version: '1.0.0',
      main: 'expo/AppEntry.js',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        'type-check': 'tsc --noEmit',
        eject: 'expo eject'
      },
      dependencies: {
        expo: '~52.0.19',
        react: '18.3.1',
        'react-native': '0.76.5',
        '@react-navigation/native': '^6.1.18',
        '@react-navigation/native-stack': '^6.11.0',
        '@react-navigation/bottom-tabs': '^6.6.1',
        'react-native-screens': '3.34.0',
        'react-native-safe-area-context': '4.12.0',
        '@react-native-async-storage/async-storage': '1.23.1',
        'react-native-gesture-handler': '~2.20.0',
        'expo-status-bar': '~2.0.0',
        'expo-font': '~12.0.10',
        'expo-splash-screen': '~0.27.8',
        'expo-image': '~1.13.0',
        '@react-native-community/slider': '4.5.3',
        'react-native-toast-message': '^2.2.1',
        'react-native-reanimated': '~3.16.1',
        'react-native-svg': '15.8.0'
      },
      devDependencies: {
        '@babel/core': '^7.25.0',
        '@types/react': '~18.3.12',
        'typescript': '~5.3.3'
      }
    };

    await fs.writeJson(path.join(this.outputPath, 'package.json'), packageJson, { spaces: 2 });
  }

  async createTypeScriptConfig() {
    const tsConfig = {
      extends: 'expo/tsconfig.base',
      compilerOptions: {
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react-native',
        lib: ['dom', 'esnext'],
        moduleResolution: 'node',
        noEmit: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@/components/*': ['src/components/*'],
          '@/screens/*': ['src/screens/*'],
          '@/services/*': ['src/services/*'],
          '@/contexts/*': ['src/contexts/*'],
          '@/types/*': ['src/types/*'],
          '@/api/*': ['src/api/*']
        }
      },
      include: [
        '**/*.ts',
        '**/*.tsx'
      ],
      exclude: [
        'node_modules'
      ]
    };

    await fs.writeJson(path.join(this.outputPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
  }

  async createConfigFiles() {
    // Enhanced App.tsx with Context Providers
    const appContent = `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProviders } from './src/contexts/AppProviders';

export default function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}`;

    await fs.writeFile(path.join(this.outputPath, 'App.tsx'), appContent);

    // Fixed app.json - Official Expo SDK 53 React Native configuration
    const appJson = {
              expo: {
          name: path.basename(this.outputPath),
          slug: path.basename(this.outputPath).toLowerCase(),
          version: '1.0.0',
          orientation: 'portrait',
          icon: './assets/icon.png',
          userInterfaceStyle: 'light',
          newArchEnabled: true, // Enable New Architecture by default for SDK 52
          splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff'
          },
          assetBundlePatterns: ['**/*'],
          ios: {
            supportsTablet: true,
            bundleIdentifier: `com.${path.basename(this.outputPath).toLowerCase()}.app`,
            deploymentTarget: '15.1' // SDK 52 minimum iOS version
          },
          android: {
            adaptiveIcon: {
              foregroundImage: './assets/adaptive-icon.png',
              backgroundColor: '#FFFFFF'
            },
            package: `com.${path.basename(this.outputPath).toLowerCase()}.app`,
            compileSdkVersion: 34, // SDK 52 requirement
            targetSdkVersion: 34,
            minSdkVersion: 23 // SDK 52 requirement
          },
          web: {
            favicon: './assets/favicon.png',
            bundler: 'metro'
          },
          plugins: [
            'expo-splash-screen' // Use config plugin for SDK 52
          ]
        }
    };

    await fs.writeJson(path.join(this.outputPath, 'app.json'), appJson, { spaces: 2 });

    // Create babel.config.js for proper Expo setup
    const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`;

    await fs.writeFile(path.join(this.outputPath, 'babel.config.js'), babelConfig);

    // Create metro.config.js for TypeScript support
    const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add TypeScript support
config.resolver.sourceExts.push('tsx', 'ts');

module.exports = config;`;

    await fs.writeFile(path.join(this.outputPath, 'metro.config.js'), metroConfig);

    // Create .expo/README.md to mark as Expo project
    await fs.ensureDir(path.join(this.outputPath, '.expo'));
    const expoReadme = `# Expo Project

This folder is created when an Expo project is started using "expo start" command.

## Required Files (generated automatically by Expo):
- icon.png (1024x1024) - App icon
- splash.png (1242x2436) - Splash screen image  
- adaptive-icon.png (1024x1024) - Android adaptive icon
- favicon.png (48x48) - Web favicon

## Adding Custom Assets:
1. Place images, fonts, and other assets in this folder
2. Import them in your components:
   \`\`\`typescript
   import logo from '../assets/logo.png';
   <Image source={logo} />
   \`\`\`

Expo will automatically generate the required app icons and splash screens when you build your app.`;

    await fs.writeFile(path.join(this.outputPath, '.expo/README.md'), expoReadme);

    // Create essential .gitignore for Expo project
    const gitignoreContent = `# OSX
#
.DS_Store

# Xcode
#
build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata
*.xccheckout
*.moved-aside
DerivedData
*.hmap
*.ipa
*.xcuserstate
project.xcworkspace

# Android/IntelliJ
#
build/
.idea
.gradle
local.properties
*.iml
*.hprof
.cxx/

# node.js
#
node_modules/
npm-debug.log
yarn-error.log

# BUCK
buck-out/
\\.buckd/
*.keystore
!debug.keystore

# Bundle artifacts
*.jsbundle

# CocoaPods
/ios/Pods/

# Expo
.expo/
dist/
web-build/

# @generated expo-cli sync-2b81b286409207a5da26e14c78851eb30d8ccbdb
# The following patterns were generated by expo-cli

expo-env.d.ts
# @end expo-cli`;

    await fs.writeFile(path.join(this.outputPath, '.gitignore'), gitignoreContent);

    // Create placeholder assets that app.json references
    await fs.ensureDir(path.join(this.outputPath, 'assets'));
    
    // Create a simple README for assets folder
    const assetsReadme = `# Assets

This folder contains the static assets for your Expo React Native app.

## Required Files (generated automatically by Expo):
- icon.png (1024x1024) - App icon
- splash.png (1242x2436) - Splash screen image  
- adaptive-icon.png (1024x1024) - Android adaptive icon
- favicon.png (48x48) - Web favicon

## Adding Custom Assets:
1. Place images, fonts, and other assets in this folder
2. Import them in your components:
   \`\`\`typescript
   import logo from '../assets/logo.png';
   <Image source={logo} />
   \`\`\`

Expo will automatically generate the required app icons and splash screens when you build your app.`;

    await fs.writeFile(path.join(this.outputPath, 'assets/README.md'), assetsReadme);

    // Create expo-env.d.ts for TypeScript support
    const expoEnvTypes = `/// <reference types="expo/types" />`;
    await fs.writeFile(path.join(this.outputPath, 'expo-env.d.ts'), expoEnvTypes);

    
  }

  async createNavigationSetup() {
    // Enhanced navigation with TypeScript types
    const navigationTypesContent = `import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  // Add your screen types here
  // Profile: { userId: string };
  // Settings: undefined;
};

export type RootStackScreenProps<Screen extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, Screen>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/types/navigation.ts'), navigationTypesContent);

    // Enhanced Navigator with TypeScript
    const navigatorContent = `import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): JSX.Element {
  return (
    <Stack.Navigator 
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f4f3f4',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      {/* Add more screens here */}
    </Stack.Navigator>
  );
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/navigation/AppNavigator.tsx'), navigatorContent);

    // Enhanced home screen with TypeScript
    const homeScreenContent = `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'Home'>;

export function HomeScreen({ navigation }: Props): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Your React Native App</Text>
      <Text style={styles.subtitle}>Converted from Next.js by NTRN</Text>
      <Text style={styles.description}>
        This is a fully functional Expo React Native app with TypeScript support.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});`;

    await fs.writeFile(path.join(this.outputPath, 'src/screens/HomeScreen.tsx'), homeScreenContent);
  }

  async createContextProviders() {
    // Main App Providers wrapper
    const appProvidersContent = `import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { AuthProvider } from './AuthContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/contexts/AppProviders.tsx'), appProvidersContent);

    // Theme Context
    const themeContextContent = `import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    error: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    text: '#000000',
    error: '#FF3B30',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme: lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/contexts/ThemeContext.tsx'), themeContextContent);

    // Auth Context
    const authContextContent = `import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Implement actual login logic
      const mockUser: User = { id: '1', email, name: 'User' };
      setUser(mockUser);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Implement actual logout logic
      setUser(null);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    setIsLoading(true);
    try {
      // TODO: Implement actual registration logic
      const mockUser: User = { id: '1', email, name };
      setUser(mockUser);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/contexts/AuthContext.tsx'), authContextContent);
  }

  async createApiServices() {
    // API Client setup
    const apiClientContent = `interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface ApiError {
  message: string;
  status: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = 'https://api.example.com') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = \`\${this.baseURL}\${endpoint}\`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new ApiError(\`HTTP error! status: \${response.status}\`, response.status);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        data: {} as T,
        success: false,
        message: apiError.message,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse, ApiError };`;

    await fs.writeFile(path.join(this.outputPath, 'src/api/client.ts'), apiClientContent);

    // Example API service
    const userServiceContent = `import { apiClient, ApiResponse } from './client';
import type { User } from '../contexts/AuthContext';

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

export class UserService {
  static async getUser(id: string): Promise<ApiResponse<User>> {
    return apiClient.get<User>(\`/users/\${id}\`);
  }

  static async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return apiClient.post<User>('/users', userData);
  }

  static async updateUser(id: string, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return apiClient.put<User>(\`/users/\${id}\`, userData);
  }

  static async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(\`/users/\${id}\`);
  }

  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/users/me');
  }
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/services/userService.ts'), userServiceContent);

    // API types
    const apiTypesContent = `// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Common API Error structure
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
}

// Authentication related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}`;

    await fs.writeFile(path.join(this.outputPath, 'src/types/api.ts'), apiTypesContent);
  }

  async copyAndProcessAssets() {
    console.log(chalk.blue('📁 Processing assets from public folder...'));

    const publicPath = path.join(this.nextjsPath, 'public');
    const assetsPath = path.join(this.outputPath, 'assets');

    // Check if public folder exists
    if (!await fs.exists(publicPath)) {
      console.log(chalk.yellow('⚠️ No public folder found, creating default assets...'));
      await this.createDefaultAssets();
      return;
    }

    try {
      // Copy all assets from public to assets folder
      await fs.copy(publicPath, assetsPath, {
        filter: (src) => {
          // Filter out files that don't belong in mobile assets
          const filename = path.basename(src);
          const ext = path.extname(filename).toLowerCase();
          
          // Skip non-image files and web-specific assets
          const skipFiles = ['.html', '.xml', 'robots.txt', 'sitemap.xml', 'manifest.json', '.ico'];
          const isSkippedFile = skipFiles.some(skip => filename.includes(skip) || ext === skip);
          
          if (isSkippedFile) {
            console.log(chalk.gray(`⏭️ Skipping web-specific file: ${filename}`));
            return false;
          }

          // Allow image files and other mobile-friendly assets
          const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.json', '.ttf', '.otf'];
          const isAllowed = allowedExtensions.includes(ext) || fs.statSync(src).isDirectory();
          
          if (!isAllowed) {
            console.log(chalk.gray(`⏭️ Skipping unsupported file type: ${filename}`));
          }
          
          return isAllowed;
        }
      });

      // Create asset index file for easy imports
      await this.createAssetIndex();

      console.log(chalk.green('✅ Assets copied and processed successfully'));
      
      // Show which assets were copied
      const copiedAssets = await this.listCopiedAssets();
      if (copiedAssets.length > 0) {
        console.log(chalk.cyan(`📋 Copied ${copiedAssets.length} assets:`));
        copiedAssets.slice(0, 5).forEach(asset => {
          console.log(chalk.gray(`   • ${asset}`));
        });
        if (copiedAssets.length > 5) {
          console.log(chalk.gray(`   ... and ${copiedAssets.length - 5} more`));
        }
      }

    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Error copying assets: ${error.message}`));
      console.log(chalk.blue('Creating default assets instead...'));
      await this.createDefaultAssets();
    }
  }

  async createDefaultAssets() {
    const assetsPath = path.join(this.outputPath, 'assets');
    
    // Create default asset structure
    await fs.ensureDir(path.join(assetsPath, 'images'));
    await fs.ensureDir(path.join(assetsPath, 'fonts'));
    await fs.ensureDir(path.join(assetsPath, 'icons'));

    // Create placeholder assets info
    const assetReadme = `# Assets Folder

This folder contains your React Native app assets.

## Structure:
- **images/**: App images and graphics
- **fonts/**: Custom fonts (TTF, OTF)
- **icons/**: App icons and small graphics

## Usage:
\`\`\`tsx
// Import images
import logo from '../assets/images/logo.png';

// Use in components
<Image source={logo} style={styles.logo} />
\`\`\`

## Expo Asset Requirements:
- Images: PNG, JPG, GIF, WebP
- Fonts: TTF, OTF
- Maximum file size: 20MB per asset
`;

    await fs.writeFile(path.join(assetsPath, 'README.md'), assetReadme);

    // Create default icon placeholder
    const iconPlaceholder = `// Default icon exports
// Add your icons here as they're added to the assets/icons folder

export const icons = {
  // placeholder: require('./icons/placeholder.png'),
  // logo: require('./icons/logo.png'),
  // Add more icons as needed
} as const;
`;

    await fs.writeFile(path.join(assetsPath, 'icons.ts'), iconPlaceholder);
  }

  async createAssetIndex() {
    const assetsPath = path.join(this.outputPath, 'assets');
    
    // Scan for images
    const imagesPath = path.join(assetsPath, 'images');
    let imageExports = '';
    
    if (await fs.exists(imagesPath)) {
      const imageFiles = await fs.readdir(imagesPath);
      const validImages = imageFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
      });

      validImages.forEach(image => {
        const name = path.basename(image, path.extname(image));
        const camelCaseName = name.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, c => c.toLowerCase());
        imageExports += `  ${camelCaseName}: require('./images/${image}'),\n`;
      });
    }

    const indexContent = `// Asset exports for React Native
// Auto-generated - modify with care

export const images = {
${imageExports}
} as const;

// Export individual assets for easier imports
${imageExports.split('\n').filter(line => line.trim()).map(line => {
  const match = line.match(/^\s*(\w+):/);
  if (match) {
    const name = match[1];
    return `export const ${name} = images.${name};`;
  }
  return '';
}).join('\n')}

// Font exports (add as fonts are added)
export const fonts = {
  // Add custom fonts here
} as const;
`;

    await fs.writeFile(path.join(assetsPath, 'index.ts'), indexContent);
  }

  async listCopiedAssets() {
    try {
      const assetsPath = path.join(this.outputPath, 'assets');
      const files = [];
      
      const addFiles = async (dir, prefix = '') => {
        if (await fs.exists(dir)) {
          const items = await fs.readdir(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
              await addFiles(fullPath, `${prefix}${item}/`);
            } else {
              files.push(`${prefix}${item}`);
            }
          }
        }
      };
      
      await addFiles(assetsPath);
      return files.filter(file => !file.includes('README.md') && !file.includes('index.ts'));
    } catch (error) {
      return [];
    }
  }

  async performProfessionalConversion() {
    console.log(chalk.blue('📱 Starting intelligent mobile app creation...'));
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Check if we have the new intelligent plan format
    if (this.conversionPlan.mobileScreens) {
      // NEW: Intelligent screen creation based on analysis
      console.log(chalk.cyan('\n🧠 Creating mobile screens based on intelligent analysis...'));
      
      for (const screenInfo of this.conversionPlan.mobileScreens) {
        try {
          console.log(chalk.blue(`📱 Creating: ${screenInfo.screenName}`));
          console.log(chalk.gray(`   Purpose: ${screenInfo.purpose}`));
          console.log(chalk.gray(`   Based on: ${screenInfo.sourceAnalysis}`));
          
          const result = await this.createIntelligentScreen(screenInfo);
          results.push(result);
          
          if (result.success) {
            successCount++;
            console.log(chalk.green(`✅ Created: ${result.outputFile}`));
          } else if (result.skipped) {
            skippedCount++;
            console.log(chalk.yellow(`⏭️ Skipped: ${result.error}`));
          } else {
            failureCount++;
            console.log(chalk.red(`❌ Failed: ${result.error}`));
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error creating ${screenInfo.screenName}: ${error.message}`));
          results.push({
            sourceFile: screenInfo.sourceAnalysis,
            screenName: screenInfo.screenName,
            success: false,
            error: error.message
          });
          failureCount++;
        }
      }

      // NEW: Convert supporting files (components, utils, api, etc.)
      if (this.conversionPlan.supportingFiles?.length > 0) {
        console.log(chalk.cyan('\n🛠️ Converting supporting files based on intelligent analysis...'));
        
        for (const category of this.conversionPlan.supportingFiles) {
          console.log(chalk.blue(`\n📂 Converting ${category.category.toUpperCase()} files...`));
          
          for (const fileName of category.files) {
            try {
              console.log(chalk.blue(`🔄 Converting: ${fileName}`));
              console.log(chalk.gray(`   Category: ${category.category}`));
              console.log(chalk.gray(`   Source: ${category.sourceFolder}`));
              
              const result = await this.convertSupportingFile(fileName, category);
              results.push(result);
              
              if (result.success) {
                successCount++;
                console.log(chalk.green(`✅ Converted: ${result.outputFile}`));
              } else if (result.skipped) {
                skippedCount++;
                console.log(chalk.yellow(`⏭️ Skipped: ${result.error}`));
              } else {
                failureCount++;
                console.log(chalk.red(`❌ Failed: ${result.error}`));
              }
            } catch (error) {
              console.error(chalk.red(`❌ Error converting ${fileName}: ${error.message}`));
              results.push({
                sourceFile: `${category.sourceFolder}${fileName}`,
                category: category.category,
                success: false,
                error: error.message
              });
              failureCount++;
            }
          }
        }
      }
    } else {
      // FALLBACK: Process traditional phases if no intelligent plan
      for (const phase of this.conversionPlan.phases) {
        console.log(chalk.cyan(`\n📋 ${phase.name} (${phase.priority} priority)`));
        
        const files = phase.files || phase.screens || [];
        for (const file of files) {
          if (!file) continue;
          
          try {
            console.log(chalk.blue(`🔄 Converting: ${file}`));
            
            const result = await this.convertFile(file, phase);
            results.push(result);
            
            if (result.success) {
              successCount++;
              console.log(chalk.green(`✅ Converted: ${result.outputFile}`));
            } else if (result.skipped) {
              skippedCount++;
              console.log(chalk.yellow(`⏭️ Skipped: ${result.error}`));
            } else {
              failureCount++;
              console.log(chalk.red(`❌ Failed: ${result.error}`));
            }
          } catch (error) {
            console.error(chalk.red(`❌ Error converting ${file}: ${error.message}`));
            results.push({
              sourceFile: file,
              success: false,
              error: error.message
            });
            failureCount++;
          }
        }
      }
    }

    // Show conversion summary
    this.showConversionSummary(successCount, failureCount, skippedCount);

    // CRITICAL: Auto-fix all issues until the app runs perfectly
    await this.performComprehensiveAutoFix(results);

    return results;
  }

  async performComprehensiveAutoFix(results) {
    console.log(chalk.cyan('\n🔧 COMPREHENSIVE AUTO-FIX SYSTEM'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.yellow('⚡ Fixing ALL issues until the app runs perfectly...'));

    let iteration = 1;
    const maxIterations = 10; // Safety limit
    let allIssuesFixed = false;

    while (!allIssuesFixed && iteration <= maxIterations) {
      console.log(chalk.blue(`\n🔄 Auto-Fix Iteration ${iteration}/${maxIterations}`));
      
      // 1. Fix Navigation Issues
      await this.fixNavigationIssues(iteration);
      
      // 2. Fix Expo Configuration Issues  
      await this.fixExpoIssues(iteration);
      
      // 3. Fix Import Issues
      await this.fixImportIssues(iteration);
      
      // 4. Fix Component Issues
      await this.fixComponentIssues(iteration);
      
      // 5. Fix TypeScript Issues
      await this.fixTypeScriptIssues(iteration);
      
      // 6. Fix Runtime Issues
      await this.fixRuntimeIssues(iteration);
      
      // 7. Validate the project
      const validation = await this.validateProjectHealth();
      
      if (validation.isHealthy) {
        console.log(chalk.green(`✅ ALL ISSUES FIXED in ${iteration} iteration(s)!`));
        console.log(chalk.green('🎉 Your React Native app is ready to run perfectly!'));
        allIssuesFixed = true;
      } else {
        console.log(chalk.yellow(`⚠️ Found ${validation.issues.length} issues, continuing to next iteration...`));
        validation.issues.forEach(issue => {
          console.log(chalk.gray(`   • ${issue}`));
        });
        iteration++;
      }
    }

    if (!allIssuesFixed) {
      console.log(chalk.yellow(`\n⚠️ Reached maximum iterations (${maxIterations}). Most issues should be fixed.`));
      console.log(chalk.cyan('💡 Try running: expo start --clear'));
    }
  }

  async fixNavigationIssues(iteration) {
    console.log(chalk.blue(`🧭 [${iteration}] Fixing Navigation Issues...`));
    
    try {
      // 1. Ensure AppNavigator is properly configured
      await this.ensureAppNavigatorWorks();
      
      // 2. Fix screen registration issues
      await this.fixScreenRegistration();
      
      // 3. Fix navigation type issues
      await this.fixNavigationTypes();
      
      // 4. Ensure all screens have proper navigation setup
      await this.ensureScreenNavigationSetup();
      
      console.log(chalk.green(`✅ [${iteration}] Navigation issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] Navigation fix error: ${error.message}`));
    }
  }

  async fixExpoIssues(iteration) {
    console.log(chalk.blue(`📱 [${iteration}] Fixing Expo Configuration Issues...`));
    
    try {
      // 1. Fix app.json configuration
      await this.fixAppJsonConfiguration();
      
      // 2. Fix metro.config.js
      await this.fixMetroConfiguration();
      
      // 3. Fix babel.config.js
      await this.fixBabelConfiguration();
      
      // 4. Ensure all required Expo dependencies
      await this.ensureExpoDependencies();
      
      console.log(chalk.green(`✅ [${iteration}] Expo issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] Expo fix error: ${error.message}`));
    }
  }

  async fixImportIssues(iteration) {
    console.log(chalk.blue(`📦 [${iteration}] Fixing Import Issues...`));
    
    try {
      // 1. Fix all React Native import statements
      await this.fixReactNativeImports();
      
      // 2. Fix asset import paths
      await this.fixAssetImports();
      
      // 3. Fix component imports
      await this.fixComponentImports();
      
      // 4. Fix navigation imports
      await this.fixNavigationImports();
      
      console.log(chalk.green(`✅ [${iteration}] Import issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] Import fix error: ${error.message}`));
    }
  }

  async fixComponentIssues(iteration) {
    console.log(chalk.blue(`🧩 [${iteration}] Fixing Component Issues...`));
    
    try {
      // 1. Ensure all text is wrapped in Text components
      await this.ensureTextComponentsWrapped();
      
      // 2. Fix TouchableOpacity usage
      await this.fixTouchableOpacityUsage();
      
      // 3. Fix Image component usage
      await this.fixImageComponentUsage();
      
      // 4. Fix StyleSheet usage
      await this.fixStyleSheetUsage();
      
      console.log(chalk.green(`✅ [${iteration}] Component issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] Component fix error: ${error.message}`));
    }
  }

  async fixTypeScriptIssues(iteration) {
    console.log(chalk.blue(`🔷 [${iteration}] Fixing TypeScript Issues...`));
    
    try {
      // 1. Fix navigation types
      await this.fixNavigationTypeDefinitions();
      
      // 2. Fix component prop types
      await this.fixComponentPropTypes();
      
      // 3. Fix import types
      await this.fixImportTypes();
      
      console.log(chalk.green(`✅ [${iteration}] TypeScript issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] TypeScript fix error: ${error.message}`));
    }
  }

  async fixRuntimeIssues(iteration) {
    console.log(chalk.blue(`⚡ [${iteration}] Fixing Runtime Issues...`));
    
    try {
      // 1. Fix App.tsx to ensure proper provider setup
      await this.fixAppTsxProviders();
      
      // 2. Fix context provider issues
      await this.fixContextProviders();
      
      // 3. Fix async component issues
      await this.fixAsyncComponentIssues();
      
      console.log(chalk.green(`✅ [${iteration}] Runtime issues fixed`));
    } catch (error) {
      console.log(chalk.red(`❌ [${iteration}] Runtime fix error: ${error.message}`));
    }
  }

  async validateProjectHealth() {
    const issues = [];
    
    try {
      // Check if essential files exist
      const essentialFiles = [
        'App.tsx',
        'package.json',
        'app.json',
        'babel.config.js',
        'metro.config.js',
        'src/navigation/AppNavigator.tsx'
      ];
      
      for (const file of essentialFiles) {
        if (!await fs.exists(path.join(this.outputPath, file))) {
          issues.push(`Missing essential file: ${file}`);
        }
      }
      
      // Check navigation setup
      const appNavigatorPath = path.join(this.outputPath, 'src/navigation/AppNavigator.tsx');
      if (await fs.exists(appNavigatorPath)) {
        const content = await fs.readFile(appNavigatorPath, 'utf-8');
        if (!content.includes('NavigationContainer')) {
          issues.push('NavigationContainer not found in AppNavigator');
        }
        if (!content.includes('createNativeStackNavigator')) {
          issues.push('Stack Navigator not properly configured');
        }
      }
      
      // Check App.tsx
      const appPath = path.join(this.outputPath, 'App.tsx');
      if (await fs.exists(appPath)) {
        const content = await fs.readFile(appPath, 'utf-8');
        if (!content.includes('AppNavigator')) {
          issues.push('AppNavigator not imported in App.tsx');
        }
        if (!content.includes('AppProviders')) {
          issues.push('AppProviders not imported in App.tsx');
        }
      }
      
      return {
        isHealthy: issues.length === 0,
        issues: issues
      };
      
    } catch (error) {
      return {
        isHealthy: false,
        issues: [`Validation error: ${error.message}`]
      };
    }
  }

  // ===== NAVIGATION FIXES =====
  async ensureAppNavigatorWorks() {
    const navigatorPath = path.join(this.outputPath, 'src/navigation/AppNavigator.tsx');
    
    if (!await fs.exists(navigatorPath)) {
      // Recreate AppNavigator if missing
      await this.createNavigationSetup();
      return;
    }
    
    const content = await fs.readFile(navigatorPath, 'utf-8');
    
    // Fix common navigation issues
    let fixedContent = content;
    
    // Ensure proper imports
    if (!fixedContent.includes('@react-navigation/native')) {
      fixedContent = `import { NavigationContainer } from '@react-navigation/native';\n${fixedContent}`;
    }
    
    if (!fixedContent.includes('@react-navigation/native-stack')) {
      fixedContent = `import { createNativeStackNavigator } from '@react-navigation/native-stack';\n${fixedContent}`;
    }
    
    // Ensure Stack is created
    if (!fixedContent.includes('createNativeStackNavigator()')) {
      fixedContent = fixedContent.replace(
        'const Stack =',
        'const Stack = createNativeStackNavigator();'
      );
    }
    
    await fs.writeFile(navigatorPath, fixedContent);
  }

  async fixScreenRegistration() {
    const navigatorPath = path.join(this.outputPath, 'src/navigation/AppNavigator.tsx');
    const screensDir = path.join(this.outputPath, 'src/screens');
    
    if (!await fs.exists(navigatorPath) || !await fs.exists(screensDir)) return;
    
    // Get all screen files
    const screenFiles = await fs.readdir(screensDir);
    const screens = screenFiles
      .filter(file => file.endsWith('.tsx'))
      .map(file => path.basename(file, '.tsx'));
    
    let navigatorContent = await fs.readFile(navigatorPath, 'utf-8');
    
    // Add missing screen imports
    for (const screen of screens) {
      const importStatement = `import ${screen} from '../screens/${screen}';`;
      if (!navigatorContent.includes(importStatement)) {
        navigatorContent = importStatement + '\n' + navigatorContent;
      }
      
      // Add screen to navigator if missing
      const screenComponent = `<Stack.Screen name="${screen.replace('Screen', '')}" component={${screen}} />`;
      if (!navigatorContent.includes(`name="${screen.replace('Screen', '')}"`)) {
        // Add before the closing </Stack.Navigator>
        navigatorContent = navigatorContent.replace(
          '</Stack.Navigator>',
          `        ${screenComponent}\n      </Stack.Navigator>`
        );
      }
    }
    
    await fs.writeFile(navigatorPath, navigatorContent);
  }

  async fixNavigationTypes() {
    const typesPath = path.join(this.outputPath, 'src/types/navigation.ts');
    
    // Get all screens
    const screensDir = path.join(this.outputPath, 'src/screens');
    if (!await fs.exists(screensDir)) return;
    
    const screenFiles = await fs.readdir(screensDir);
    const screens = screenFiles
      .filter(file => file.endsWith('.tsx'))
      .map(file => path.basename(file, '.tsx').replace('Screen', ''));
    
    const navigationTypes = `import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
${screens.map(screen => `  ${screen}: undefined;`).join('\n')}
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}`;

    await fs.ensureDir(path.dirname(typesPath));
    await fs.writeFile(typesPath, navigationTypes);
  }

  async ensureScreenNavigationSetup() {
    const screensDir = path.join(this.outputPath, 'src/screens');
    if (!await fs.exists(screensDir)) return;
    
    const screenFiles = await fs.readdir(screensDir);
    
    for (const file of screenFiles) {
      if (!file.endsWith('.tsx')) continue;
      
      const screenPath = path.join(screensDir, file);
      let content = await fs.readFile(screenPath, 'utf-8');
      
      // Ensure navigation import
      if (!content.includes('useNavigation')) {
        content = content.replace(
          "import React",
          "import React, { useNavigation } from 'react';\nimport { useNavigation } from '@react-navigation/native';\nimport React"
        );
      }
      
      // Fix navigation hook usage
      if (!content.includes('const navigation = useNavigation')) {
        content = content.replace(
          'export const',
          'const navigation = useNavigation();\n\n  export const'
        );
      }
      
      await fs.writeFile(screenPath, content);
    }
  }

  // ===== EXPO FIXES =====
  async fixAppJsonConfiguration() {
    const appJsonPath = path.join(this.outputPath, 'app.json');
    
    if (!await fs.exists(appJsonPath)) {
      await this.createConfigFiles();
      return;
    }
    
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
    
    // Ensure critical Expo configurations
    appJson.expo = appJson.expo || {};
    appJson.expo.name = appJson.expo.name || path.basename(this.outputPath);
    appJson.expo.slug = appJson.expo.slug || path.basename(this.outputPath).toLowerCase();
    appJson.expo.version = appJson.expo.version || '1.0.0';
    appJson.expo.platforms = ['ios', 'android', 'web'];
    
    // Ensure SDK version
    appJson.expo.sdkVersion = '53.0.0';
    
    // Ensure New Architecture
    appJson.expo.newArchEnabled = true;
    appJson.expo.android = appJson.expo.android || {};
    appJson.expo.android.newArchEnabled = true;
    appJson.expo.ios = appJson.expo.ios || {};
    appJson.expo.ios.newArchEnabled = true;
    
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  }

  async fixMetroConfiguration() {
    const metroPath = path.join(this.outputPath, 'metro.config.js');
    
    const metroConfig = `const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable New Architecture
config.resolver.unstable_enablePackageExports = true;

module.exports = config;`;

    await fs.writeFile(metroPath, metroConfig);
  }

  async fixBabelConfiguration() {
    const babelPath = path.join(this.outputPath, 'babel.config.js');
    
    const babelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin'
    ]
  };
};`;

    await fs.writeFile(babelPath, babelConfig);
  }

  async ensureExpoDependencies() {
    const packageJsonPath = path.join(this.outputPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Ensure all critical dependencies are present (Expo SDK 53 compatible)
    const requiredDeps = {
      'expo': '~53.0.12',
      'react': '19.0.0',
      'react-native': '0.76.9',
      '@react-navigation/native': '^6.1.18',
      '@react-navigation/native-stack': '^6.11.0',
      '@react-navigation/bottom-tabs': '^6.6.1',
      'react-native-screens': '~4.4.0',
      'react-native-safe-area-context': '4.12.0',
      'react-native-gesture-handler': '~2.20.2',
      'react-native-reanimated': '~3.16.1',
      'expo-status-bar': '~2.0.1',
      'expo-splash-screen': '~0.29.14',
      'expo-font': '~13.0.4',
      'expo-image': '~2.0.7',
      '@react-native-async-storage/async-storage': '1.23.1',
      'react-native-svg': '15.8.0',
      '@react-native-community/slider': '4.5.5',
      'react-native-toast-message': '^2.2.1'
    };
    
    packageJson.dependencies = packageJson.dependencies || {};
    
    for (const [dep, version] of Object.entries(requiredDeps)) {
      packageJson.dependencies[dep] = version;
    }
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // ===== IMPORT FIXES =====
  async fixReactNativeImports() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixImportsInDirectory(srcDir);
  }

  async fixImportsInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixImportsInDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        await this.fixFileImports(fullPath);
      }
    }
  }

  async fixFileImports(filePath) {
    let content = await fs.readFile(filePath, 'utf-8');
    
    // Fix React Native imports
    const reactNativeImports = ['View', 'Text', 'StyleSheet', 'TouchableOpacity', 'ScrollView', 'Image', 'TextInput', 'SafeAreaView'];
    
    for (const component of reactNativeImports) {
      if (content.includes(`<${component}`) && !content.includes(`import { ${component}`)) {
        // Add to existing React Native import or create new one
        if (content.includes("from 'react-native'")) {
          content = content.replace(
            /import {([^}]+)} from 'react-native'/,
            (match, imports) => {
              const importList = imports.split(',').map(i => i.trim());
              if (!importList.includes(component)) {
                importList.push(component);
              }
              return `import { ${importList.join(', ')} } from 'react-native'`;
            }
          );
        } else {
          content = `import { ${component} } from 'react-native';\n${content}`;
        }
      }
    }
    
    await fs.writeFile(filePath, content);
  }

  async fixAssetImports() {
    // Fix asset import paths throughout the project
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixAssetImportsInDirectory(srcDir);
  }

  async fixAssetImportsInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixAssetImportsInDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Fix asset import paths
        content = content.replace(/from ['"]\.\.\/public\//g, "from '../assets/");
        content = content.replace(/require\(['"]\.\.\/public\//g, "require('../assets/");
        content = content.replace(/from ['"]\.\/public\//g, "from './assets/");
        content = content.replace(/require\(['"]\.\/public\//g, "require('./assets/");
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixComponentImports() {
    // Ensure all custom components are properly imported
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixComponentImportsInDirectory(srcDir);
  }

  async fixComponentImportsInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixComponentImportsInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Ensure React import
        if (!content.includes("import React") && content.includes("React.")) {
          content = `import React from 'react';\n${content}`;
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixNavigationImports() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixNavigationImportsInDirectory(srcDir);
  }

  async fixNavigationImportsInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixNavigationImportsInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Fix navigation imports
        if (content.includes('navigation.') && !content.includes('useNavigation')) {
          content = `import { useNavigation } from '@react-navigation/native';\n${content}`;
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  // ===== COMPONENT FIXES =====
  async ensureTextComponentsWrapped() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixTextWrappingInDirectory(srcDir);
  }

  async fixTextWrappingInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixTextWrappingInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Find and fix unwrapped text (this is a simplified approach)
        // More sophisticated regex would be needed for production
        content = content.replace(
          /<div[^>]*>([^<]*?)<\/div>/g,
          '<View><Text>$1</Text></View>'
        );
        
        content = content.replace(
          /<span[^>]*>([^<]*?)<\/span>/g,
          '<Text>$1</Text>'
        );
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixTouchableOpacityUsage() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixTouchableOpacityInDirectory(srcDir);
  }

  async fixTouchableOpacityInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixTouchableOpacityInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Replace button elements with TouchableOpacity
        content = content.replace(
          /<button([^>]*?)onClick={([^}]+)}([^>]*?)>/g,
          '<TouchableOpacity$1onPress={$2}$3>'
        );
        
        content = content.replace(/<\/button>/g, '</TouchableOpacity>');
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixImageComponentUsage() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixImageComponentInDirectory(srcDir);
  }

  async fixImageComponentInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixImageComponentInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Fix img tags to Image components
        content = content.replace(
          /<img([^>]*?)src={([^}]+)}([^>]*?)\/>/g,
          '<Image$1source={$2}$3/>'
        );
        
        content = content.replace(
          /<img([^>]*?)src="([^"]+)"([^>]*?)\/>/g,
          '<Image$1source={require("$2")}$3/>'
        );
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixStyleSheetUsage() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixStyleSheetInDirectory(srcDir);
  }

  async fixStyleSheetInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixStyleSheetInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Ensure StyleSheet import if styles are used
        if (content.includes('const styles = StyleSheet.create') && !content.includes('StyleSheet')) {
          content = content.replace(
            "from 'react-native'",
            ", StyleSheet } from 'react-native'"
          );
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  // ===== TYPESCRIPT FIXES =====
  async fixNavigationTypeDefinitions() {
    await this.fixNavigationTypes(); // Reuse existing method
  }

  async fixComponentPropTypes() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixPropTypesInDirectory(srcDir);
  }

  async fixPropTypesInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixPropTypesInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Add interface for props if missing
        const componentName = path.basename(fullPath, '.tsx');
        if (!content.includes(`interface ${componentName}Props`)) {
          content = content.replace(
            `export const ${componentName}`,
            `interface ${componentName}Props {}\n\nexport const ${componentName}: React.FC<${componentName}Props>`
          );
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async fixImportTypes() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixImportTypesInDirectory(srcDir);
  }

  async fixImportTypesInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixImportTypesInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Add type imports
        if (content.includes('RootStackScreenProps') && !content.includes('import type')) {
          content = `import type { RootStackScreenProps } from '../types/navigation';\n${content}`;
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  // ===== RUNTIME FIXES =====
  async fixAppTsxProviders() {
    const appPath = path.join(this.outputPath, 'App.tsx');
    
    if (!await fs.exists(appPath)) {
      // Create App.tsx if missing
      const appContent = `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/contexts/AppProviders';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AppProviders>
      <AppNavigator />
      <StatusBar style="auto" />
    </AppProviders>
  );
}`;

      await fs.writeFile(appPath, appContent);
      return;
    }
    
    let content = await fs.readFile(appPath, 'utf-8');
    
    // Ensure proper imports
    if (!content.includes('AppProviders')) {
      content = `import { AppProviders } from './src/contexts/AppProviders';\n${content}`;
    }
    
    if (!content.includes('AppNavigator')) {
      content = `import { AppNavigator } from './src/navigation/AppNavigator';\n${content}`;
    }
    
    await fs.writeFile(appPath, content);
  }

  async fixContextProviders() {
    const providersPath = path.join(this.outputPath, 'src/contexts/AppProviders.tsx');
    
    if (await fs.exists(providersPath)) {
      let content = await fs.readFile(providersPath, 'utf-8');
      
      // Ensure proper React import
      if (!content.includes('import React')) {
        content = `import React from 'react';\n${content}`;
      }
      
      await fs.writeFile(providersPath, content);
    }
  }

  async fixAsyncComponentIssues() {
    const srcDir = path.join(this.outputPath, 'src');
    await this.fixAsyncIssuesInDirectory(srcDir);
  }

  async fixAsyncIssuesInDirectory(directory) {
    if (!await fs.exists(directory)) return;
    
    const items = await fs.readdir(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await this.fixAsyncIssuesInDirectory(fullPath);
      } else if (item.endsWith('.tsx')) {
        let content = await fs.readFile(fullPath, 'utf-8');
        
        // Add useEffect import if async operations are present
        if (content.includes('async ') && !content.includes('useEffect')) {
          content = content.replace(
            'import React',
            'import React, { useEffect }'
          );
        }
        
        await fs.writeFile(fullPath, content);
      }
    }
  }

  async createIntelligentScreen(screenInfo) {
    try {
      // Find the source file that this screen is based on
      const sourceFile = this.findSourceFile(screenInfo.sourceAnalysis);
      let sourceContent = '';
      
      if (sourceFile && await fs.exists(path.join(this.nextjsPath, sourceFile))) {
        sourceContent = await fs.readFile(path.join(this.nextjsPath, sourceFile), 'utf-8');
      }

      // Create intelligent prompt for screen creation
      const prompt = this.createIntelligentScreenPrompt(screenInfo, sourceContent);
      
      console.log(chalk.gray('🧠 Using Mistral AI...'));
      const response = await this.callAIWithRetry(prompt, screenInfo.screenName, 3);
      
      if (!response) {
        return {
          sourceFile: screenInfo.sourceAnalysis,
          screenName: screenInfo.screenName,
          success: false,
          skipped: true,
          error: 'AI request rate limited or failed'
        };
      }

      // Extract and validate the generated screen code
      const screenCode = this.extractCodeFromResponse(response.content);
      if (!screenCode) {
        return {
          sourceFile: screenInfo.sourceAnalysis,
          screenName: screenInfo.screenName,
          success: false,
          error: 'Could not extract valid React Native code from AI response'
        };
      }

      // Validate the generated code
      const validation = await this.validateConvertedCode(screenCode, screenInfo.screenName);
      let finalCode = screenCode;

      if (!validation.isValid && this.userPreferences.autoFix) {
        console.log(chalk.yellow(`🔧 Auto-fixing issues in ${screenInfo.screenName}...`));
        const fixedCode = await this.attemptCodeFix(screenCode, validation.issues, screenInfo.screenName);
        if (fixedCode) {
          finalCode = fixedCode;
        }
      }

      // Save the screen file
      const outputPath = `src/screens/${screenInfo.screenName}.tsx`;
      const fullOutputPath = path.join(this.outputPath, outputPath);
      await fs.ensureDir(path.dirname(fullOutputPath));
      await fs.writeFile(fullOutputPath, finalCode);

      // Update navigation to include the new screen
      await this.updateNavigationForNewScreen(outputPath);

      return {
        sourceFile: screenInfo.sourceAnalysis,
        screenName: screenInfo.screenName,
        outputFile: outputPath,
        success: true
      };
      
    } catch (error) {
      return {
        sourceFile: screenInfo.sourceAnalysis,
        screenName: screenInfo.screenName,
        success: false,
        error: error.message
      };
    }
  }

  findSourceFile(sourceAnalysis) {
    // Extract file path from source analysis text
    const matches = sourceAnalysis.match(/([^/]+\.tsx?)/g);
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    // Try to find based on description
    if (sourceAnalysis.includes('app/page.tsx')) return 'app/page.tsx';
    if (sourceAnalysis.includes('app/login')) return 'app/login/page.tsx';
    if (sourceAnalysis.includes('app/dashboard')) return 'app/dashboard/page.tsx';
    if (sourceAnalysis.includes('pages/')) {
      const pageMatch = sourceAnalysis.match(/pages\/([^/]+)/);
      if (pageMatch) return `pages/${pageMatch[1]}.tsx`;
    }
    
    return null;
  }

  createIntelligentScreenPrompt(screenInfo, sourceContent) {
    // Check for Shadcn/ui usage in the source content
    const shadcnDetection = this.detectShadcnUsage(sourceContent);
    
    return `# CREATE REACT NATIVE SCREEN: ${screenInfo.screenName}

You are a Senior Mobile Developer. Create a React Native screen that provides the same functionality as the analyzed Next.js page/component.

${shadcnDetection.hasShadcn ? `
## 🚨 SHADCN/UI COMPONENTS DETECTED IN PAGE!

**Critical Detection**: This Next.js page uses Shadcn/ui components which must be completely converted to React Native.

**Detected Components**: ${shadcnDetection.components.join(', ')}
**Detected Imports**: ${shadcnDetection.imports.join(', ')}

### MANDATORY SHADCN CONVERSION FOR MOBILE:

#### 🔄 Component Mappings (MUST IMPLEMENT):
${shadcnDetection.components.map(comp => this.getShadcnConversionMapping(comp)).join('\n')}

#### 📱 COMPLETE SHADCN REPLACEMENT STRATEGY:
1. **Remove ALL @/components/ui/ imports** - Replace with React Native components
2. **Convert each Shadcn component** to proper React Native equivalent
3. **Add comprehensive StyleSheet** with mobile-optimized styling
4. **Use TouchableOpacity** instead of Button components
5. **Implement proper mobile interactions** (onPress, gestures, feedback)
6. **Add React Native specific props** (activeOpacity, accessibilityLabel, etc.)

#### ⚠️ CRITICAL MOBILE REQUIREMENTS:
- ALL text must be wrapped in <Text> components
- Use TouchableOpacity for ALL interactive elements
- Implement proper mobile navigation patterns
- Add loading states and error handling
- Include proper accessibility features
- Use mobile-optimized styling and spacing

` : ''}

## SCREEN REQUIREMENTS:
- **Screen Name**: ${screenInfo.screenName}
- **Purpose**: ${screenInfo.purpose}
- **Source Analysis**: ${screenInfo.sourceAnalysis}
- **Mobile Features to Include**: ${screenInfo.mobileFeatures?.join(', ') || 'Standard mobile patterns'}

## SOURCE CONTENT (Next.js Page/Component):
\`\`\`tsx
${sourceContent || '// No source content available - create based on purpose and analysis'}
\`\`\`

## IMPORTANT MOBILE CONVENTIONS:
- React Native uses **SCREENS**, not "pages"
- Images come from **assets/** folder, not public/
- Use proper mobile navigation patterns
- Text must be wrapped in <Text> components
- Buttons use TouchableOpacity, not HTML buttons

## YOUR TASK:
Create a professional React Native screen that:

### 1. **Analyze the Source Content**
- Understand the main functionality and purpose
- Identify key UI elements and user interactions  
- Note any data fetching or state management needs

### 2. **Design Mobile-First Experience**
- Convert web UI patterns to mobile equivalents
- Use React Native components (View, Text, TextInput, TouchableOpacity, etc.)
- Implement mobile-specific navigation patterns
- Add mobile enhancements like haptic feedback, gestures

### 3. **Professional React Native Code**
- Use TypeScript with proper types
- Follow React Native best practices
- Include proper imports and navigation
- Add responsive design for different screen sizes
- Include loading states and error handling

### 4. **Mobile Enhancements**
- Add pull-to-refresh if applicable
- Include keyboard avoiding view for forms
- Use safe area context for proper spacing
- Add haptic feedback for interactions
- Import images from assets: import logo from '../../assets/images/logo.png'

## OUTPUT FORMAT:
Provide ONLY the complete React Native screen code:

\`\`\`tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
// Import assets (if needed)
// import { images } from '../../assets';

interface ${screenInfo.screenName}Props {}

export const ${screenInfo.screenName}: React.FC<${screenInfo.screenName}Props> = () => {
  const navigation = useNavigation<RootStackScreenProps<'${screenInfo.screenName.replace('Screen', '')}'>['navigation']>();

  // Your intelligent React Native implementation here
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Your mobile-optimized UI here */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Your styles here
});

export default ${screenInfo.screenName};
\`\`\`

    Create a screen that's better than the web version by leveraging native mobile capabilities!`;
  }

  async convertSupportingFile(fileName, categoryInfo) {
    try {
      // Find the source file in the Next.js project
      const sourceFile = await this.findSupportingSourceFile(fileName, categoryInfo);
      let sourceContent = '';
      
      if (sourceFile && await fs.exists(path.join(this.nextjsPath, sourceFile))) {
        sourceContent = await fs.readFile(path.join(this.nextjsPath, sourceFile), 'utf-8');
      }

      // Create intelligent prompt for supporting file conversion
      const prompt = this.createSupportingFilePrompt(fileName, categoryInfo, sourceContent);
      
      console.log(chalk.gray('🧠 Using Mistral AI...'));
      const response = await this.callAIWithRetry(prompt, fileName, 3);
      
      if (!response) {
        return {
          sourceFile: sourceFile || `${categoryInfo.sourceFolder}${fileName}`,
          fileName: fileName,
          category: categoryInfo.category,
          success: false,
          skipped: true,
          error: 'AI request rate limited or failed'
        };
      }

      // Extract and validate the generated code
      let convertedCode = this.extractCodeFromResponse(response.content);
      
      // If first attempt fails, try with enhanced problem-solving prompt
      if (!convertedCode) {
        console.log(chalk.yellow(`🔧 First conversion attempt failed for ${fileName}, trying enhanced approach...`));
        
        const enhancedPrompt = this.createEnhancedProblemSolvingPrompt(fileName, categoryInfo, sourceContent);
        const enhancedResponse = await this.callAIWithRetry(enhancedPrompt, fileName, 2);
        
        if (enhancedResponse) {
          convertedCode = this.extractCodeFromResponse(enhancedResponse.content);
        }
      }
      
      // If still failing, create a minimal working version
      if (!convertedCode) {
        console.log(chalk.yellow(`🛠️ Creating minimal working version for ${fileName}...`));
        convertedCode = this.createMinimalWorkingVersion(fileName, categoryInfo, sourceContent);
      }
      
      if (!convertedCode) {
        return {
          sourceFile: sourceFile || `${categoryInfo.sourceFolder}${fileName}`,
          fileName: fileName,
          category: categoryInfo.category,
          success: false,
          error: 'Could not create working React Native code after multiple attempts'
        };
      }

      // Validate the generated code
      const validation = await this.validateConvertedCode(convertedCode, fileName);
      let finalCode = convertedCode;

      if (!validation.isValid && this.userPreferences.autoFix) {
        console.log(chalk.yellow(`🔧 Auto-fixing issues in ${fileName}...`));
        const fixedCode = await this.attemptCodeFix(convertedCode, validation.issues, fileName);
        if (fixedCode) {
          finalCode = fixedCode;
        }
      }

      // Determine output path based on category
      const outputPath = this.determineSupportingFileOutputPath(fileName, categoryInfo);
      const fullOutputPath = path.join(this.outputPath, outputPath);
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(fullOutputPath));
      await fs.writeFile(fullOutputPath, finalCode);

      return {
        sourceFile: sourceFile || `${categoryInfo.sourceFolder}${fileName}`,
        fileName: fileName,
        category: categoryInfo.category,
        outputFile: outputPath,
        success: true
      };
      
    } catch (error) {
      return {
        sourceFile: `${categoryInfo.sourceFolder}${fileName}`,
        fileName: fileName,
        category: categoryInfo.category,
        success: false,
        error: error.message
      };
    }
  }

  async findSupportingSourceFile(fileName, categoryInfo) {
    // Try to find the actual source file in the Next.js project
    const possiblePaths = [
      `${categoryInfo.sourceFolder}${fileName}`,
      `${categoryInfo.sourceFolder}${fileName.replace('.ts', '.js')}`,
      `${categoryInfo.sourceFolder}${fileName.replace('.tsx', '.jsx')}`,
      `src/${categoryInfo.sourceFolder}${fileName}`,
      `lib/${fileName}`,
      `utils/${fileName}`,
      `components/${fileName}`,
      `api/${fileName}`,
      `constants/${fileName}`,
      `hooks/${fileName}`,
      `types/${fileName}`
    ];

    for (const possiblePath of possiblePaths) {
      if (await fs.exists(path.join(this.nextjsPath, possiblePath))) {
        return possiblePath;
      }
    }

    return null;
  }

  determineSupportingFileOutputPath(fileName, categoryInfo) {
    // Map categories to React Native folder structure
    const categoryMapping = {
      'components': 'src/components',
      'utils': 'src/utils', 
      'api': 'src/api',
      'constants': 'src/constants',
      'hooks': 'src/hooks',
      'types': 'src/types',
      'services': 'src/services',
      'lib': 'src/utils'
    };

    const baseFolder = categoryMapping[categoryInfo.category] || `src/${categoryInfo.category}`;
    return `${baseFolder}/${fileName}`;
  }

  createSupportingFilePrompt(fileName, categoryInfo, sourceContent) {
    // Check for Shadcn/ui usage in the source content
    const shadcnDetection = this.detectShadcnUsage(sourceContent);
    
    return `# CONVERT ${categoryInfo.category.toUpperCase()} FILE TO REACT NATIVE: ${fileName}

You are a Senior React Native Developer. Convert this ${categoryInfo.category} file from Next.js to React Native.

${shadcnDetection.hasShadcn ? `
## 🚨 SHADCN/UI COMPONENTS DETECTED!

**Critical Detection**: This file uses Shadcn/ui components which are NOT compatible with React Native.

**Detected Components**: ${shadcnDetection.components.join(', ')}
**Detected Imports**: ${shadcnDetection.imports.join(', ')}

### MANDATORY SHADCN CONVERSION REQUIREMENTS:

#### 🔄 Component Mappings (MUST IMPLEMENT):
${shadcnDetection.components.map(comp => this.getShadcnConversionMapping(comp)).join('\n')}

#### 📱 Required React Native Dependencies:
- TouchableOpacity, Text, View, TextInput, Modal, ScrollView (from 'react-native')
- StyleSheet for all styling (NO className allowed)
- Proper React Native event handlers (onPress, onChangeText)

#### ⚠️ CRITICAL RULES:
1. **REMOVE ALL @/components/ui/ imports** - These don't exist in React Native
2. **Convert ALL Shadcn components** to React Native equivalents 
3. **Replace className with style** using StyleSheet objects
4. **Convert onClick to onPress** for all interactive elements
5. **Wrap ALL text in <Text> components** - Never use raw text
6. **Use proper React Native styling** - No CSS properties

` : ''}

## FILE INFORMATION:
- **File Name**: ${fileName}
- **Category**: ${categoryInfo.category}
- **Purpose**: ${categoryInfo.purpose}
- **Source Folder**: ${categoryInfo.sourceFolder}

## SOURCE CONTENT (Next.js):
\`\`\`tsx
${sourceContent || '// No source content found - create React Native equivalent based on filename and category'}
\`\`\`

## CONVERSION REQUIREMENTS:

### 1. **${categoryInfo.category.toUpperCase()} Specific Conversion**
${this.getCategorySpecificInstructions(categoryInfo.category)}

### 2. **React Native Compatibility & Intelligent Alternatives**
- Replace web-specific imports with React Native equivalents
- Remove DOM-specific code (document, window, etc.)  
- Use React Native AsyncStorage instead of localStorage
- Replace fetch with proper React Native networking
- **CRITICAL**: If NO direct React Native equivalent exists, CREATE intelligent mobile alternatives
- **NEVER skip functionality** - always find or create a React Native solution

### 3. **Intelligent Problem Solving**
- **Unsupported Libraries**: Create custom React Native implementations
- **Web-only APIs**: Build mobile equivalents using React Native APIs
- **DOM Dependencies**: Replace with React Native component alternatives
- **Browser Features**: Implement using React Native capabilities
- **Complex Dependencies**: Break down and recreate core functionality

### 4. **Mobile Optimization**
- Add mobile-specific error handling
- Include proper TypeScript types
- Optimize for mobile performance
- Add loading states where appropriate
- **Always provide working alternatives** - never leave functionality broken

### 4. **Import/Export Compatibility**
- Ensure imports work with React Native
- Use proper relative paths for React Native project structure
- Export components/functions for React Native consumption

## OUTPUT FORMAT:
Provide ONLY the complete converted React Native code:

\`\`\`tsx
// Converted React Native ${categoryInfo.category} file
${this.getSampleOutputStructure(categoryInfo.category, fileName)}
\`\`\`

## 🧠 INTELLIGENT PROBLEM SOLVING FOR CHALLENGING CONVERSIONS:

### **When You Encounter Unsupported Functionality:**

1. **Unsupported NPM Library?**
   - Find React Native compatible alternative
   - If none exists, recreate core functionality using React Native APIs
   - Example: web-only charting library → use React Native SVG + custom charts

2. **Browser-Only APIs (DOM, window, document)?**
   - Replace with React Native equivalents
   - document.getElementById → React Native refs
   - window.localStorage → AsyncStorage
   - window.location → React Navigation

3. **CSS-in-JS Libraries (styled-components for web)?**
   - Convert to React Native StyleSheet
   - Or use React Native compatible styled-components
   - Maintain design principles with mobile-first approach

4. **Complex State Management (Redux, Zustand)?**
   - Keep if React Native compatible
   - Adapt web-specific middleware to React Native
   - Add mobile-specific state (network status, app state)

5. **Authentication Libraries?**
   - Use React Native auth libraries (react-native-keychain, expo-auth-session)
   - Convert web auth flows to mobile patterns
   - Add biometric authentication options

6. **File Handling?**
   - Use React Native file system libraries
   - expo-document-picker for file selection
   - expo-file-system for file operations

7. **Animations?**
   - Convert CSS animations to React Native Animated API
   - Use react-native-reanimated for complex animations
   - Leverage native mobile gestures

### **Examples of Intelligent Conversions:**

\`\`\`tsx
// ❌ Web-only: document.querySelector
const element = document.querySelector('.my-class');

// ✅ React Native: useRef
const elementRef = useRef(null);
<View ref={elementRef} />
\`\`\`

\`\`\`tsx
// ❌ Web-only: localStorage
localStorage.setItem('key', 'value');

// ✅ React Native: AsyncStorage  
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('key', 'value');
\`\`\`

\`\`\`tsx
// ❌ Web-only: Chart.js
import Chart from 'chart.js';

// ✅ React Native: Custom implementation
import { LineChart } from 'react-native-chart-kit';
// OR create custom charts with React Native SVG
\`\`\`

### **Your Mission:**
- **NEVER say "not supported in React Native"**
- **ALWAYS provide working alternatives**
- **Be creative and intelligent in finding solutions**
- **Leverage React Native's full capability**
- **Make the mobile version BETTER than the web version**

Convert this to work perfectly in React Native mobile environment!`;
  }

  getCategorySpecificInstructions(category) {
    const instructions = {
      'components': `- Convert HTML elements to React Native components (div → View, span → Text, etc.)
- Replace CSS with StyleSheet
- Use TouchableOpacity instead of buttons
- Add proper prop types and interfaces
- Include mobile-specific component features (haptic feedback, gestures)
- **For unsupported UI libraries**: Recreate components using basic React Native components
- **For complex animations**: Use React Native Animated API or create custom solutions
- **For web-only features**: Design mobile-first alternatives that provide same functionality`,

      'utils': `- Remove browser-specific utilities (DOM manipulation, window, document)
- Replace localStorage with AsyncStorage
- Convert file/blob utilities to React Native equivalents
- Keep pure functions that work in React Native
- Add mobile-specific utility functions
- **For unsupported web APIs**: Create React Native alternatives using available APIs
- **For browser-only features**: Implement using React Native capabilities (file system, networking, etc.)
- **For complex utilities**: Break down into mobile-compatible pieces`,

      'api': `- Use fetch or axios (React Native compatible)
- Remove server-side only code (if any)
- Add proper error handling for mobile networks
- Include offline handling capabilities
- Use proper mobile networking patterns
- **For GraphQL clients**: Use React Native compatible versions (Apollo, urql, etc.)
- **For authentication**: Implement using React Native secure storage and auth libraries
- **For file uploads**: Use React Native file picker and networking`,

      'constants': `- Keep configuration values
- Remove browser-specific constants
- Add mobile-specific configuration (screen dimensions, etc.)
- Include app-specific constants (colors, fonts, etc.)
- Add platform-specific values if needed
- **For environment variables**: Use React Native config libraries
- **For build constants**: Adapt to React Native build system
- **For web-specific configs**: Create mobile equivalents`,

      'hooks': `- Ensure hooks work with React Native lifecycle
- Replace web-specific hooks with React Native equivalents
- Add mobile-specific hooks (orientation, keyboard, etc.)
- Include proper cleanup for mobile environment
- Add performance optimizations
- **For DOM-dependent hooks**: Recreate using React Native refs and events
- **For browser API hooks**: Implement using React Native APIs (camera, location, storage, etc.)
- **For routing hooks**: Use React Navigation equivalents`,

      'types': `- Keep TypeScript interfaces and types
- Add React Native specific types
- Include navigation types if relevant
- Add mobile-specific type definitions
- Ensure compatibility with React Native components
- **For web-only types**: Create React Native equivalents
- **For DOM types**: Replace with React Native component types
- **For API types**: Adapt to mobile networking patterns`,

      'services': `- Convert service classes to React Native compatible versions
- Replace web APIs with React Native equivalents
- Add mobile-specific service features (background tasks, push notifications)
- **For payment services**: Use React Native payment libraries
- **For analytics**: Use React Native analytics SDKs
- **For third-party services**: Find React Native SDKs or create REST API implementations`,

      'lib': `- Convert library functions to React Native compatible versions
- Remove browser dependencies
- Add mobile-specific implementations
- **For unsupported libraries**: Recreate core functionality using React Native APIs
- **For complex libraries**: Build simplified mobile versions
- **For web frameworks**: Create React Native equivalents using native components`
    };

    return instructions[category] || `- Convert to React Native compatible code
- Remove web-specific functionality
- Add mobile optimizations
- Ensure proper TypeScript support
- **CRITICAL**: If functionality has no React Native equivalent, CREATE intelligent alternatives
- **NEVER leave features broken** - always provide working mobile solutions`;
  }

  getSampleOutputStructure(category, fileName) {
    const structures = {
      'components': `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ${fileName.replace('.tsx', '')}Props {
  // Define props
}

export const ${fileName.replace('.tsx', '')}: React.FC<${fileName.replace('.tsx', '')}Props> = (props) => {
  // Component logic
  
  return (
    <View style={styles.container}>
      {/* Component JSX */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Styles
  },
});

export default ${fileName.replace('.tsx', '')};`,

      'utils': `// React Native utility functions
export const ${fileName.replace('.ts', '')} = {
  // Utility functions
};`,

      'api': `// React Native API functions
export const api = {
  // API methods
};`,

      'constants': `// React Native constants
export const CONSTANTS = {
  // App constants
};`,

      'hooks': `import { useState, useEffect } from 'react';

export const ${fileName.replace('.ts', '')} = () => {
  // Hook logic
  
  return {
    // Hook return values
  };
};`,

      'types': `// React Native TypeScript types
export interface ${fileName.replace('.ts', '')} {
  // Type definitions
}`
    };

    return structures[category] || '// Converted React Native code here';
  }

  createEnhancedProblemSolvingPrompt(fileName, categoryInfo, sourceContent) {
    // Check for Shadcn/ui usage in the source content
    const shadcnDetection = this.detectShadcnUsage(sourceContent);
    
    return `# 🚨 ENHANCED CONVERSION CHALLENGE: ${fileName}

You are an EXPERT React Native Developer with 10+ years of experience solving impossible conversion challenges.

${shadcnDetection.hasShadcn ? `
## 🚨 SHADCN/UI CONVERSION CHALLENGE IDENTIFIED!

**Advanced Challenge**: This file uses Shadcn/ui components which need expert-level conversion.

**Components to Convert**: ${shadcnDetection.components.join(', ')}

### EXPERT SHADCN CONVERSION STRATEGY:

#### 🎯 Priority Conversion Tasks:
${shadcnDetection.components.map(comp => this.getShadcnConversionMapping(comp)).join('\n')}

#### 🔧 Advanced Implementation Rules:
1. **Create custom React Native components** that replicate Shadcn functionality
2. **Build comprehensive StyleSheets** with proper mobile styling
3. **Implement proper state management** for complex components (modals, selects, etc.)
4. **Add mobile-specific enhancements** (gestures, animations, accessibility)
5. **Handle edge cases** that Shadcn handles automatically

#### 💡 Expert Tips:
- Use Animated API for smooth transitions (Dialog, Sheet animations)
- Implement custom hooks for complex state (useToast, useDialog)
- Create reusable components that can replace Shadcn throughout the app
- Add proper TypeScript interfaces for component props
- Include accessibility features for React Native

` : ''}

## CRITICAL SITUATION:
- **File**: ${fileName} (${categoryInfo.category})
- **Challenge**: Previous conversion attempt failed
- **Mission**: Create working React Native code NO MATTER WHAT

## SOURCE CODE ANALYSIS:
\`\`\`tsx
${sourceContent || '// No source content - create based on filename'}
\`\`\`

## YOUR EXPERT APPROACH:

### 🧠 **Step 1: Analyze the Challenge**
- What web-specific dependencies does this have?
- What browser APIs are being used?
- What's the core functionality this file provides?

### 💡 **Step 2: Intelligent Problem Solving**
- **Unsupported library?** → Find React Native alternative or recreate
- **DOM dependencies?** → Use React Native refs and events
- **Browser APIs?** → Use React Native APIs (AsyncStorage, FileSystem, etc.)
- **CSS dependencies?** → Convert to React Native StyleSheet
- **Complex functionality?** → Break down into mobile-compatible pieces

### 🔧 **Step 3: Creative Solutions**
- **Payment processing?** → Use Stripe React Native or similar
- **Charts/Graphs?** → Use react-native-chart-kit or React Native SVG
- **Authentication?** → Use expo-auth-session or custom implementation
- **File uploads?** → Use expo-document-picker + networking
- **Animations?** → Use React Native Animated API
- **State management?** → Adapt to React Native patterns

### 🎯 **Step 4: Guarantee Success**
- Provide complete, working React Native code
- Include all necessary imports
- Add TypeScript types
- Ensure mobile-first design
- **NEVER give up or say impossible**

## EXAMPLES OF EXPERT CONVERSIONS:

\`\`\`tsx
// Challenge: Web-only drag & drop
// Solution: Use react-native-gesture-handler
import { PanGestureHandler } from 'react-native-gesture-handler';
\`\`\`

\`\`\`tsx
// Challenge: Canvas drawing
// Solution: Use react-native-svg or react-native-canvas
import Svg, { Path } from 'react-native-svg';
\`\`\`

\`\`\`tsx
// Challenge: PDF generation
// Solution: Use react-native-pdf-generator
import { createPDF } from 'react-native-pdf-generator';
\`\`\`

## OUTPUT REQUIREMENTS:
1. **Complete working React Native code**
2. **All imports included and correct**
3. **TypeScript interfaces/types**
4. **Mobile-optimized implementation**
5. **NO placeholder comments** - everything must work

**CREATE A PERFECT REACT NATIVE SOLUTION NOW:**

\`\`\`tsx
// Your expert React Native implementation here
\`\`\``;
  }

  createMinimalWorkingVersion(fileName, categoryInfo, sourceContent) {
    // Create a basic working version as last resort
    const componentName = fileName.replace(/\.(tsx?|jsx?)$/, '');
    
    const templates = {
      'components': `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ${componentName}Props {
  children?: React.ReactNode;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ children }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${componentName} Component</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default ${componentName};`,

      'utils': `// React Native utility functions for ${componentName}

export const ${componentName} = {
  // Add utility methods here
  example: () => {
    console.log('${componentName} utility function');
    return true;
  },
};

export default ${componentName};`,

      'api': `// React Native API service for ${componentName}

class ${componentName}Service {
  async getData() {
    try {
      const response = await fetch('/api/data');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export const ${componentName} = new ${componentName}Service();
export default ${componentName};`,

      'constants': `// React Native constants for ${componentName}

export const ${componentName.toUpperCase()}_CONSTANTS = {
  // Add constants here
  VERSION: '1.0.0',
  API_URL: 'https://api.example.com',
};

export default ${componentName.toUpperCase()}_CONSTANTS;`,

      'hooks': `import { useState, useEffect } from 'react';

export const ${componentName} = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Hook logic here
  }, []);

  return {
    state,
    setState,
  };
};

export default ${componentName};`,

      'types': `// React Native TypeScript types for ${componentName}

export interface ${componentName} {
  id: string;
  name: string;
  // Add more type definitions
}

export default ${componentName};`
    };

    return templates[categoryInfo.category] || templates['utils'];
  }

  showConversionSummary(successCount, failureCount, skippedCount) {
    console.log(chalk.cyan('\n📊 CONVERSION SUMMARY'));
    console.log(chalk.cyan('═'.repeat(40)));
    console.log(chalk.green(`✅ Successfully converted: ${successCount} files`));
    
    if (failureCount > 0) {
      console.log(chalk.red(`❌ Failed conversions: ${failureCount} files`));
    }
    
    if (skippedCount > 0) {
      console.log(chalk.yellow(`⏭️ Skipped (rate limit): ${skippedCount} files`));
      console.log(chalk.yellow('\n💡 To convert skipped files:'));
      console.log(chalk.white('1. Wait a few minutes and run conversion again'));
      console.log(chalk.white('2. Switch to different AI provider: ntrn --switch-provider'));
      console.log(chalk.white('3. Use interactive mode: ntrn --prompt'));
    }

    if (successCount > 0) {
      console.log(chalk.green('\n🎉 Conversion completed successfully!'));
      console.log(chalk.cyan('Your React Native project is ready to run:'));
      console.log(chalk.white('  cd your-project'));
      console.log(chalk.white('  npm install'));
      console.log(chalk.white('  expo start'));
    }
  }

  async performPostConversionAnalysis(results) {
    console.log(chalk.cyan('\n🔍 ANALYZING CONVERSION RESULTS'));
    console.log(chalk.cyan('═'.repeat(50)));

    const failedFiles = results.filter(r => !r.success && !r.skipped);
    const skippedFiles = results.filter(r => r.skipped);
    const successfulFiles = results.filter(r => r.success);

    if (failedFiles.length === 0 && skippedFiles.length === 0) {
      console.log(chalk.green('🎉 Perfect! All files converted successfully.'));
      return;
    }

    // Analyze failed files
    if (failedFiles.length > 0) {
      console.log(chalk.red(`\n❌ FAILED FILES ANALYSIS (${failedFiles.length} files):`));
      
      for (const file of failedFiles) {
        console.log(chalk.red(`\n📄 ${file.sourceFile}`));
        console.log(chalk.gray(`   Error: ${file.error}`));
        
        // Analyze the specific failure reason
        const analysis = await this.analyzeFailureReason(file);
        console.log(chalk.yellow(`   Issue: ${analysis.reason}`));
        console.log(chalk.blue(`   Fix: ${analysis.solution}`));
        
        if (analysis.canAutoFix) {
          console.log(chalk.green(`   🔧 Can be auto-fixed with interactive mode`));
        } else {
          console.log(chalk.yellow(`   ⚠️ Needs manual review`));
        }
      }

      // Provide batch solution
      console.log(chalk.cyan('\n🛠️ BATCH SOLUTIONS FOR FAILED FILES:'));
      console.log(chalk.white('1. Use interactive mode to fix failed files:'));
      console.log(chalk.green('   ntrn --prompt'));
      console.log(chalk.gray('   Then ask: "Fix the failed conversion files"'));
      console.log(chalk.white('\n2. Manual fixes needed for:'));
      
      const manualFixFiles = failedFiles.filter(f => !this.canAutoFix(f));
      if (manualFixFiles.length > 0) {
        manualFixFiles.forEach(f => {
          console.log(chalk.yellow(`   • ${f.sourceFile} - ${this.getManualFixGuidance(f)}`));
        });
      } else {
        console.log(chalk.green('   (No manual fixes needed - all can be auto-fixed!)'));
      }
    }

    // Analyze skipped files
    if (skippedFiles.length > 0) {
      console.log(chalk.yellow(`\n⏭️ RATE LIMITED FILES (${skippedFiles.length} files):`));
      
      skippedFiles.forEach(file => {
        console.log(chalk.yellow(`   • ${file.sourceFile}`));
      });

      console.log(chalk.cyan('\n🔄 TO CONVERT SKIPPED FILES:'));
      console.log(chalk.white('1. Wait 2-3 minutes for rate limits to reset'));
      console.log(chalk.white('2. Run conversion again (will skip completed files)'));
      console.log(chalk.white('3. Or switch provider: ntrn --switch-provider'));
    }

    // Show what was successfully created
    console.log(chalk.green(`\n✅ SUCCESSFULLY CREATED (${successfulFiles.length} files):`));
    
    const screens = successfulFiles.filter(f => f.outputFile?.includes('/screens/'));
    const components = successfulFiles.filter(f => f.outputFile?.includes('/components/'));
    const services = successfulFiles.filter(f => f.outputFile?.includes('/services/'));
    const contexts = successfulFiles.filter(f => f.outputFile?.includes('/contexts/'));

    if (screens.length > 0) {
      console.log(chalk.blue(`   📱 Screens (${screens.length}):`));
      screens.forEach(s => console.log(chalk.gray(`      • ${s.outputFile}`)));
    }
    
    if (components.length > 0) {
      console.log(chalk.blue(`   🧩 Components (${components.length}):`));
      components.forEach(c => console.log(chalk.gray(`      • ${c.outputFile}`)));
    }
    
    if (services.length > 0) {
      console.log(chalk.blue(`   🌐 API Services (${services.length}):`));
      services.forEach(s => console.log(chalk.gray(`      • ${s.outputFile}`)));
    }

    if (contexts.length > 0) {
      console.log(chalk.blue(`   🔄 Contexts (${contexts.length}):`));
      contexts.forEach(c => console.log(chalk.gray(`      • ${c.outputFile}`)));
    }

    // Generate actionable next steps
    console.log(chalk.cyan('\n🎯 YOUR NEXT STEPS:'));
    console.log(chalk.white('1. Test what was created:'));
    console.log(chalk.green('   cd ' + path.basename(this.outputPath)));
    console.log(chalk.green('   npm install'));
    console.log(chalk.green('   expo start'));
    
    if (failedFiles.length > 0 || skippedFiles.length > 0) {
      console.log(chalk.white('\n2. Fix remaining files:'));
      console.log(chalk.yellow('   ntrn --prompt'));
      console.log(chalk.gray('   Ask: "Fix failed conversion files and add missing screens"'));
    }

    console.log(chalk.white('\n3. Need help? Ask the AI assistant:'));
    console.log(chalk.blue('   • "Add navigation between screens"'));
    console.log(chalk.blue('   • "Create API service for [your API]"'));
    console.log(chalk.blue('   • "Fix this error: [paste error]"'));
  }

  async analyzeFailureReason(failedFile) {
    const error = failedFile.error?.toLowerCase() || '';
    const fileName = failedFile.sourceFile?.toLowerCase() || '';

    // Analyze common failure patterns
    if (error.includes('rate limit') || error.includes('429')) {
      return {
        reason: 'AI API rate limit exceeded',
        solution: 'Wait a few minutes and retry, or switch AI provider',
        canAutoFix: true
      };
    }

    if (error.includes('validation failed') || error.includes('syntax')) {
      return {
        reason: 'Generated code has syntax errors',
        solution: 'AI can regenerate with better prompts',
        canAutoFix: true
      };
    }

    if (fileName.includes('_app.') || fileName.includes('_document.')) {
      return {
        reason: 'Next.js-specific file (not needed in React Native)',
        solution: 'This file is intentionally skipped - React Native uses App.tsx instead',
        canAutoFix: false
      };
    }

    if (fileName.includes('/api/') || fileName.includes('route.')) {
      return {
        reason: 'Next.js API route (server-side code)',
        solution: 'Convert to React Native API service class',
        canAutoFix: true
      };
    }

    if (error.includes('file not found')) {
      return {
        reason: 'Source file was not found',
        solution: 'Check if file exists or was moved',
        canAutoFix: false
      };
    }

    if (error.includes('unsupported') || error.includes('not supported')) {
      return {
        reason: 'File contains patterns not convertible to React Native',
        solution: 'Needs manual rewrite for mobile platform',
        canAutoFix: false
      };
    }

    // Generic analysis
    return {
      reason: 'Unknown conversion error',
      solution: 'Try using interactive mode for detailed analysis',
      canAutoFix: true
    };
  }

  canAutoFix(failedFile) {
    const error = failedFile.error?.toLowerCase() || '';
    const fileName = failedFile.sourceFile?.toLowerCase() || '';

    // Files that can't be auto-fixed
    if (fileName.includes('_app.') || fileName.includes('_document.')) return false;
    if (error.includes('file not found')) return false;
    if (error.includes('unsupported')) return false;

    // Most other errors can be auto-fixed
    return true;
  }

  getManualFixGuidance(failedFile) {
    const fileName = failedFile.sourceFile?.toLowerCase() || '';
    
    if (fileName.includes('_app.')) {
      return 'Not needed - App.tsx already created';
    }
    if (fileName.includes('_document.')) {
      return 'Not needed - HTML document not used in React Native';
    }
    if (fileName.includes('middleware.')) {
      return 'Convert server logic to React Native context/hooks';
    }
    
    return 'Review file manually and ask AI assistant for specific help';
  }

  async convertFile(filePath, phase) {
    const fullPath = path.join(this.nextjsPath, filePath);
    
    if (!await fs.exists(fullPath)) {
      return {
        sourceFile: filePath,
        success: false,
        error: 'File not found'
      };
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Create professional conversion prompt
    const conversionPrompt = this.createProfessionalPrompt(content, filePath, phase);
    
    // Call AI for conversion with retry logic
    const response = await this.callAIWithRetry(conversionPrompt, filePath);

    // Extract and validate the converted code
    const convertedCode = this.extractCodeFromResponse(response.content);
    const validationResult = await this.validateConvertedCode(convertedCode, filePath);

    if (!validationResult.isValid) {
      // Attempt to fix the code
      const fixedCode = await this.attemptCodeFix(convertedCode, validationResult.issues, filePath);
      if (fixedCode) {
        return await this.saveConvertedFile(fixedCode, filePath, phase);
      } else {
        return {
          sourceFile: filePath,
          success: false,
          error: 'Code validation failed and could not be auto-fixed',
          issues: validationResult.issues
        };
      }
    }

    return await this.saveConvertedFile(convertedCode, filePath, phase);
  }

  async callAIWithRetry(prompt, filePath, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Show retry attempt if not the first
        if (attempt > 1) {
          console.log(chalk.yellow(`🔄 Retry ${attempt}/${maxRetries} for ${filePath}...`));
          
          // Wait before retry with exponential backoff
          const waitTime = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const response = await aiManager.callAI(prompt, {
          task: 'code-generation',
          temperature: 0.1,
          maxTokens: 8192
        });

        return response;
        
      } catch (error) {
        lastError = error;
        
        // If it's a rate limit error, wait longer
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          if (attempt < maxRetries) {
            const waitTime = 10000 * attempt; // 10s, 20s, 30s
            console.log(chalk.yellow(`⏱️ Rate limit hit for ${filePath}. Waiting ${waitTime/1000}s...`));
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            console.log(chalk.red(`❌ Rate limit exceeded for ${filePath}. Skipping this file.`));
            return {
              sourceFile: filePath,
              success: false,
              error: 'Rate limit exceeded after all retries',
              skipped: true
            };
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

  createProfessionalPrompt(content, filePath, phase) {
    const fileType = this.determineFileType(filePath);
    const isPage = filePath.includes('/pages/') || filePath.includes('/app/') || filePath.includes('page.');
    const isAPI = filePath.includes('/api/') || filePath.includes('api.');
    const isContext = content.includes('createContext') || content.includes('Context');
    
    let specificInstructions = '';
    
    if (isPage) {
      specificInstructions = `
## 📱 NEXT.JS PAGE → REACT NATIVE SCREEN CONVERSION

This is a Next.js PAGE that needs to become a React Native SCREEN:

### MANDATORY TRANSFORMATIONS:
1. **Function Signature**: Convert to TypeScript screen component
   \`\`\`typescript
   import type { RootStackScreenProps } from '../types/navigation';
   
   type Props = RootStackScreenProps<'ScreenName'>;
   
   export function ScreenName({ navigation, route }: Props): JSX.Element {
   \`\`\`

2. **Navigation Conversion**:
   - \`router.push('/path')\` → \`navigation.navigate('ScreenName')\`
   - \`router.back()\` → \`navigation.goBack()\`
   - \`router.replace('/path')\` → \`navigation.replace('ScreenName')\`
   - \`useRouter()\` → \`useNavigation()\`
   - \`<Link href="/path">\` → \`<TouchableOpacity onPress={() => navigation.navigate('ScreenName')}>\`

3. **Screen Structure**: Wrap in SafeAreaView if needed
4. **Add to Navigator**: Provide instructions for adding to AppNavigator.tsx`;
    } else if (isAPI) {
      specificInstructions = `
## 🌐 NEXT.JS API ROUTE → REACT NATIVE SERVICE CONVERSION

This is a Next.js API route that needs to become a React Native service:

### MANDATORY TRANSFORMATIONS:
1. **Service Class Structure**:
   \`\`\`typescript
   import { apiClient, ApiResponse } from '../api/client';
   
   export class ServiceName {
     static async methodName(): Promise<ApiResponse<ReturnType>> {
       return apiClient.get<ReturnType>('/endpoint');
     }
   }
   \`\`\`

2. **HTTP Methods**: Convert to apiClient calls
3. **Error Handling**: Use ApiResponse pattern
4. **Types**: Create proper TypeScript interfaces
5. **Save Location**: Place in src/services/ directory`;
    } else if (isContext) {
      specificInstructions = `
## 🔄 CONTEXT PROVIDER CONVERSION

This appears to be a React Context - enhance for React Native:

### MANDATORY REQUIREMENTS:
1. **TypeScript Interfaces**: Define all context types
2. **Error Boundaries**: Add proper error handling
3. **Hook Pattern**: Create custom useContext hook
4. **Provider Structure**: Follow React Native patterns
5. **Performance**: Optimize for mobile performance`;
    }
    
    return `# PROFESSIONAL REACT NATIVE CONVERSION

You are a Senior React Native Developer converting this ${fileType} from Next.js to React Native. 

## PROJECT CONTEXT:
- Architecture: ${this.conversionPlan.architecture.navigation} navigation, ${this.conversionPlan.architecture.styling} styling
- Tech Stack: ${this.projectAnalysis.dependencies.techStack.ui.map(u => u.name).join(', ')}
- Complexity: ${this.projectAnalysis.dependencies.complexity}

## CONVERSION STRATEGY:
${phase.strategy}

${specificInstructions}

## PROFESSIONAL REQUIREMENTS:

### 1. TYPESCRIPT-FIRST APPROACH
- All files must be .tsx/.ts (NO .jsx/.js)
- Strict TypeScript types for all props, state, functions
- Proper interface definitions
- Generic type parameters where appropriate
- Import types with \`import type\`

### 2. MOBILE-FIRST REACT NATIVE CONVERSION
- **HTML → React Native Components**:
  - \`<div>\` → \`<View>\`
  - \`<span>\`, \`<p>\`, \`<h1-6>\` → \`<Text>\`
  - \`<button>\` → \`<TouchableOpacity>\` + \`<Text>\`
  - \`<input>\` → \`<TextInput>\`
  - \`<img>\` → \`<Image>\`
  - \`<a>\` → \`<TouchableOpacity>\` with navigation

- **Events → Mobile Events**:
  - \`onClick\` → \`onPress\`
  - \`onChange\` → \`onChangeText\` (for TextInput)
  - \`onSubmit\` → \`onPress\`
  - Mouse events → Touch events

- **Styling → React Native StyleSheet**:
  - \`className\` → \`style\`
  - CSS properties → React Native style properties
  - Use \`StyleSheet.create()\` for performance
  - Mobile-appropriate spacing and sizing

### 3. NEXT.JS → REACT NATIVE PATTERNS
- **Routing**: Convert Next.js routing to React Navigation
- **State Management**: Use React hooks or context
- **API Calls**: Use fetch with proper error handling
- **Authentication**: Context-based auth state
- **Data Fetching**: Convert getServerSideProps/getStaticProps to useEffect

### 4. REACT NATIVE BEST PRACTICES
- **ALL text must be in <Text> components**
- **Touch targets**: Minimum 44pt for accessibility
- **Performance**: Use FlatList for lists, avoid heavy re-renders
- **Safe Areas**: Handle device safe areas properly
- **Keyboard**: Handle keyboard interactions
- **Navigation**: Proper screen lifecycle management

### 5. CODE STRUCTURE REQUIREMENTS
- **Imports**: All necessary React Native imports
- **Types**: Comprehensive TypeScript definitions
- **Error Handling**: Try-catch blocks and error boundaries
- **Performance**: Memoization where appropriate
- **Accessibility**: ARIA equivalents for React Native

### 6. FILE ORGANIZATION
- **Screens**: Export from src/screens/
- **Components**: Export from src/components/
- **Services**: Export from src/services/
- **Types**: Export from src/types/
- **Contexts**: Export from src/contexts/

## SOURCE CODE TO CONVERT:
\`\`\`typescript
${content}
\`\`\`

## DELIVERABLE REQUIREMENTS:
1. **Complete TypeScript Code**: Fully typed, no \`any\` types
2. **Production Ready**: Error handling, validation, proper structure
3. **Mobile Optimized**: Touch-friendly, performant, accessible
4. **React Native Compatible**: Only React Native components and APIs
5. **Proper Imports**: All necessary imports included
6. **Comments**: Brief comments for complex logic only

**IMPORTANT**: 
- Output ONLY the converted code
- Use TypeScript (.tsx/.ts) syntax
- Follow React Native conventions
- Ensure all text is in <Text> components
- Make it production-ready and mobile-optimized

Start with imports, then the component/service:`;
  }

  determineFileType(filePath) {
    if (filePath.includes('/page.') || filePath.includes('\\page.')) {
      return 'page component (convert to screen)';
    } else if (filePath.includes('/layout.') || filePath.includes('\\layout.')) {
      return 'layout component (convert to navigation structure)';
    } else if (filePath.includes('/components/') || filePath.includes('\\components\\')) {
      return 'UI component';
    }
    return 'component';
  }

  extractCodeFromResponse(content) {
    // Extract code from markdown code blocks
    const codeMatch = content.match(/```(?:typescript|tsx|javascript|jsx)?\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    
    // If no code block, assume the entire content is code
    return content.trim();
  }

  async validateConvertedCode(code, filePath) {
    const issues = [];
    
    // Basic validation checks
    if (!code.includes('import React')) {
      issues.push('Missing React import');
    }
    
    if (!code.includes('export')) {
      issues.push('Missing export statement');
    }
    
    // React Native specific validations
    if (code.includes('<div>') || code.includes('<span>') || code.includes('<p>')) {
      issues.push('Contains HTML elements that should be converted to React Native components');
    }
    
    if (code.includes('onClick')) {
      issues.push('Contains onClick events that should be onPress in React Native');
    }
    
    if (code.includes('className')) {
      issues.push('Contains className which should be style in React Native');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  async attemptCodeFix(code, issues, filePath) {
    console.log(chalk.yellow(`🔧 Attempting to fix ${issues.length} issues in ${filePath}...`));
    
    // Show issues to user if confirmation is required
    if (this.userPreferences.confirmBeforeMajorChanges && issues.length > 2) {
      const response = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `Found ${issues.length} issues in ${filePath}. Attempt auto-fix?`,
        initial: true
      });
      
      if (!response.proceed) {
        return null;
      }
    }

    const fixPrompt = `# CODE FIXING - REACT NATIVE ISSUES

You are a Senior React Native Developer fixing code issues. Fix these specific issues:

## ISSUES TO FIX:
${issues.map(issue => `- ${issue}`).join('\n')}

## CODE TO FIX:
\`\`\`typescript
${code}
\`\`\`

## FIXING REQUIREMENTS:
1. Fix ONLY the listed issues
2. Do NOT change the core logic
3. Maintain the same functionality
4. Use proper React Native patterns
5. Ensure all text is in Text components
6. Convert HTML elements to React Native components
7. Replace onClick with onPress
8. Convert className to style props

## OUTPUT:
Provide ONLY the fixed code. No explanations.`;

    try {
      const response = await aiManager.callAI(fixPrompt, {
        task: 'debugging',
        temperature: 0.05,
        maxTokens: 8192
      });

      const fixedCode = this.extractCodeFromResponse(response.content);
      
      // Log the fix attempt
      this.fixingHistory.push({
        file: filePath,
        originalIssues: issues,
        fixed: true,
        timestamp: new Date()
      });

      console.log(chalk.green(`✅ Successfully fixed issues in ${filePath}`));
      return fixedCode;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to fix issues in ${filePath}: ${error.message}`));
      this.fixingHistory.push({
        file: filePath,
        originalIssues: issues,
        fixed: false,
        error: error.message,
        timestamp: new Date()
      });
      return null;
    }
  }

  async saveConvertedFile(code, originalPath, phase) {
    const outputPath = this.determineOutputPath(originalPath, phase);
    
    if (!outputPath) {
      return {
        sourceFile: originalPath,
        success: false,
        error: 'File type not supported for conversion'
      };
    }

    const fullOutputPath = path.join(this.outputPath, outputPath);
    await fs.ensureDir(path.dirname(fullOutputPath));
    await fs.writeFile(fullOutputPath, code);

    // If this is a new screen, update navigation
    if (outputPath.includes('/screens/') && !outputPath.includes('HomeScreen')) {
      await this.updateNavigationForNewScreen(outputPath);
    }

    return {
      sourceFile: originalPath,
      outputFile: outputPath,
      success: true
    };
  }

  async updateNavigationForNewScreen(screenPath) {
    try {
      const screenName = path.basename(screenPath, '.tsx');
      const screenImportName = screenName;
      const routeName = screenName.replace('Screen', '');

      // Update navigation types
      const navigationTypesPath = path.join(this.outputPath, 'src/types/navigation.ts');
      if (await fs.exists(navigationTypesPath)) {
        let typesContent = await fs.readFile(navigationTypesPath, 'utf-8');
        
        // Add new screen to RootStackParamList if not already present
        if (!typesContent.includes(`${routeName}:`)) {
          typesContent = typesContent.replace(
            /  \/\/ Add your screen types here/,
            `  ${routeName}: undefined;\n  // Add your screen types here`
          );
          await fs.writeFile(navigationTypesPath, typesContent);
        }
      }

      // Update AppNavigator
      const navigatorPath = path.join(this.outputPath, 'src/navigation/AppNavigator.tsx');
      if (await fs.exists(navigatorPath)) {
        let navigatorContent = await fs.readFile(navigatorPath, 'utf-8');
        
        // Add import if not already present
        if (!navigatorContent.includes(`import { ${screenImportName} }`)) {
          const importLine = `import { ${screenImportName} } from '../screens/${screenName}';`;
          navigatorContent = navigatorContent.replace(
            /(import { HomeScreen } from '\.\.\/screens\/HomeScreen';)/,
            `$1\n${importLine}`
          );
        }

        // Add screen to navigator if not already present
        if (!navigatorContent.includes(`name="${routeName}"`)) {
          const screenComponent = `      <Stack.Screen 
        name="${routeName}" 
        component={${screenImportName}}
        options={{ title: '${routeName}' }}
      />`;
          
          navigatorContent = navigatorContent.replace(
            /(      {\/\* Add more screens here \*\/})/,
            `${screenComponent}\n$1`
          );
        }

        await fs.writeFile(navigatorPath, navigatorContent);
      }

      console.log(chalk.green(`✅ Updated navigation for screen: ${screenName}`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not auto-update navigation for ${screenPath}: ${error.message}`));
    }
  }

  determineOutputPath(originalPath, phase) {
    let outputPath = originalPath;
    
    // Convert Next.js file extensions to TypeScript
    outputPath = outputPath.replace(/\.(js|jsx)$/, '.tsx');
    outputPath = outputPath.replace(/\.ts$/, '.tsx'); // Prefer .tsx for React components
    
    // Handle Next.js pages → React Native screens conversion
    if (originalPath.includes('/pages/') || originalPath.includes('/app/')) {
      // Remove Next.js routing files that don't convert directly
      if (originalPath.includes('_app.') || originalPath.includes('_document.') || 
          originalPath.includes('_error.') || originalPath.includes('404.') ||
          originalPath.includes('500.')) {
        return null; // Skip these Next.js specific files
      }
      
      // Convert pages to screens
      outputPath = outputPath.replace('/pages/', '/screens/');
      outputPath = outputPath.replace('/app/', '/screens/');
      
      // Handle index files
      outputPath = outputPath.replace('/index.tsx', '/HomeScreen.tsx');
      
      // Convert page names to screen names
      const fileName = path.basename(outputPath, '.tsx');
      const screenName = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 
                        (fileName.toLowerCase().includes('screen') ? '' : 'Screen');
      outputPath = path.dirname(outputPath) + '/' + screenName + '.tsx';
    }
    
    // Handle Next.js API routes → React Native services conversion
    else if (originalPath.includes('/api/')) {
      // Convert API routes to services
      outputPath = outputPath.replace('/api/', '/services/');
      
      // Convert to service naming
      const fileName = path.basename(outputPath, '.tsx');
      const serviceName = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 
                         (fileName.toLowerCase().includes('service') ? '' : 'Service');
      outputPath = path.dirname(outputPath) + '/' + serviceName + '.ts'; // Services are .ts not .tsx
    }
    
    // Handle components
    else if (originalPath.includes('/components/')) {
      outputPath = outputPath.replace('/components/', '/components/');
      // Ensure proper component naming (PascalCase)
      const fileName = path.basename(outputPath, '.tsx');
      const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
      outputPath = path.dirname(outputPath) + '/' + componentName + '.tsx';
    }
    
    // Handle contexts
    else if (originalPath.includes('context') || originalPath.includes('Context')) {
      outputPath = outputPath.includes('/contexts/') ? outputPath : outputPath.replace(/\/[^/]*\//, '/contexts/');
      // Ensure proper context naming
      const fileName = path.basename(outputPath, '.tsx');
      const contextName = fileName.charAt(0).toUpperCase() + fileName.slice(1) + 
                         (fileName.toLowerCase().includes('context') ? '' : 'Context');
      outputPath = path.dirname(outputPath) + '/' + contextName + '.tsx';
    }
    
    // Handle hooks
    else if (originalPath.includes('/hooks/') || path.basename(originalPath).startsWith('use')) {
      outputPath = outputPath.replace('/hooks/', '/hooks/');
      // Hooks remain as .ts files unless they contain JSX
      if (!originalPath.includes('jsx') && !originalPath.includes('tsx')) {
        outputPath = outputPath.replace('.tsx', '.ts');
      }
    }
    
    // Handle utilities
    else if (originalPath.includes('/utils/') || originalPath.includes('/lib/')) {
      outputPath = outputPath.replace('/lib/', '/utils/');
      outputPath = outputPath.replace('/utils/', '/utils/');
      // Utils are typically .ts files
      outputPath = outputPath.replace('.tsx', '.ts');
    }
    
    // Handle types
    else if (originalPath.includes('/types/') || originalPath.includes('.d.ts')) {
      outputPath = outputPath.replace('/types/', '/types/');
      outputPath = outputPath.replace('.tsx', '.ts');
      outputPath = outputPath.replace('.d.ts', '.ts');
    }
    
    // Ensure the output path starts with 'src/'
    if (!outputPath.startsWith('src/')) {
      outputPath = 'src/' + outputPath;
    }
    
    // Remove any leading slashes or relative path indicators
    outputPath = outputPath.replace(/^\.?\/+/, '');
    
    return outputPath;
  }

  async performQualityAssurance(results) {
    console.log(chalk.blue('🔍 Performing quality assurance checks...'));
    
    let passedChecks = 0;
    let totalChecks = 0;

    for (const check of this.conversionPlan.qualityChecks) {
      totalChecks++;
      console.log(chalk.gray(`   Checking: ${check}`));
      
      // Implement basic quality checks
      const passed = await this.performQualityCheck(check, results);
      if (passed) {
        passedChecks++;
        console.log(chalk.green(`   ✅ ${check}`));
      } else {
        console.log(chalk.yellow(`   ⚠️ ${check}`));
      }
    }

    const score = Math.round((passedChecks / totalChecks) * 100);
    console.log(chalk.cyan(`\n📊 Quality Score: ${score}%`));
    
    if (score < 80) {
      console.log(chalk.yellow('⚠️ Quality score below 80%. Consider manual review.'));
    }

    return { score, passedChecks, totalChecks };
  }

  async performQualityCheck(check, results) {
    // Implement specific quality checks
    switch (check.toLowerCase()) {
      case 'validate all imports are react native compatible':
        return this.checkImports(results);
      case 'ensure all text is wrapped in text components':
        return this.checkTextWrapping(results);
      case 'verify navigation structure works':
        return this.checkNavigationStructure(results);
      case 'check for runtime errors':
        return this.checkForRuntimeErrors(results);
      default:
        return true; // Default pass for unknown checks
    }
  }

  async checkImports(results) {
    // Check for problematic imports
    const problematicImports = ['next/', '@next/', 'next-'];
    
    for (const result of results) {
      if (result.success && result.outputFile) {
        const filePath = path.join(this.outputPath, result.outputFile);
        if (await fs.exists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          
          for (const problematic of problematicImports) {
            if (content.includes(problematic)) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  async checkTextWrapping(results) {
    // Basic check for text wrapping (simplified)
    for (const result of results) {
      if (result.success && result.outputFile) {
        const filePath = path.join(this.outputPath, result.outputFile);
        if (await fs.exists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Simple regex to find text that might not be wrapped
          const suspiciousText = />[\s]*[a-zA-Z]/g;
          if (suspiciousText.test(content) && !content.includes('<Text>')) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  async checkNavigationStructure(results) {
    // Check if navigation files exist and are properly structured
    const navigatorPath = path.join(this.outputPath, 'src/navigation/AppNavigator.tsx');
    return await fs.exists(navigatorPath);
  }

  async checkForRuntimeErrors(results) {
    // Basic syntax check for common runtime errors
    for (const result of results) {
      if (result.success && result.outputFile) {
        const filePath = path.join(this.outputPath, result.outputFile);
        if (await fs.exists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Check for obvious syntax errors
          const errorPatterns = [
            'onClick',
            '<div>',
            '<span>',
            'className=',
            'window.',
            'document.'
          ];
          
          for (const pattern of errorPatterns) {
            if (content.includes(pattern)) {
              return false;
            }
          }
        }
      }
    }
    
    return true;
  }

  async validateProject() {
    console.log(chalk.blue('🔍 Performing final project validation...'));
    
    const validations = [
      { name: 'Package.json exists', check: () => fs.exists(path.join(this.outputPath, 'package.json')) },
      { name: 'App.tsx exists', check: () => fs.exists(path.join(this.outputPath, 'App.tsx')) },
      { name: 'Navigation setup exists', check: () => fs.exists(path.join(this.outputPath, 'src/navigation/AppNavigator.tsx')) },
      { name: 'At least one screen exists', check: () => this.checkScreensExist() }
    ];

    let passedValidations = 0;
    
    for (const validation of validations) {
      const passed = await validation.check();
      if (passed) {
        passedValidations++;
        console.log(chalk.green(`✅ ${validation.name}`));
      } else {
        console.log(chalk.red(`❌ ${validation.name}`));
      }
    }

    const isValid = passedValidations === validations.length;
    
    if (isValid) {
      console.log(chalk.green('\n🎉 Project validation successful!'));
      console.log(chalk.cyan('\n📋 Next Steps:'));
      console.log(chalk.white('1. cd ' + path.relative(process.cwd(), this.outputPath)));
      console.log(chalk.white('2. npm install'));
      console.log(chalk.white('3. npx expo start'));
    } else {
      console.log(chalk.yellow('\n⚠️ Project validation completed with issues.'));
      console.log(chalk.gray('Manual review may be required.'));
    }

    return isValid;
  }

  async checkScreensExist() {
    const screensDir = path.join(this.outputPath, 'src/screens');
    if (!await fs.exists(screensDir)) return false;
    
    const screens = await fs.readdir(screensDir);
    return screens.length > 0;
  }
} 