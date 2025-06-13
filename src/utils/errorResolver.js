import fs from 'fs-extra';
import path from 'path';
import { callGeminiAPI } from './geminiClient.js';

// Comprehensive error patterns and their automatic fixes
const ERROR_PATTERNS = {
  // Navigation errors
  navigationErrors: [
    {
      pattern: /Unable to resolve "@react-navigation\/native"/,
      fix: 'INSTALL_NAVIGATION_DEPS',
      description: 'Missing React Navigation dependencies'
    },
    {
      pattern: /Unable to resolve "@react-navigation\/stack"/,
      fix: 'INSTALL_NAVIGATION_DEPS',
      description: 'Missing React Navigation stack dependencies'
    },
    {
      pattern: /Unable to resolve "@react-navigation\/bottom-tabs"/,
      fix: 'INSTALL_NAVIGATION_DEPS',
      description: 'Missing React Navigation tabs dependencies'
    }
  ],

  // Import/Module errors
  importErrors: [
    {
      pattern: /Unable to resolve "([^"]+)" from "([^"]+)"/,
      fix: 'FIX_IMPORT',
      description: 'Missing or incorrect import'
    },
    {
      pattern: /Module not found: Error: Can't resolve '([^']+)'/,
      fix: 'FIX_IMPORT',
      description: 'Module resolution error'
    }
  ],

  // React Native component errors
  componentErrors: [
    {
      pattern: /Text strings must be rendered within a <Text> component/,
      fix: 'WRAP_TEXT',
      description: 'Text not wrapped in Text component'
    },
    {
      pattern: /Cannot read property 'createElement' of undefined/,
      fix: 'ADD_REACT_IMPORT',
      description: 'Missing React import'
    },
    {
      pattern: /StyleSheet is not defined/,
      fix: 'ADD_STYLESHEET_IMPORT',
      description: 'Missing StyleSheet import'
    },
    {
      pattern: /View is not defined/,
      fix: 'ADD_VIEW_IMPORT',
      description: 'Missing View import'
    }
  ],

  // JSX syntax errors
  jsxErrors: [
    {
      pattern: /Adjacent JSX elements must be wrapped in an enclosing tag/,
      fix: 'WRAP_JSX_FRAGMENTS',
      description: 'JSX elements need wrapping'
    },
    {
      pattern: /Unexpected token '<'/,
      fix: 'FIX_JSX_SYNTAX',
      description: 'JSX syntax error'
    }
  ],

  // Style errors
  styleErrors: [
    {
      pattern: /Invalid prop `className` of type `string` supplied to/,
      fix: 'CONVERT_CLASSNAME_TO_STYLE',
      description: 'className used instead of style prop'
    },
    {
      pattern: /Failed prop type.*style.*expected.*object/,
      fix: 'FIX_STYLE_PROP',
      description: 'Invalid style prop format'
    }
  ],

  // Event handler errors
  eventErrors: [
    {
      pattern: /onClick is not a function/,
      fix: 'CONVERT_ONCLICK_TO_ONPRESS',
      description: 'onClick used instead of onPress'
    },
    {
      pattern: /onPress is not a function/,
      fix: 'FIX_EVENT_HANDLER',
      description: 'Invalid event handler'
    }
  ]
};

// Automatic fixes implementation
const AUTO_FIXES = {
  async INSTALL_NAVIGATION_DEPS(projectPath, errorInfo) {
    console.log('🔧 Installing React Navigation dependencies...');
    
    const dependencies = [
      '@react-navigation/native',
      '@react-navigation/native-stack',
      '@react-navigation/bottom-tabs',
      'react-native-screens',
      'react-native-safe-area-context'
    ];

    // Install via npm/yarn
    const { execSync } = await import('child_process');
    try {
      // Try npm first
      execSync(`npm install ${dependencies.join(' ')}`, { 
        cwd: projectPath, 
        stdio: 'inherit' 
      });
      
      console.log('✅ Navigation dependencies installed successfully');
      return { success: true, dependencies };
    } catch (error) {
      console.log('⚠️ npm failed, trying yarn...');
      try {
        execSync(`yarn add ${dependencies.join(' ')}`, { 
          cwd: projectPath, 
          stdio: 'inherit' 
        });
        console.log('✅ Navigation dependencies installed with yarn');
        return { success: true, dependencies };
      } catch (yarnError) {
        console.error('❌ Failed to install dependencies with both npm and yarn');
        return { success: false, error: yarnError.message };
      }
    }
  },

  async FIX_IMPORT(code, errorInfo) {
    const missingModule = errorInfo.match[1];
    const fileName = errorInfo.match[2];
    
    // Common import fixes
    const importFixes = {
      'react': "import React from 'react';",
      'react-native': "import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList } from 'react-native';",
      '@react-navigation/native': "import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';",
      '@react-navigation/native-stack': "import { createNativeStackNavigator } from '@react-navigation/native-stack';",
      'expo-linear-gradient': "import { LinearGradient } from 'expo-linear-gradient';",
      'expo-image': "import { Image } from 'expo-image';",
      '@react-native-async-storage/async-storage': "import AsyncStorage from '@react-native-async-storage/async-storage';"
    };

    if (importFixes[missingModule]) {
      const lines = code.split('\n');
      const importLine = importFixes[missingModule];
      
      // Add import at the top
      lines.splice(0, 0, importLine);
      return lines.join('\n');
    }

    // Use AI to fix complex imports
    return await fixImportWithAI(code, missingModule, fileName);
  },

  async WRAP_TEXT(code, errorInfo) {
    // Automatically wrap bare text in Text components
    return code.replace(
      /(<[^>]+>)\s*([^<>{}\n]+)\s*(<\/[^>]+>)/g,
      (match, openTag, text, closeTag) => {
        // Skip if already wrapped in Text
        if (openTag.includes('Text') || text.trim().startsWith('{')) {
          return match;
        }
        return `${openTag}<Text>${text.trim()}</Text>${closeTag}`;
      }
    );
  },

  async ADD_REACT_IMPORT(code, errorInfo) {
    if (!code.includes("import React")) {
      return `import React from 'react';\n${code}`;
    }
    return code;
  },

  async ADD_STYLESHEET_IMPORT(code, errorInfo) {
    const rnImportMatch = code.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-native['"]/);
    if (rnImportMatch) {
      const imports = rnImportMatch[1];
      if (!imports.includes('StyleSheet')) {
        return code.replace(
          rnImportMatch[0],
          `import { ${imports}, StyleSheet } from 'react-native'`
        );
      }
    } else {
      return `import { StyleSheet } from 'react-native';\n${code}`;
    }
    return code;
  },

  async ADD_VIEW_IMPORT(code, errorInfo) {
    const rnImportMatch = code.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]react-native['"]/);
    if (rnImportMatch) {
      const imports = rnImportMatch[1];
      if (!imports.includes('View')) {
        return code.replace(
          rnImportMatch[0],
          `import { ${imports}, View } from 'react-native'`
        );
      }
    } else {
      return `import { View } from 'react-native';\n${code}`;
    }
    return code;
  },

  async WRAP_JSX_FRAGMENTS(code, errorInfo) {
    // Wrap multiple JSX elements in React.Fragment or View
    return code.replace(
      /return\s*\(\s*(<[^>]+>[\s\S]*?<\/[^>]+>)\s*(<[^>]+>[\s\S]*?<\/[^>]+>)/g,
      'return (\n<View>\n$1\n$2\n</View>'
    );
  },

  async CONVERT_CLASSNAME_TO_STYLE(code, errorInfo) {
    // Convert className to style prop
    return code.replace(/className\s*=\s*{([^}]+)}/g, 'style={styles.$1}')
               .replace(/className\s*=\s*"([^"]+)"/g, 'style={styles.$1}');
  },

  async CONVERT_ONCLICK_TO_ONPRESS(code, errorInfo) {
    // Convert onClick to onPress
    return code.replace(/onClick\s*=/g, 'onPress=');
  }
};

// AI-powered error fixing for complex cases
async function fixImportWithAI(code, missingModule, fileName) {
  const prompt = `
Fix this React Native import error:

Module: ${missingModule}
File: ${fileName}

Current code:
\`\`\`
${code}
\`\`\`

TASK: Add the correct import statement for ${missingModule} and fix any related issues.

REQUIREMENTS:
- Use React Native compatible imports only
- If it's a web-only module, convert to React Native equivalent
- Ensure all imports are properly formatted
- Return only the corrected code
`;

  try {
    const result = await callGeminiAPI(prompt, fileName, {});
    return result.code || result.convertedCode || result;
  } catch (error) {
    console.warn(`⚠️ AI import fix failed for ${missingModule}, using fallback`);
    return code; // Return original if AI fails
  }
}

// Main error detection and resolution function
export async function detectAndResolveErrors(code, filePath, projectPath) {
  let fixedCode = code;
  const appliedFixes = [];
  const errors = [];

  // Check for all error patterns
  for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const errorPattern of patterns) {
      const match = fixedCode.match(errorPattern.pattern);
      if (match) {
        errors.push({
          category,
          pattern: errorPattern.pattern,
          fix: errorPattern.fix,
          description: errorPattern.description,
          match
        });
      }
    }
  }

  // Apply fixes
  for (const error of errors) {
    try {
      if (AUTO_FIXES[error.fix]) {
        console.log(`🔧 Applying fix: ${error.description}`);
        
        if (error.fix === 'INSTALL_NAVIGATION_DEPS') {
          const result = await AUTO_FIXES[error.fix](projectPath, error);
          appliedFixes.push({ fix: error.fix, success: result.success });
        } else {
          fixedCode = await AUTO_FIXES[error.fix](fixedCode, error);
          appliedFixes.push({ fix: error.fix, success: true });
        }
      }
    } catch (fixError) {
      console.warn(`⚠️ Failed to apply fix ${error.fix}:`, fixError.message);
      appliedFixes.push({ fix: error.fix, success: false, error: fixError.message });
    }
  }

  return {
    originalCode: code,
    fixedCode,
    errors,
    appliedFixes,
    hasErrors: errors.length > 0,
    hasUnresolvedErrors: appliedFixes.some(f => !f.success)
  };
}

