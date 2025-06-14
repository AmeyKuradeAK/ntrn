import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import prompts from 'prompts';
import { fileURLToPath } from 'url';
import { RateLimiter } from './rateLimiter.js';
import { convertShadcnToReactNative, detectShadcnComponents } from './shadcnConverter.js';
import { generateUltraRobustPrompt, generateSuggestionPrompt, generateImprovementPrompt } from './perfectPrompts.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to .env in the package root
const envPath = path.resolve(__dirname, '../../.env');

// Global rate limiter instance
let rateLimiter = null;

// Initialize rate limiter
function initializeRateLimiter(config = {}) {
  if (!rateLimiter) {
    const rateLimitConfig = {
      requestsPerMinute: config.requestsPerMinute || 10, // Conservative for free tier
      requestsPerHour: config.requestsPerHour || 200,
      maxRetries: config.maxRetries || 3,
      baseDelay: config.baseDelay || 3000, // 3 seconds
      maxDelay: config.maxDelay || 60000 // 1 minute
    };
    
    rateLimiter = new RateLimiter(rateLimitConfig);
  }
  return rateLimiter;
}

// Check if .env exists; if not, ask and create it
if (!fs.existsSync(envPath)) {
  const response = await prompts({
    type: 'text',
    name: 'key',
    message: '🔐 Enter your Gemini API Key:',
    validate: value => value.trim().length > 10 || 'API key too short',
  });

  if (!response.key) {
    console.error('❌ No API key provided. Exiting.');
    process.exit(1);
  }

  fs.writeFileSync(envPath, `GEMINI_API_KEY=${response.key.trim()}\n`);
  console.log('✅ Gemini API Key saved successfully!\n');
}

// Load the saved key from .env
dotenv.config({ path: envPath });
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Specialized prompts for different file types
const SPECIALIZED_PROMPTS = {
  page: `
## SPECIALIZED INSTRUCTIONS FOR PAGE COMPONENT

This is a Next.js page component that needs to become a React Native screen:

### PAGE-SPECIFIC TRANSFORMATIONS:
1. **Screen Structure**: Wrap entire component in SafeAreaView
2. **Navigation Props**: Add proper navigation and route props typing
3. **Data Fetching**: Convert getServerSideProps/getStaticProps to useEffect patterns
4. **Meta Data**: Remove all Next.js Head elements
5. **Dynamic Routes**: Convert [param] to route.params.param
6. **Loading States**: Add proper loading skeletons
7. **Error Boundaries**: Implement error handling
8. **Pull to Refresh**: Add refresh functionality if data is fetched

### MOBILE UX ENHANCEMENTS:
- Add proper touch feedback for interactive elements
- Implement keyboard-aware scrolling
- Add loading indicators for async operations
- Use FlatList for lists with many items
- Add proper spacing for mobile touch targets (44pt minimum)
`,

  component: `
## SPECIALIZED INSTRUCTIONS FOR UI COMPONENT

This is a reusable component that needs React Native compatibility:

### COMPONENT-SPECIFIC TRANSFORMATIONS:
1. **Prop Interface**: Ensure TypeScript props are mobile-appropriate
2. **Touch Interactions**: Add proper onPress handlers with feedback
3. **Styling**: Convert to StyleSheet or NativeWind patterns
4. **Animations**: Use React Native Reanimated for smooth animations
5. **Platform Specific**: Add Platform.OS checks where needed
6. **Accessibility**: Full a11y support with proper roles and labels

### PERFORMANCE OPTIMIZATIONS:
- Use React.memo for expensive renders
- Implement proper key props for lists
- Optimize image loading and caching
- Use proper flex layouts for responsive design
`,

  layout: `
## SPECIALIZED INSTRUCTIONS FOR LAYOUT COMPONENT

This is a layout component that likely manages navigation structure:

### LAYOUT-SPECIFIC TRANSFORMATIONS:
1. **Navigation Container**: Convert to React Navigation structure
2. **Screen Management**: Implement proper screen routing
3. **Status Bar**: Add proper status bar configuration
4. **Safe Areas**: Implement SafeAreaProvider properly
5. **Theme Provider**: Adapt theme management for mobile
6. **Global State**: Setup Context or Redux providers

### NAVIGATION PATTERNS:
- Determine if this should be Stack, Tab, or Drawer navigation
- Implement proper screen transitions
- Add navigation guards and deep linking support
- Setup proper TypeScript navigation types
`
};

// Enhanced prompt generation with file type detection
function getSpecializedPrompt(fileName, sourceCode) {
  const isPage = fileName.includes('/page.') || fileName.includes('\\page.') || 
                fileName.includes('/pages/') || fileName.includes('\\pages\\');
  const isLayout = fileName.includes('layout') || fileName.includes('_app') || 
                  fileName.includes('RootLayout');
  const isComponent = !isPage && !isLayout;

  if (isPage) return SPECIALIZED_PROMPTS.page;
  if (isLayout) return SPECIALIZED_PROMPTS.layout;
  if (isComponent) return SPECIALIZED_PROMPTS.component;
  
  return '';
}

