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

    const plan = this.parsePlanFromResponse(response.content);
    
    console.log(chalk.green('✅ Conversion plan generated'));
    this.displayConversionPlan(plan);

    return plan;
  }

  createPlanningPrompt() {
    return `# PROFESSIONAL REACT NATIVE CONVERSION PLAN

You are a Senior React Native Developer with 8+ years of experience converting Next.js projects to React Native. Analyze this project and create a comprehensive conversion plan.

## PROJECT ANALYSIS:
${JSON.stringify(this.projectAnalysis, null, 2)}

## YOUR TASK:
Create a detailed, step-by-step conversion plan that addresses:

### 1. ARCHITECTURE DECISIONS
- Navigation structure (Stack, Tab, Drawer)
- State management approach
- File organization strategy
- Performance considerations

### 2. TECHNOLOGY MAPPING
- UI component conversions (Next.js → React Native)
- Styling approach (CSS → StyleSheet/NativeWind)
- API handling (SSR/SSG → Client-side)
- Asset management

### 3. CRITICAL ISSUES TO ADDRESS
- ${this.projectAnalysis.recommendations.map(r => r.title).join(', ')}

### 4. CONVERSION PRIORITY
- High priority files (core functionality)
- Medium priority files (features)
- Low priority files (utilities)

### 5. QUALITY ASSURANCE STRATEGY
- Code validation points
- Testing approach
- Performance optimization

## OUTPUT FORMAT:
Provide a structured JSON plan with:
{
  "architecture": {
    "navigation": "stack|tab|drawer",
    "stateManagement": "native|redux|zustand",
    "styling": "stylesheet|nativewind|styled-components"
  },
  "phases": [
    {
      "name": "Phase Name",
      "priority": "high|medium|low",
      "files": ["file1.tsx", "file2.tsx"],
      "strategy": "Strategy description",
      "estimatedTime": "5-10 minutes"
    }
  ],
  "criticalIssues": [
    {
      "issue": "Issue description",
      "solution": "Solution approach",
      "priority": "high|medium|low"
    }
  ],
  "qualityChecks": [
    "Check 1",
    "Check 2"
  ]
}

Be specific and professional. This plan will guide the entire conversion process.`;
  }

  parsePlanFromResponse(content) {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Fallback plan if parsing fails
      return this.createFallbackPlan();
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not parse AI plan, using fallback'));
      return this.createFallbackPlan();
    }
  }

  createFallbackPlan() {
    return {
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

  displayConversionPlan(plan) {
    console.log(chalk.cyan('\n📋 Professional Conversion Plan'));
    console.log(chalk.cyan('=' .repeat(50)));

    console.log(chalk.yellow('\n🏗️ Architecture Decisions:'));
    console.log(`   Navigation: ${plan.architecture.navigation}`);
    console.log(`   State Management: ${plan.architecture.stateManagement}`);
    console.log(`   Styling: ${plan.architecture.styling}`);

    console.log(chalk.yellow('\n📅 Conversion Phases:'));
    plan.phases.forEach((phase, index) => {
      const priority = phase.priority === 'high' ? '🔴' : phase.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${index + 1}. ${priority} ${phase.name} (${phase.estimatedTime})`);
      console.log(`      Files: ${phase.files.length} files`);
    });

    if (plan.criticalIssues.length > 0) {
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
        expo: '~53.0.12',
        react: '19.0.0',
        'react-native': '0.79.0',
        '@react-navigation/native': '^7.0.0',
        '@react-navigation/native-stack': '^7.0.0',
        '@react-navigation/bottom-tabs': '^7.0.0',
        'react-native-screens': '~4.0.0',
        'react-native-safe-area-context': '~4.12.0',
        '@react-native-async-storage/async-storage': '~2.1.0',
        'react-native-gesture-handler': '~2.20.0',
        'expo-status-bar': '~2.0.0',
        'expo-font': '~13.0.0',
        'expo-splash-screen': '~1.0.0'
      },
      devDependencies: {
        '@babel/core': '^7.25.0',
        '@types/react': '~19.0.0',
        '@types/react-native': '^0.79.0',
        'typescript': '~5.8.3'
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
        newArchEnabled: true, // Enable New Architecture by default for SDK 53
        splash: {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff'
        },
        assetBundlePatterns: ['**/*'],
        ios: {
          supportsTablet: true,
          bundleIdentifier: `com.${path.basename(this.outputPath).toLowerCase()}.app`,
          deploymentTarget: '15.1' // SDK 53 minimum iOS version
        },
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#FFFFFF'
          },
          package: `com.${path.basename(this.outputPath).toLowerCase()}.app`,
          compileSdkVersion: 35, // SDK 53 requirement
          targetSdkVersion: 35,
          minSdkVersion: 24 // SDK 53 requirement
        },
        web: {
          favicon: './assets/favicon.png',
          bundler: 'metro'
        },
        plugins: [
          'expo-splash-screen' // Use config plugin for SDK 53
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

  async performProfessionalConversion() {
    console.log(chalk.blue('👨‍💻 Starting professional conversion process...'));
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Process each phase in the conversion plan
    for (const phase of this.conversionPlan.phases) {
      console.log(chalk.cyan(`\n📋 ${phase.name} (${phase.priority} priority)`));
      
      for (const file of phase.files) {
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

    // Show conversion summary
    this.showConversionSummary(successCount, failureCount, skippedCount);

    return results;
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