// Runtime error detection from Metro/build output
export function parseRuntimeErrors(buildOutput) {
  const errors = [];
  const lines = buildOutput.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Metro bundler errors
    if (line.includes('Unable to resolve module')) {
      errors.push({
        type: 'MODULE_RESOLUTION',
        message: line.trim(),
        line: i + 1
      });
    }
    
    // React Native component errors
    if (line.includes('Text strings must be rendered within a <Text> component')) {
      errors.push({
        type: 'TEXT_WRAPPING',
        message: line.trim(),
        line: i + 1
      });
    }
    
    // Style errors
    if (line.includes('Invalid prop') && line.includes('style')) {
      errors.push({
        type: 'STYLE_ERROR',
        message: line.trim(),
        line: i + 1
      });
    }
  }
  
  return errors;
}

// Comprehensive file validation
export async function validateConvertedFile(filePath, projectPath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const resolution = await detectAndResolveErrors(content, filePath, projectPath);
    
    if (resolution.hasErrors) {
      console.log(`🔍 Found ${resolution.errors.length} issues in ${path.basename(filePath)}`);
      
      // Write fixed version
      if (resolution.fixedCode !== resolution.originalCode) {
        await fs.writeFile(filePath, resolution.fixedCode);
        console.log(`✅ Auto-fixed ${resolution.appliedFixes.length} issues`);
      }
      
      return {
        isValid: !resolution.hasUnresolvedErrors,
        errors: resolution.errors,
        fixes: resolution.appliedFixes
      };
    }
    
    return { isValid: true, errors: [], fixes: [] };
  } catch (error) {
    console.error(`❌ Validation failed for ${filePath}:`, error.message);
    return { isValid: false, errors: [{ type: 'VALIDATION_ERROR', message: error.message }], fixes: [] };
  }
}

// Post-conversion validation and fixing
export async function runPostConversionValidation(projectPath, convertedFiles) {
  console.log('\n🔍 Running post-conversion validation and auto-fixing...');
  
  const validationResults = [];
  
  for (const file of convertedFiles) {
    const filePath = path.join(projectPath, file.outputPath);
    const result = await validateConvertedFile(filePath, projectPath);
    
    validationResults.push({
      file: file.outputPath,
      ...result
    });
  }
  
  const totalErrors = validationResults.reduce((sum, r) => sum + r.errors.length, 0);
  const totalFixes = validationResults.reduce((sum, r) => sum + r.fixes.length, 0);
  const validFiles = validationResults.filter(r => r.isValid).length;
  
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid files: ${validFiles}/${convertedFiles.length}`);
  console.log(`   🔧 Auto-fixes applied: ${totalFixes}`);
  console.log(`   ⚠️ Remaining issues: ${totalErrors - totalFixes}`);
  
  return {
    validationResults,
    totalFiles: convertedFiles.length,
    validFiles,
    totalErrors,
    totalFixes,
    successRate: (validFiles / convertedFiles.length) * 100
  };
} 