// Enhanced context analysis
function generateContextualInsights(projectContext, sourceCode) {
  const { dependencies, hasStateManagement, hasApiRoutes } = projectContext;
  
  let insights = '\n## CONTEXTUAL INTELLIGENCE\n';
  
  // Shadcn/ui detection
  const shadcnDetection = detectShadcnComponents(sourceCode, 'current-file');
  if (shadcnDetection.hasComponents) {
    insights += `- **Shadcn/ui Components Detected**: ${shadcnDetection.components.map(c => c.name).join(', ')} - Convert to React Native equivalents\n`;
  }
  
  // Framework-specific insights
  if (dependencies['@tanstack/react-query']) {
    insights += '- **React Query Detected**: Preserve query patterns, convert to mobile-optimized caching\n';
  }
  
  if (dependencies['framer-motion']) {
    insights += '- **Framer Motion Detected**: Convert to React Native Reanimated for better performance\n';
  }
  
  if (dependencies['tailwindcss']) {
    insights += '- **Tailwind CSS Detected**: Convert to NativeWind syntax for mobile compatibility\n';
  }
  
  if (hasStateManagement) {
    insights += '- **State Management Present**: Preserve Redux/Zustand patterns but adapt for mobile\n';
  }
  
  // Code pattern analysis
  if (sourceCode.includes('useEffect')) {
    insights += '- **useEffect Detected**: Ensure mobile-appropriate lifecycle management\n';
  }
  
  if (sourceCode.includes('useState')) {
    insights += '- **Local State Present**: Optimize for mobile re-renders and memory usage\n';
  }
  
  if (sourceCode.includes('router.')) {
    insights += '- **Next.js Router Usage**: Critical conversion to React Navigation required\n';
  }
  
  if (sourceCode.includes('Image')) {
    insights += '- **Image Components**: Convert to Expo Image with proper mobile optimization\n';
  }
  
  if (sourceCode.includes('form') || sourceCode.includes('input')) {
    insights += '- **Form Elements**: Implement mobile-first form patterns with proper keyboard handling\n';
  }

  return insights;
}

