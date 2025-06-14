import prompts from 'prompts';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { convertPagesToScreens } from './convertPagesToScreens.js';
import { ConversionConfig } from './utils/config.js';

// Basic Expo project creation for simple conversion
export async function createExpoProject(outputPath) {
  try {
    console.log(chalk.cyan('📱 Creating basic Expo project structure...'));
    
    // Create directory structure
    await fs.ensureDir(outputPath);
    
    // Create basic package.json for React Native Expo
    const packageJson = {
      "name": "converted-react-native",
      "version": "1.0.0",
      "main": "node_modules/expo/AppEntry.js",
      "scripts": {
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web"
      },
      "dependencies": {
        "expo": "~50.0.0",
        "react": "18.2.0",
        "react-native": "0.73.0",
        "@react-navigation/native": "^6.1.0",
        "@react-navigation/stack": "^6.3.0",
        "react-native-screens": "~3.29.0",
        "react-native-safe-area-context": "4.8.2",
        "@react-native-async-storage/async-storage": "1.21.0"
      },
      "devDependencies": {
        "@babel/core": "^7.20.0",
        "@types/react": "~18.2.45",
        "typescript": "^5.1.3"
      }
    };
    
    await fs.writeJson(path.join(outputPath, 'package.json'), packageJson, { spaces: 2 });
    
    // Create app.json
    const appJson = {
      "expo": {
        "name": "Converted React Native App",
        "slug": "converted-react-native",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/icon.png",
        "userInterfaceStyle": "light",
        "splash": {
          "image": "./assets/splash.png",
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        },
        "assetBundlePatterns": [
          "**/*"
        ],
        "ios": {
          "supportsTablet": true
        },
        "android": {
          "adaptiveIcon": {
            "foregroundImage": "./assets/adaptive-icon.png",
            "backgroundColor": "#FFFFFF"
          }
        },
        "web": {
          "favicon": "./assets/favicon.png"
        }
      }
    };
    
    await fs.writeJson(path.join(outputPath, 'app.json'), appJson, { spaces: 2 });
    
    // Create basic App.tsx
    const appTsx = `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}`;
    
    await fs.writeFile(path.join(outputPath, 'App.tsx'), appTsx);
    
    // Create directories
    await fs.ensureDir(path.join(outputPath, 'screens'));
    await fs.ensureDir(path.join(outputPath, 'components'));
    await fs.ensureDir(path.join(outputPath, 'assets'));
    
    console.log(chalk.green('✅ Basic Expo project structure created'));
    return { success: true };
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to create Expo project:'), error.message);
    return { success: false, error: error.message };
  }
}

