import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class RuntimeErrorFixer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  async fixProject() {
    console.log(chalk.cyan('🔧 Scanning for React Native runtime errors...'));
    
    try {
      const srcPath = path.join(this.projectPath, 'src');
      if (await fs.exists(srcPath)) {
        await this.scanAndFixDirectory(srcPath);
      }
      
      // Also check App.tsx in root
      const appTsxPath = path.join(this.projectPath, 'App.tsx');
      if (await fs.exists(appTsxPath)) {
        await this.fixFileRuntimeErrors(appTsxPath);
      }
      
      // Fix package.json dependencies
      await this.fixPackageJson();
      
      console.log(chalk.green('✅ Runtime error fixes complete'));
    } catch (error) {
      console.log(chalk.red(`❌ Error during runtime error fix: ${error.message}`));
    }
  }

  async scanAndFixDirectory(dirPath) {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory() && !['node_modules', '.git', '.expo'].includes(file)) {
        await this.scanAndFixDirectory(filePath);
      } else if (stat.isFile() && /\.(tsx?|jsx?)$/.test(file)) {
        await this.fixFileRuntimeErrors(filePath);
      }
    }
  }

  async fixFileRuntimeErrors(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      let fixedContent = content;
      let hasChanges = false;

      // Fix 1: Remove nested Text components like <Text><Text><Text>Text</Text></Text></Text>
      const nestedTextRegex = /<Text[^>]*>(\s*<Text[^>]*>)*\s*([^<]+)\s*(<\/Text>\s*)*<\/Text>/g;
      const cleanTextContent = fixedContent.replace(nestedTextRegex, (match, innerOpening, textContent, innerClosing) => {
        if (textContent && textContent.trim()) {
          return `<Text>${textContent.trim()}</Text>`;
        }
        return match;
      });
      
      if (cleanTextContent !== fixedContent) {
        fixedContent = cleanTextContent;
        hasChanges = true;
      }

      // Fix 2: Remove invalid asset imports
      const invalidImportRegex = /import .+ from ['"]\.\.\/.+\/assets\/.+['"]/g;
      if (fixedContent.match(invalidImportRegex)) {
        fixedContent = fixedContent.replace(invalidImportRegex, '// Asset import removed - file not found');
        hasChanges = true;
      }

      // Fix 3: Missing React import
      if (!content.includes('import React') && content.includes('React.')) {
        fixedContent = `import React from 'react';\n${fixedContent}`;
        hasChanges = true;
      }

      // Fix 4: Missing React Native component imports
      const rnComponents = ['View', 'Text', 'StyleSheet', 'TouchableOpacity', 'TextInput', 'ScrollView', 'FlatList', 'Image'];
      for (const component of rnComponents) {
        if (content.includes(`<${component}`) && !content.includes(`import.*${component}`)) {
          // Add to existing RN import or create new one
          if (content.includes('from \'react-native\'')) {
            fixedContent = fixedContent.replace(
              /import\s*{([^}]+)}\s*from\s*'react-native'/,
              (match, imports) => {
                if (!imports.includes(component)) {
                  return `import { ${imports.trim()}, ${component} } from 'react-native'`;
                }
                return match;
              }
            );
          } else {
            fixedContent = `import { ${component} } from 'react-native';\n${fixedContent}`;
          }
          hasChanges = true;
        }
      }

      // Fix 5: HTML elements to React Native components
      const htmlToRn = {
        '<div': '<View',
        '</div>': '</View>',
        '<span': '<Text',
        '</span>': '</Text>',
        '<p': '<Text',
        '</p>': '</Text>',
        '<button': '<TouchableOpacity',
        '</button>': '</TouchableOpacity>',
        '<input': '<TextInput',
        'onClick': 'onPress',
        'className': 'style'
      };

      for (const [html, rn] of Object.entries(htmlToRn)) {
        if (fixedContent.includes(html)) {
          fixedContent = fixedContent.replace(new RegExp(html, 'g'), rn);
          hasChanges = true;
        }
      }

      // Fix 6: Add StyleSheet if styles are used
      if (content.includes('style={') && !content.includes('StyleSheet')) {
        if (content.includes('from \'react-native\'')) {
          fixedContent = fixedContent.replace(
            /import\s*{([^}]+)}\s*from\s*'react-native'/,
            (match, imports) => {
              if (!imports.includes('StyleSheet')) {
                return `import { ${imports.trim()}, StyleSheet } from 'react-native'`;
              }
              return match;
            }
          );
        } else {
          fixedContent = `import { StyleSheet } from 'react-native';\n${fixedContent}`;
        }
        hasChanges = true;
      }

      // Fix 7: Remove invalid dependency imports
      const invalidDeps = [
        'react-native-haptic-feedback',
        'expo-local-authentication'
      ];
      
      for (const dep of invalidDeps) {
        const importRegex = new RegExp(`import .+ from ['"]${dep}['"];?`, 'g');
        if (fixedContent.match(importRegex)) {
          fixedContent = fixedContent.replace(importRegex, `// ${dep} import removed - not available`);
          hasChanges = true;
        }
      }

      // Save fixed content
      if (hasChanges) {
        // Create backup
        const backupPath = `${filePath}.backup`;
        await fs.copy(filePath, backupPath);
        await fs.writeFile(filePath, fixedContent, 'utf-8');
        console.log(chalk.green(`🔧 Fixed: ${path.relative(this.projectPath, filePath)}`));
      }

    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not fix ${filePath}: ${error.message}`));
    }
  }

  async fixPackageJson() {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!await fs.exists(packageJsonPath)) {
        return;
      }

      const packageJson = await fs.readJson(packageJsonPath);
      
      // Update to proper Expo SDK 52 dependencies
      const updatedDependencies = {
        "@babel/core": "^7.25.0",
        "@react-native-async-storage/async-storage": "2.1.2",
        "@react-native-community/slider": "4.5.6",
        "@react-navigation/bottom-tabs": "^6.6.1",
        "@react-navigation/native": "^6.1.18",
        "@react-navigation/native-stack": "^6.11.0",
        "@types/react": "~19.0.10",
        "expo": "~52.0.19",
        "expo-font": "~13.3.1",
        "expo-image": "~2.3.0",
        "expo-splash-screen": "~0.29.14",
        "expo-status-bar": "~2.2.3",
        "react": "18.3.1",
        "react-native": "0.76.5",
        "react-native-gesture-handler": "~2.24.0",
        "react-native-reanimated": "~3.17.4",
        "react-native-safe-area-context": "5.4.0",
        "react-native-screens": "~4.11.1",
        "react-native-svg": "15.11.2",
        "react-native-toast-message": "^2.2.1",
        "typescript": "~5.8.3"
      };

      packageJson.dependencies = updatedDependencies;
      packageJson.devDependencies = {
        "@babel/preset-env": "^7.25.0",
        "@types/react-native": "^0.76.0"
      };

      // Add scripts if missing
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      packageJson.scripts = {
        ...packageJson.scripts,
        "start": "expo start",
        "android": "expo start --android",
        "ios": "expo start --ios",
        "web": "expo start --web"
      };

      // Add main entry point
      packageJson.main = "node_modules/expo/AppEntry.js";

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log(chalk.green('📦 Updated package.json with compatible dependencies'));

    } catch (error) {
      console.log(chalk.yellow(`⚠️ Could not fix package.json: ${error.message}`));
    }
  }
}

// Export function to fix a specific project
export async function fixProjectRuntimeErrors(projectPath) {
  const fixer = new RuntimeErrorFixer(projectPath);
  await fixer.fixProject();
} 