// Quality validation system for generated code
function validateCodeQuality(code, fileName, dependencies) {
  const issues = [];
  const suggestions = [];

  // Critical validation checks
  const criticalChecks = {
    hasReactImport: code.includes('import React') || code.includes('from "react"'),
    hasReactNativeImports: code.includes('react-native') || code.includes('expo'),
    noWebElements: !code.match(/<(div|span|p|h[1-6]|img|button|input|form|a)\b/),
    properTextWrapping: !code.match(/>\s*[A-Za-z0-9]/m) || code.includes('<Text>'),
    hasTypeScript: fileName.endsWith('.tsx') ? code.includes('interface') || code.includes('type') : true
  };

  // Web API detection for conversion suggestions (not errors)
  const webAPIPatterns = {
    localStorage: code.includes('localStorage'),
    sessionStorage: code.includes('sessionStorage'),
    windowLocation: code.includes('window.location'),
    navigator: code.includes('navigator.'),
    document: code.includes('document.'),
    windowHistory: code.includes('window.history'),
    geolocation: code.includes('navigator.geolocation'),
    clipboard: code.includes('navigator.clipboard'),
    notifications: code.includes('new Notification'),
    fileReader: code.includes('FileReader'),
    intersectionObserver: code.includes('IntersectionObserver')
  };

  // Shadcn/ui detection for conversion validation
  const shadcnPatterns = {
    shadcnImports: code.includes('@/components/ui/'),
    hasButton: code.includes('from "@/components/ui/button"'),
    hasInput: code.includes('from "@/components/ui/input"'),
    hasCard: code.includes('from "@/components/ui/card"'),
    hasDialog: code.includes('from "@/components/ui/dialog"'),
    hasSelect: code.includes('from "@/components/ui/select"'),
    hasCheckbox: code.includes('from "@/components/ui/checkbox"'),
    // Check for unconverted Shadcn usage
    unconvertedShadcn: code.match(/<(Button|Input|Card|Dialog|Select|Checkbox)\b/) && 
                      !code.includes('TouchableOpacity') && 
                      !code.includes('TextInput')
  };

  // Style and performance checks
  const styleChecks = {
    hasStyleSheet: code.includes('StyleSheet.create') || code.includes('style={{'),
    noInlineStyles: !code.match(/style=\{\{[^}]+fontSize:\s*\d+[^}]*\}\}/), // Complex inline styles
    properFlexbox: !code.includes('display: flex') || code.includes('flexDirection'),
    noWebCSS: !code.match(/\b(grid|float|position:\s*fixed)\b/)
  };

  // React Native best practices
  const rnBestPractices = {
    usesTouchable: code.includes('TouchableOpacity') || code.includes('Pressable'),
    hasSafeArea: code.includes('SafeAreaView') || !fileName.includes('page'),
    properImageUsage: !code.includes('<img') || code.includes('<Image'),
    hasAccessibility: code.includes('accessibilityLabel') || code.includes('accessibilityRole')
  };

  // Analyze critical issues
  Object.entries(criticalChecks).forEach(([check, passed]) => {
    if (!passed) {
      switch (check) {
        case 'hasReactImport':
          issues.push('❌ Missing React import');
          break;
        case 'hasReactNativeImports':
          issues.push('❌ Missing React Native imports');
          break;
        case 'noWebElements':
          issues.push('❌ Contains HTML elements instead of React Native components');
          break;
        case 'properTextWrapping':
          issues.push('❌ Text content not properly wrapped in <Text> components');
          break;
        case 'hasTypeScript':
          issues.push('⚠️ TypeScript interfaces/types might be missing');
          break;
      }
    }
  });

  // Analyze web API usage and suggest React Native alternatives
  Object.entries(webAPIPatterns).forEach(([api, detected]) => {
    if (detected) {
      switch (api) {
        case 'localStorage':
          suggestions.push('🔄 localStorage detected → Convert to AsyncStorage from @react-native-async-storage/async-storage');
          break;
        case 'sessionStorage':
          suggestions.push('🔄 sessionStorage detected → Convert to AsyncStorage with expiration logic');
          break;
        case 'windowLocation':
          suggestions.push('🔄 window.location detected → Convert to React Navigation (navigation.navigate)');
          break;
        case 'navigator':
          suggestions.push('🔄 navigator API detected → Check for specific Expo equivalents (Location, Camera, etc.)');
          break;
        case 'document':
          suggestions.push('🔄 document API detected → Convert to React Native ref patterns or remove if DOM-specific');
          break;
        case 'windowHistory':
          suggestions.push('🔄 window.history detected → Convert to React Navigation history stack');
          break;
        case 'geolocation':
          suggestions.push('🔄 Geolocation detected → Convert to expo-location');
          break;
        case 'clipboard':
          suggestions.push('🔄 Clipboard API detected → Convert to expo-clipboard');
          break;
        case 'notifications':
          suggestions.push('🔄 Web Notifications detected → Convert to expo-notifications');
          break;
        case 'fileReader':
          suggestions.push('🔄 FileReader detected → Convert to expo-file-system');
          break;
        case 'intersectionObserver':
          suggestions.push('🔄 IntersectionObserver detected → Convert to onLayout/onScroll events');
          break;
      }
    }
  });

  // Analyze Shadcn/ui usage and conversion status
  Object.entries(shadcnPatterns).forEach(([pattern, detected]) => {
    if (detected) {
      switch (pattern) {
        case 'shadcnImports':
          suggestions.push('🎨 Shadcn/ui imports detected → Convert to React Native components');
          break;
        case 'hasButton':
          suggestions.push('🔘 Shadcn Button detected → Convert to TouchableOpacity with proper styling');
          break;
        case 'hasInput':
          suggestions.push('📝 Shadcn Input detected → Convert to TextInput with proper keyboard handling');
          break;
        case 'hasCard':
          suggestions.push('🃏 Shadcn Card detected → Convert to View with card styling');
          break;
        case 'hasDialog':
          suggestions.push('💬 Shadcn Dialog detected → Convert to Modal with proper animations');
          break;
        case 'hasSelect':
          suggestions.push('📋 Shadcn Select detected → Convert to FlatList-based picker');
          break;
        case 'hasCheckbox':
          suggestions.push('☑️ Shadcn Checkbox detected → Convert to TouchableOpacity with checkbox styling');
          break;
        case 'unconvertedShadcn':
          issues.push('❌ Shadcn components found but not properly converted to React Native');
          break;
      }
    }
  });

  // Analyze style issues
  Object.entries(styleChecks).forEach(([check, passed]) => {
    if (!passed) {
      switch (check) {
        case 'hasStyleSheet':
          suggestions.push('💡 Consider using StyleSheet.create for better performance');
          break;
        case 'noInlineStyles':
          suggestions.push('💡 Complex inline styles detected - consider extracting to StyleSheet');
          break;
        case 'properFlexbox':
          suggestions.push('💡 Web CSS flexbox detected - ensure React Native compatibility');
          break;
        case 'noWebCSS':
          suggestions.push('💡 Web-specific CSS properties detected');
          break;
      }
    }
  });

  // Analyze React Native best practices
  Object.entries(rnBestPractices).forEach(([check, passed]) => {
    if (!passed) {
      switch (check) {
        case 'usesTouchable':
          suggestions.push('💡 Consider adding touchable components for better mobile UX');
          break;
        case 'hasSafeArea':
          suggestions.push('💡 Consider wrapping page components in SafeAreaView');
          break;
        case 'properImageUsage':
          suggestions.push('💡 HTML img tags detected - should use React Native Image');
          break;
        case 'hasAccessibility':
          suggestions.push('💡 Consider adding accessibility props for better UX');
          break;
      }
    }
  });

  // Calculate quality score
  const totalChecks = Object.keys(criticalChecks).length + Object.keys(styleChecks).length;
  const passedChecks = Object.values(criticalChecks).filter(Boolean).length + 
                      Object.values(styleChecks).filter(Boolean).length;
  const qualityScore = Math.round((passedChecks / totalChecks) * 100);

  return {
    qualityScore,
    issues,
    suggestions,
    isProductionReady: issues.length === 0 && qualityScore >= 80
  };
}

// Enhanced error recovery with intelligent fallbacks
function generateFallbackCode(fileName, originalCode, error) {
  const isPage = fileName.includes('/page.') || fileName.includes('\\page.');
  const isLayout = fileName.includes('layout');
  
  if (isPage) {
    return `import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ${fileName.split('/').pop().replace('.tsx', '').replace('.ts', '')}Screen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Screen Converted</Text>
        <Text style={styles.subtitle}>
          This screen was automatically converted from Next.js.
          Manual review may be needed for complex functionality.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});`;
  }

  if (isLayout) {
    return `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator();

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`;
  }

  // Generic component fallback
  return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${fileName.split('/').pop().replace('.tsx', '').replace('.ts', '')}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Component converted from Next.js</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});`;
}

export async function callGeminiAPI(sourceCode, fileName, projectContext = {}) {
  try {
    // Add Shadcn detection to project context
    const shadcnInfo = detectShadcnComponents(sourceCode, fileName);
    const enhancedContext = {
      ...projectContext,
      shadcnInfo
    };

    // Generate ultra-robust prompt
    const prompt = generateUltraRobustPrompt(sourceCode, fileName, enhancedContext);
    
    console.log(`🧠 Using ultra-robust prompt for ${fileName} (${prompt.length} chars)`);
    
    // 🚀 ROBUST CONVERSION WITH AUTO-IMPROVEMENT
    let convertedCode;
    let qualityResult;
    let attempt = 1;
    const maxAttempts = 5;
    
    while (attempt <= maxAttempts) {
      try {
        // API call with retry logic for "too short or empty" errors
        let response;
        let apiAttempt = 1;
        const maxApiAttempts = 3;
        
        while (apiAttempt <= maxApiAttempts) {
          try {
            response = await makeAPIRequest(prompt);
            convertedCode = extractCodeFromResponse(response);
            
            // Handle "Generated code is too short or empty" error
            if (!convertedCode || convertedCode.length < 50) {
              if (apiAttempt < maxApiAttempts) {
                console.log(chalk.yellow(`⚠️ Generated code too short (attempt ${apiAttempt}), retrying with enhanced prompt...`));
                
                // Enhance prompt for better results
                const enhancedPrompt = `${prompt}