export async function createProjectFlow() {
  // Initialize configuration
  const configManager = new ConversionConfig(process.cwd());
  const config = await configManager.ensureValidConfig();

  console.log(chalk.cyan('🚀 NTRN Enhanced - Next.js to React Native Converter'));
  console.log(chalk.gray('Using enhanced AI-powered conversion with comprehensive project analysis\n'));

  const { projectName, nextPath } = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Enter the name of the new React Native project:',
      validate: name => {
        if (!name) return 'Project name is required';
        if (!/^[a-zA-Z0-9-_]+$/.test(name)) return 'Project name can only contain letters, numbers, hyphens, and underscores';
        return true;
      },
    },
    {
      type: 'text',
      name: 'nextPath',
      message: 'Enter the path to your Next.js project:',
      validate: async input => {
        if (!input) return 'Path is required';
        if (!await fs.exists(input)) return 'Path does not exist';
        
        // Check if it's actually a Next.js project
        const packageJsonPath = path.join(input, 'package.json');
        if (await fs.exists(packageJsonPath)) {
          const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
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
        }
        
        return true;
      }
    }
  ]);

  if (!projectName || !nextPath) {
    console.log(chalk.red('❌ Project creation cancelled.'));
    return;
  }

  const targetPath = path.join(process.cwd(), projectName);

  // Check if target directory already exists
  if (await fs.exists(targetPath)) {
    const overwrite = await prompts({
      type: 'toggle',
      name: 'overwrite',
      message: `Directory "${projectName}" already exists. Overwrite?`,
      initial: false,
      active: 'yes',
      inactive: 'no'
    });

    if (!overwrite.overwrite) {
      console.log(chalk.red('❌ Project creation cancelled.'));
      return;
    }

    await fs.remove(targetPath);
  }

  // Phase 1: Create Expo project
  console.log(chalk.cyan('\n📱 Creating Expo project with TypeScript...'));
  try {
    const createCommand = `npx create-expo-app@latest ${projectName} --template blank-typescript`;
    console.log(chalk.gray(`Running: ${createCommand}`));
    
    execSync(createCommand, { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    console.log(chalk.green('✅ Expo project created successfully.'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to create Expo project:'), error.message);
    return;
  }

  // Phase 2: Copy static assets
  await copyStaticAssets(nextPath, targetPath, config);

  // Phase 3: Setup styling framework
  await setupStylingFramework(targetPath, nextPath, config);

  // Phase 4: Install additional dependencies
  await installAdditionalDependencies(targetPath, config);

  console.log(chalk.greenBright('\n✅ React Native project setup complete!'));

  // Phase 5: Enhanced conversion using AI
  console.log(chalk.blueBright('\n🤖 Starting AI-powered conversion...'));
  console.log(chalk.gray('This may take a few minutes depending on your project size.\n'));

  try {
    const conversionResult = await convertPagesToScreens(nextPath, targetPath, config);
    
    if (conversionResult.success) {
      console.log(chalk.greenBright('\n🎉 Conversion completed successfully!'));
    } else {
      console.log(chalk.yellowBright('\n⚠️ Conversion completed with some issues.'));
      console.log(chalk.gray('Check the conversion report for details.'));
    }

    // Phase 6: Final setup and instructions
    await provideFinalInstructions(projectName, targetPath, conversionResult, config);

  } catch (err) {
    console.error(chalk.red('\n❌ Conversion failed:'), err.message);
    console.log(chalk.gray('You can still use the basic Expo project that was created.'));
  }
}

async function copyStaticAssets(nextPath, targetPath, config) {
  console.log(chalk.cyan('\n📂 Copying static assets...'));

  const assetCopyTasks = [
    {
      source: path.join(nextPath, 'public'),
      target: path.join(targetPath, 'assets'),
      name: 'public assets'
    },
    {
      source: path.join(nextPath, 'static'),
      target: path.join(targetPath, 'static'),
      name: 'static directory'
    }
  ];

  for (const task of assetCopyTasks) {
    if (await fs.exists(task.source)) {
      try {
        await fs.copy(task.source, task.target, {
          filter: (src) => {
            // Skip large files and unwanted formats
            const filename = path.basename(src);
            return !filename.startsWith('.') && 
                   !filename.endsWith('.psd') && 
                   !filename.endsWith('.ai');
          }
        });
        console.log(chalk.green(`✅ Copied ${task.name}`));
      } catch (error) {
        console.warn(chalk.yellow(`⚠️ Failed to copy ${task.name}: ${error.message}`));
      }
    }
  }
}

async function setupStylingFramework(targetPath, nextPath, config) {
  const framework = config.styling.framework;
  
  console.log(chalk.cyan(`\n🎨 Setting up ${framework} styling...`));

  if (framework === 'nativewind') {
    await setupNativeWind(targetPath, nextPath, config);
  } else if (framework === 'styled-components') {
    await setupStyledComponents(targetPath, config);
  }
  // Default StyleSheet doesn't need additional setup
}

async function setupNativeWind(targetPath, nextPath, config) {
  // Check for Tailwind in source project
  const pkgPath = path.join(nextPath, 'package.json');
  let tailwindFound = false;

  if (await fs.exists(pkgPath)) {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    tailwindFound = !!deps['tailwindcss'];
  }

  if (tailwindFound || config.styling.framework === 'nativewind') {
    try {
      console.log(chalk.cyan('  Installing NativeWind dependencies...'));
      execSync(`cd ${path.basename(targetPath)} && npm install nativewind tailwindcss`, { 
        stdio: 'pipe',
        cwd: path.dirname(targetPath)
      });

      // Create tailwind.config.js
      const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      ${config.styling.darkModeSupport ? `
      colors: {
        dark: {
          background: '#000000',
          surface: '#1a1a1a',
          text: '#ffffff'
        }
      }` : ''}
    },
  },
  plugins: [],
  ${config.styling.darkModeSupport ? `darkMode: 'class',` : ''}
}`;

      await fs.writeFile(path.join(targetPath, 'tailwind.config.js'), tailwindConfig.trim());

      // Update babel.config.js
      const babelPath = path.join(targetPath, 'babel.config.js');
      if (await fs.exists(babelPath)) {
        let babel = await fs.readFile(babelPath, 'utf-8');
        if (!babel.includes('nativewind/babel')) {
          babel = babel.replace(
            /return\s*{([^}]*)}/,
            `return {$1,
    plugins: ["nativewind/babel"]
  }`
          );
          await fs.writeFile(babelPath, babel);
        }
      }

      console.log(chalk.green('✅ NativeWind configured successfully'));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Failed to setup NativeWind: ${error.message}`));
    }
  }
}