CRITICAL: The previous response was too short. Please ensure you provide:
1. Complete React Native component code
2. All necessary imports
3. Full component implementation
4. Proper export statement
5. At least 100 lines of meaningful code

MINIMUM REQUIREMENTS:
- Import React and React Native components
- Complete functional component
- Proper styling with StyleSheet
- All props and state handling
- Error boundaries if needed`;
                
                apiAttempt++;
                continue;
              } else {
                throw new Error('Generated code is too short or empty after multiple attempts');
              }
            }
            
            break; // Success, exit API retry loop
          } catch (apiError) {
            if (apiAttempt < maxApiAttempts) {
              console.log(chalk.yellow(`⚠️ API attempt ${apiAttempt} failed, retrying...`));
              apiAttempt++;
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            } else {
              throw apiError;
            }
          }
        }
        
        // Basic validation and fixing
        const hasReactImport = convertedCode.includes('import React') || convertedCode.includes('from \'react\'');
        const hasExport = convertedCode.includes('export default') || convertedCode.includes('export ');
        
        if (!hasReactImport || !hasExport) {
          console.log(chalk.yellow(`⚠️ Basic validation failed for ${fileName}, applying fixes...`));
          convertedCode = ensureBasicReactNativeStructure(convertedCode, fileName);
        }
        
        // 🎯 QUALITY VALIDATION AND AUTO-IMPROVEMENT
        qualityResult = validateCodeQuality(convertedCode, fileName, {
          '@react-navigation/native': '^6.1.9',
          '@react-navigation/native-stack': '^6.9.17',
          'react-native-screens': '^3.27.0',
          'react-native-safe-area-context': '^4.7.4',
          ...shadcnInfo.dependencies
        });
        
        // Display current quality
        console.log(chalk.cyan(`📊 Quality Analysis for ${fileName} (Attempt ${attempt}):`));
        console.log(chalk.green(`  🎯 Quality Score: ${qualityResult.qualityScore}% ${qualityResult.isProductionReady ? '✅ Production Ready' : '⚠️ Needs Review'}`));
        
        // 🔧 AUTO-FIX CRITICAL ISSUES
        if (qualityResult.issues.length > 0) {
          console.log(chalk.red(`  🔧 Auto-fixing ${qualityResult.issues.length} issues...`));
          convertedCode = await autoFixIssues(convertedCode, fileName, qualityResult.issues, enhancedContext);
          
          // Re-validate after fixes
          qualityResult = validateCodeQuality(convertedCode, fileName, {
            '@react-navigation/native': '^6.1.9',
            '@react-navigation/native-stack': '^6.9.17',
            'react-native-screens': '^3.27.0',
            'react-native-safe-area-context': '^4.7.4',
            ...shadcnInfo.dependencies
          });
        }
        
        // 💡 AUTO-APPLY CRITICAL SUGGESTIONS
        if (qualityResult.suggestions.length > 0) {
          const criticalSuggestions = qualityResult.suggestions.filter(s => 
            s.includes('localStorage') || 
            s.includes('TypeScript') ||
            s.includes('accessibility') ||
            s.includes('HTML img') ||
            s.includes('Shadcn')
          );
          
          if (criticalSuggestions.length > 0) {
            console.log(chalk.yellow(`  💡 Auto-applying ${criticalSuggestions.length} critical suggestions...`));
            convertedCode = await autoApplySuggestions(convertedCode, fileName, criticalSuggestions, enhancedContext);
            
            // Re-validate after applying suggestions
            qualityResult = validateCodeQuality(convertedCode, fileName, {
              '@react-navigation/native': '^6.1.9',
              '@react-navigation/native-stack': '^6.9.17',
              'react-native-screens': '^3.27.0',
              'react-native-safe-area-context': '^4.7.4',
              ...shadcnInfo.dependencies
            });
          }
        }
        
        // Check if we've reached 100% quality or good enough
        if (qualityResult.qualityScore === 100 || (qualityResult.qualityScore >= 90 && qualityResult.issues.length === 0)) {
          console.log(chalk.green(`🎉 Perfect quality achieved for ${fileName}!`));
          break;
        } else if (qualityResult.qualityScore >= 85 && attempt === maxAttempts) {
          console.log(chalk.yellow(`✅ Good quality achieved for ${fileName} (${qualityResult.qualityScore}%)`));
          break;
        } else if (attempt < maxAttempts) {
          console.log(chalk.yellow(`🔄 Quality: ${qualityResult.qualityScore}%, attempting improvement (${attempt}/${maxAttempts})...`));
          
          // Generate improvement prompt for next iteration
          const improvementPrompt = generateTargetedImprovementPrompt(convertedCode, fileName, qualityResult, enhancedContext);
          
          // Update prompt for next iteration
          prompt = improvementPrompt;
          attempt++;
          
          // Small delay between attempts
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(chalk.yellow(`⚠️ Reached max attempts for ${fileName}, using best version (${qualityResult.qualityScore}%)`));
          break;
        }
        
      } catch (iterationError) {
        console.error(chalk.red(`❌ Iteration ${attempt} failed for ${fileName}: ${iterationError.message}`));
        
        if (attempt === maxAttempts) {
          // Use fallback for final attempt
          convertedCode = ensureBasicReactNativeStructure(generateFallbackCode(fileName, sourceCode, iterationError), fileName);
          qualityResult = validateCodeQuality(convertedCode, fileName, {});
          break;
        }
        
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Final quality display
    if (qualityResult.issues.length > 0) {
      qualityResult.issues.forEach(issue => console.log(chalk.red(`    ${issue}`)));
    }
    
    if (qualityResult.suggestions.length > 0) {
      qualityResult.suggestions.slice(0, 3).forEach(suggestion => console.log(chalk.yellow(`    ${suggestion}`)));
      if (qualityResult.suggestions.length > 3) {
        console.log(chalk.gray(`    ... and ${qualityResult.suggestions.length - 3} more suggestions`));
      }
    }
    
    console.log(`✅ Successfully converted ${fileName} (${convertedCode.length} characters, ${qualityResult.qualityScore}% quality)`);
    
    return {
      code: convertedCode,
      originalCode: sourceCode,
      dependencies: {
        '@react-navigation/native': '^6.1.9',
        '@react-navigation/native-stack': '^6.9.17',
        'react-native-screens': '^3.27.0',
        'react-native-safe-area-context': '^4.7.4',
        ...shadcnInfo.dependencies
      },
      shadcnInfo,
      qualityScore: qualityResult.qualityScore,
      qualityDetails: qualityResult,
      isProductionReady: qualityResult.isProductionReady,
      improvementAttempts: attempt - 1
    };
  } catch (error) {
    console.error(`❌ Gemini API error for ${fileName}:`, error.message);
    throw new Error(`AI conversion failed: ${error.message}`);
  }
}

// Helper function to ensure basic React Native structure
function ensureBasicReactNativeStructure(code, fileName) {
  let fixedCode = code;
  
  // Ensure React import
  if (!fixedCode.includes('import React')) {
    fixedCode = `import React from 'react';\n${fixedCode}`;
  }
  
  // Ensure React Native imports
  if (!fixedCode.includes('react-native')) {
    const imports = `import { View, Text, StyleSheet, ScrollView } from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';\n`;
    fixedCode = fixedCode.replace('import React from \'react\';', `import React from 'react';\n${imports}`);
  }
  
  // Ensure export
  if (!fixedCode.includes('export default')) {
    const componentName = getComponentName(fileName);
    fixedCode += `\n\nexport default ${componentName};`;
  }
  
  return fixedCode;
}

function createFallbackResponse(fileName, error) {
  const fallbackCode = generateFallbackCode(fileName, '', error);
  const quality = validateCodeQuality(fallbackCode, fileName, {});

  return {
    code: fallbackCode,
    dependencies: {
      '@react-navigation/native': '^6.1.0',
      'react-native-safe-area-context': '^4.8.0'
    },
    quality: {
      ...quality,
      isFallback: true,
      originalError: error.message
    }
  };
}

function getComponentName(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName));
  // Convert kebab-case or snake_case to PascalCase
  return baseName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

// Export rate limiter for external access
export function getRateLimiter() {
  return rateLimiter;
}

// Shutdown function for graceful cleanup
export async function shutdownGeminiClient() {
  if (rateLimiter) {
    await rateLimiter.shutdown();
  }
}

// Missing API request function
async function makeAPIRequest(prompt) {
  try {
    // Initialize rate limiter if not already done
    if (!rateLimiter) {
      initializeRateLimiter();
    }
    
    // Use rate limiter's addRequest method (not makeRequest)
    const response = await rateLimiter.addRequest(async () => {
      const res = await axios.post(
        `${GEMINI_ENDPOINT}?key=${API_KEY}`,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
      
      return res.data;
    }, { fileName: 'API Request' });

    const content = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content returned from Gemini API');
    }
    
    return content;
  } catch (error) {
    console.error('❌ makeAPIRequest error:', error.message);
    throw error;
  }
}