async function setupStyledComponents(targetPath, config) {
  try {
    console.log(chalk.cyan('  Installing styled-components...'));
    execSync(`cd ${path.basename(targetPath)} && npm install styled-components @types/styled-components`, { 
      stdio: 'pipe',
      cwd: path.dirname(targetPath)
    });

    // Create theme file
    const themeContent = `
import { DefaultTheme } from 'styled-components/native';

export const theme: DefaultTheme = {
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    ${config.styling.darkModeSupport ? `
    dark: {
      background: '#000000',
      surface: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      border: '#38383A'
    }` : ''}
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16
  }
};

export type Theme = typeof theme;
`;

    await fs.ensureDir(path.join(targetPath, 'src', 'theme'));
    await fs.writeFile(path.join(targetPath, 'src', 'theme', 'index.ts'), themeContent.trim());

    console.log(chalk.green('✅ Styled-components configured with theme'));
  } catch (error) {
    console.warn(chalk.yellow(`⚠️ Failed to setup styled-components: ${error.message}`));
  }
}

async function installAdditionalDependencies(targetPath, config) {
  console.log(chalk.cyan('\n📦 Installing additional dependencies...'));

  const additionalDeps = [
    'expo-image',
    'expo-linear-gradient',
    'expo-constants',
    '@expo/vector-icons'
  ];

  if (config.development.enableFlipperIntegration) {
    additionalDeps.push('react-native-flipper');
  }

  try {
    const installCommand = `cd ${path.basename(targetPath)} && npm install ${additionalDeps.join(' ')}`;
    execSync(installCommand, { 
      stdio: 'pipe',
      cwd: path.dirname(targetPath)
    });
    console.log(chalk.green('✅ Additional dependencies installed'));
  } catch (error) {
    console.warn(chalk.yellow(`⚠️ Some dependencies failed to install: ${error.message}`));
  }
}

async function provideFinalInstructions(projectName, targetPath, conversionResult, config) {
  console.log(chalk.greenBright('\n🎉 Project conversion complete!\n'));

  // Generate metro.config.js for better module resolution
  const metroConfig = `
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg');

module.exports = config;
`;

  await fs.writeFile(path.join(targetPath, 'metro.config.js'), metroConfig.trim());

  console.log(chalk.cyan('📋 Next steps:'));
  
  // Fix the structure access - use report instead of results
  const report = conversionResult.report || conversionResult;
  const screensCount = report.screens ? report.screens.length : 0;
  const componentsCount = report.components ? report.components.length : 0;
  const errorsCount = report.errors ? report.errors.length : 0;
  
  console.log(chalk.white(`
  1. Navigate to your project:
     ${chalk.green(`cd ${projectName}`)}

  2. Install dependencies:
     ${chalk.green('npm install')}

  3. Start the development server:
     ${chalk.green('npx expo start')}

  4. Run on your preferred platform:
     ${chalk.green('npx expo run:android')}  # Android
     ${chalk.green('npx expo run:ios')}      # iOS (macOS only)
     ${chalk.green('npx expo start --web')}  # Web

  📄 Files generated:
  • ${screensCount} screens in /screens
  • ${componentsCount} components in /components  
  • Navigation setup with React Navigation
  • ${config.styling.framework} styling configured
  • Conversion report: conversion-report.md

  ${errorsCount > 0 ? 
    chalk.yellow(`⚠️  ${errorsCount} files had conversion issues. Check conversion-report.md`) : 
    chalk.green('✅ All files converted successfully!')
  }
  `));

  console.log(chalk.blueBright('🚀 Happy coding with React Native!'));
}