// Missing code extraction function
function extractCodeFromResponse(response) {
  if (!response || typeof response !== 'string') {
    throw new Error('Invalid response format');
  }
  
  // Try to extract code from various markdown formats
  const codeBlockRegex = /```(?:tsx|ts|jsx|js)?\n([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // Get the largest code block (usually the main component)
    const codeBlocks = matches.map(match => match[1].trim());
    const largestBlock = codeBlocks.reduce((a, b) => a.length > b.length ? a : b);
    return largestBlock;
  }
  
  // Fallback: try to find code between specific markers
  const markerRegex = /(?:CONVERTED_CODE|FINAL_CODE|COMPONENT_CODE):\s*```(?:tsx|ts|jsx|js)?\n([\s\S]*?)```/i;
  const markerMatch = response.match(markerRegex);
  if (markerMatch && markerMatch[1]) {
    return markerMatch[1].trim();
  }
  
  // Last resort: return the response as-is if it looks like code
  if (response.includes('import ') || response.includes('export ') || response.includes('function ')) {
    return response.trim();
  }
  
  throw new Error('Could not extract code from response');
}

// 🔧 AUTO-FIX ISSUES FUNCTION WITH TARGETED PROMPTS
async function autoFixIssues(code, fileName, issues, projectContext) {
  let fixedCode = code;
  let appliedFixes = [];
  let failedFixes = [];
  
  console.log(chalk.cyan(`    🔧 Starting auto-fix for ${issues.length} issues...`));
  
  for (const issue of issues) {
    const originalLength = fixedCode.length;
    let fixApplied = false;
    
    try {
      if (issue.includes('Missing React import')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        // Check if React import actually exists
        if (!fixedCode.includes('import React')) {
          const fixPrompt = `You are a React Native expert. Add the missing React import to this code.

CURRENT CODE START:
\`\`\`tsx
${fixedCode.substring(0, 300)}
\`\`\`

TASK: Add "import React from 'react';" at the very top of the file.
Return ONLY the corrected import section (first 5-10 lines including the React import).`;

          const fixResponse = await makeAPIRequest(fixPrompt);
          const importFix = extractCodeFromResponse(fixResponse);
          
          if (importFix && importFix.includes('import React')) {
            // Apply the React import at the top
            if (!fixedCode.includes('import React')) {
              fixedCode = `import React from 'react';\n${fixedCode}`;
              fixApplied = true;
              appliedFixes.push('Added React import');
            }
          }
        } else {
          appliedFixes.push('React import already exists');
          fixApplied = true;
        }
      }
      
      else if (issue.includes('Missing React Native imports')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        const fixPrompt = `You are a React Native expert. Analyze this code and add the missing React Native imports.

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

ANALYSIS TASK:
1. Look for components like View, Text, StyleSheet, ScrollView, TouchableOpacity, etc.
2. Check what imports are missing from 'react-native'
3. Add SafeAreaView import from 'react-native-safe-area-context' if needed

Return the COMPLETE import section at the top of the file with all necessary imports.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const importFix = extractCodeFromResponse(fixResponse);
        
        if (importFix && importFix.includes('react-native')) {
          // Replace or add the React Native imports
          const importLines = fixedCode.split('\n');
          const firstNonImportIndex = importLines.findIndex(line => 
            !line.trim().startsWith('import') && 
            !line.trim().startsWith('//') && 
            line.trim() !== ''
          );
          
          if (firstNonImportIndex > 0) {
            const beforeImports = importLines.slice(0, 1); // Keep React import
            const afterImports = importLines.slice(firstNonImportIndex);
            fixedCode = [...beforeImports, importFix, '', ...afterImports].join('\n');
            fixApplied = true;
            appliedFixes.push('Added React Native imports');
          }
        }
      }
      
      else if (issue.includes('HTML elements')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        const fixPrompt = `You are a React Native expert. Convert ALL HTML elements to React Native components in this code.

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

CONVERSION RULES (STRICT):
- <div> → <View>
- <span>, <p>, <h1-h6> → <Text>
- <img> → <Image> (from react-native)
- <button> → <TouchableOpacity>
- <input> → <TextInput>
- Remove ALL HTML attributes that don't exist in React Native
- Keep className as style prop where applicable
- Maintain component structure and content

CRITICAL: Return the COMPLETE corrected code with NO HTML elements remaining.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const htmlFix = extractCodeFromResponse(fixResponse);
        
        if (htmlFix && htmlFix.length > fixedCode.length * 0.7 && !htmlFix.match(/<(div|span|p|h[1-6]|img|button|input)\b/)) {
          fixedCode = htmlFix;
          fixApplied = true;
          appliedFixes.push('Converted HTML elements to React Native components');
        }
      }
      
      else if (issue.includes('Text content not properly wrapped')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        const fixPrompt = `You are a React Native expert. Fix text wrapping issues in this code.

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

CRITICAL RULES:
1. ALL text content MUST be wrapped in <Text> components
2. Find any bare text (text not inside <Text>...</Text>)
3. Wrap it properly: <Text>your text here</Text>
4. Maintain all styling and functionality
5. NO bare text should remain outside <Text> components

Return the COMPLETE corrected code with ALL text properly wrapped.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const textFix = extractCodeFromResponse(fixResponse);
        
        if (textFix && textFix.length > fixedCode.length * 0.7) {
          // Validate that text is properly wrapped
          const hasUnwrappedText = textFix.match(/>\s*[A-Za-z0-9][^<>]*[A-Za-z0-9]\s*</);
          if (!hasUnwrappedText || textFix.includes('<Text>')) {
            fixedCode = textFix;
            fixApplied = true;
            appliedFixes.push('Fixed text wrapping');
          }
        }
      }
      
      else if (issue.includes('TypeScript interfaces/types might be missing')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        const fixPrompt = `You are a TypeScript + React Native expert. Add proper TypeScript interfaces to this component.

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

TYPESCRIPT ENHANCEMENT TASK:
1. Analyze component props (if any)
2. Analyze component state (if any)  
3. Create proper interfaces (e.g., ComponentNameProps, ComponentNameState)
4. Add type annotations to function parameters
5. Ensure proper TypeScript syntax

Return the COMPLETE code with proper TypeScript interfaces and types.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const typeFix = extractCodeFromResponse(fixResponse);
        
        if (typeFix && typeFix.includes('interface') && typeFix.length > fixedCode.length * 0.8) {
          fixedCode = typeFix;
          fixApplied = true;
          appliedFixes.push('Added TypeScript interfaces');
        }
      }
      
      else if (issue.includes('Shadcn components found but not properly converted')) {
        console.log(`    🔧 Fixing: ${issue}`);
        
        const fixPrompt = `You are a React Native expert. Convert ALL Shadcn UI components to React Native equivalents.

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

SHADCN CONVERSION REQUIREMENTS:
1. Remove ALL @/components/ui/ imports
2. Replace Shadcn components:
   - Button → TouchableOpacity with proper styling
   - Input → TextInput with proper styling  
   - Card → View with card-like styling
   - Dialog → Modal component
   - Select → Custom picker/dropdown
3. Add React Native imports for new components
4. Convert className props to style props
5. Maintain all functionality

CRITICAL: Return COMPLETE code with NO Shadcn imports remaining.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const shadcnFix = extractCodeFromResponse(fixResponse);
        
        if (shadcnFix && !shadcnFix.includes('@/components/ui/') && shadcnFix.length > fixedCode.length * 0.7) {
          fixedCode = shadcnFix;
          fixApplied = true;
          appliedFixes.push('Converted Shadcn components');
        }
      }
      
      // Validation check
      if (fixApplied) {
        const newLength = fixedCode.length;
        console.log(chalk.green(`      ✅ Fix applied (${originalLength} → ${newLength} chars)`));
      } else {
        console.log(chalk.yellow(`      ⚠️ Fix not applied - validation failed`));
        failedFixes.push(issue);
      }
      
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (fixError) {
      console.log(chalk.red(`      ❌ Fix failed: ${fixError.message}`));
      failedFixes.push(issue);
    }
  }
  
  // Summary
  console.log(chalk.cyan(`    📋 Auto-fix Summary:`));
  console.log(chalk.green(`      ✅ Applied: ${appliedFixes.length} fixes`));
  if (appliedFixes.length > 0) {
    appliedFixes.forEach(fix => console.log(chalk.green(`        • ${fix}`)));
  }
  
  if (failedFixes.length > 0) {
    console.log(chalk.yellow(`      ⚠️ Failed: ${failedFixes.length} fixes`));
    failedFixes.forEach(fix => console.log(chalk.yellow(`        • ${fix}`)));
  }
  
  return fixedCode;
}

// 💡 AUTO-APPLY SUGGESTIONS FUNCTION WITH TARGETED PROMPTS  
async function autoApplySuggestions(code, fileName, suggestions, projectContext) {
  let improvedCode = code;
  let appliedSuggestions = [];
  let failedSuggestions = [];
  
  console.log(chalk.cyan(`    💡 Starting suggestion application for ${suggestions.length} suggestions...`));
  
  for (const suggestion of suggestions) {
    const originalLength = improvedCode.length;
    let suggestionApplied = false;
    
    try {
      if (suggestion.includes('localStorage') && suggestion.includes('AsyncStorage')) {
        console.log(`    💡 Applying: localStorage → AsyncStorage conversion`);
        
        const suggestionPrompt = `You are a React Native expert. Convert localStorage to AsyncStorage in this code.

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

CONVERSION REQUIREMENTS:
1. Add import: import AsyncStorage from '@react-native-async-storage/async-storage';
2. Replace localStorage.setItem → await AsyncStorage.setItem (async)
3. Replace localStorage.getItem → await AsyncStorage.getItem (async)  
4. Replace localStorage.removeItem → await AsyncStorage.removeItem (async)
5. Make functions async where needed
6. Add proper error handling with try/catch
7. Handle null returns from AsyncStorage.getItem

CRITICAL: Return COMPLETE code with NO localStorage usage remaining.`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const storageFix = extractCodeFromResponse(suggestionResponse);
        
        if (storageFix && storageFix.includes('AsyncStorage') && !storageFix.includes('localStorage') && storageFix.length > improvedCode.length * 0.8) {
          improvedCode = storageFix;
          suggestionApplied = true;
          appliedSuggestions.push('Converted localStorage to AsyncStorage');
        }
      }
      
      else if (suggestion.includes('HTML img') && suggestion.includes('React Native Image')) {
        console.log(`    💡 Applying: HTML img → React Native Image conversion`);
        
        const suggestionPrompt = `You are a React Native expert. Convert HTML img tags to React Native Image components.

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

IMAGE CONVERSION REQUIREMENTS:
1. Add Image import: import { Image } from 'react-native' or 'expo-image'
2. Convert <img src="..." alt="..." /> to <Image source={{uri: "..."}} />
3. Convert local images: <img src="./image.png" /> to <Image source={require('./image.png')} />
4. Add proper styling and dimensions (width, height)
5. Convert accessibility: alt → accessibilityLabel
6. Handle resizeMode prop appropriately

CRITICAL: Return COMPLETE code with NO <img> tags remaining.`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const imageFix = extractCodeFromResponse(suggestionResponse);
        
        if (imageFix && imageFix.includes('Image') && !imageFix.includes('<img') && imageFix.length > improvedCode.length * 0.8) {
          improvedCode = imageFix;
          suggestionApplied = true;
          appliedSuggestions.push('Converted HTML img to React Native Image');
        }
      }
      
      else if (suggestion.includes('accessibility')) {
        console.log(`    💡 Applying: Accessibility improvements`);
        
        const suggestionPrompt = `You are a React Native accessibility expert. Add comprehensive accessibility props to this component.

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

ACCESSIBILITY ENHANCEMENT REQUIREMENTS:
1. Add accessibilityRole to interactive elements ("button", "link", "text", "image")
2. Add accessibilityLabel for meaningful descriptions
3. Add accessibilityHint for additional context where needed
4. Add accessibilityState for buttons (disabled, selected, etc.)
5. Ensure minimum touch target size (44pt minimum)
6. Add accessible={true} where needed
7. Handle focus management for screen readers

Return the COMPLETE code with comprehensive accessibility improvements:`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const accessibilityFix = extractCodeFromResponse(suggestionResponse);
        
        if (accessibilityFix && accessibilityFix.includes('accessibility') && accessibilityFix.length > improvedCode.length * 0.8) {
          improvedCode = accessibilityFix;
          suggestionApplied = true;
          appliedSuggestions.push('Added accessibility improvements');
        }
      }
      
      else if (suggestion.includes('SafeAreaView')) {
        console.log(`    💡 Applying: SafeAreaView wrapping`);
        
        const suggestionPrompt = `You are a React Native expert. Add SafeAreaView wrapper to this screen component.

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

SAFEAREAVIEW REQUIREMENTS:
1. Add import: import { SafeAreaView } from 'react-native-safe-area-context'
2. Wrap the main return content in <SafeAreaView>
3. Add proper container styling (flex: 1 usually)
4. Maintain existing styling and layout
5. Handle proper nesting with other containers
6. Ensure no layout breaking changes

Return the COMPLETE code with SafeAreaView properly integrated:`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const safeAreaFix = extractCodeFromResponse(suggestionResponse);
        
        if (safeAreaFix && safeAreaFix.includes('SafeAreaView') && safeAreaFix.length > improvedCode.length * 0.8) {
          improvedCode = safeAreaFix;
          suggestionApplied = true;
          appliedSuggestions.push('Added SafeAreaView wrapper');
        }
      }
      
      else if (suggestion.includes('Shadcn')) {
        console.log(`    💡 Applying: Shadcn UI conversion`);
        
        const suggestionPrompt = `You are a React Native expert. Convert ALL Shadcn UI components to React Native equivalents.

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

SHADCN CONVERSION REQUIREMENTS:
1. Remove ALL @/components/ui/ imports  
2. Component conversions:
   - Button → TouchableOpacity with proper styling
   - Input → TextInput with React Native styling
   - Card → View with card-like shadow/border styling
   - Dialog → Modal with proper animations
   - Select → Custom picker with FlatList
3. Convert className props → style props with StyleSheet
4. Add React Native component imports
5. Maintain all functionality and event handlers
6. Add proper React Native styling equivalents

CRITICAL: Return COMPLETE code with NO @/components/ui/ imports remaining.`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const shadcnFix = extractCodeFromResponse(suggestionResponse);
        
        if (shadcnFix && !shadcnFix.includes('@/components/ui/') && shadcnFix.length > improvedCode.length * 0.7) {
          improvedCode = shadcnFix;
          suggestionApplied = true;
          appliedSuggestions.push('Converted Shadcn UI components');
        }
      }
      
      // Validation check
      if (suggestionApplied) {
        const newLength = improvedCode.length;
        console.log(chalk.green(`      ✅ Suggestion applied (${originalLength} → ${newLength} chars)`));
      } else {
        console.log(chalk.yellow(`      ⚠️ Suggestion not applied - validation failed`));
        failedSuggestions.push(suggestion);
      }
      
      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (suggestionError) {
      console.log(chalk.red(`      ❌ Suggestion failed: ${suggestionError.message}`));
      failedSuggestions.push(suggestion);
    }
  }
  
  // Summary
  console.log(chalk.cyan(`    📋 Suggestion Application Summary:`));
  console.log(chalk.green(`      ✅ Applied: ${appliedSuggestions.length} suggestions`));
  if (appliedSuggestions.length > 0) {
    appliedSuggestions.forEach(suggestion => console.log(chalk.green(`        • ${suggestion}`)));
  }
  
  if (failedSuggestions.length > 0) {
    console.log(chalk.yellow(`      ⚠️ Failed: ${failedSuggestions.length} suggestions`));
    failedSuggestions.forEach(suggestion => console.log(chalk.yellow(`        • ${suggestion.substring(0, 50)}...`)));
  }
  
  return improvedCode;
}

// 🎯 GENERATE TARGETED IMPROVEMENT PROMPT
function generateTargetedImprovementPrompt(currentCode, fileName, qualityResult, projectContext) {
  const issues = qualityResult.issues.join('\n- ');
  const suggestions = qualityResult.suggestions.slice(0, 5).join('\n- ');
  
  return `You are an expert React Native developer. Please improve this code to achieve 100% quality.

CURRENT CODE:
\`\`\`tsx
${currentCode}
\`\`\`

CURRENT QUALITY SCORE: ${qualityResult.qualityScore}%

CRITICAL ISSUES TO FIX:
- ${issues}

KEY SUGGESTIONS TO IMPLEMENT:
- ${suggestions}

REQUIREMENTS FOR 100% QUALITY:
1. All React Native imports must be present
2. No HTML elements (use View, Text, etc.)
3. Proper TypeScript interfaces if .tsx file
4. All text wrapped in <Text> components
5. Accessibility props added
6. SafeAreaView for screen components
7. StyleSheet.create for styling
8. Error handling and loading states
9. Mobile-optimized touch targets (44pt minimum)
10. Proper navigation integration

FILE TYPE: ${fileName}
PROJECT CONTEXT: ${JSON.stringify(projectContext, null, 2)}

Please return the COMPLETE improved code that addresses all issues and suggestions:`;
}