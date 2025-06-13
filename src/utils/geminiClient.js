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

// 🔧 AUTO-FIX ISSUES FUNCTION
async function autoFixIssues(code, fileName, issues, projectContext) {
  let fixedCode = code;
  
  for (const issue of issues) {
    if (issue.includes('Missing React import')) {
      if (!fixedCode.includes('import React')) {
        fixedCode = `import React from 'react';\n${fixedCode}`;
      }
    }
    
    if (issue.includes('Missing React Native imports')) {
      if (!fixedCode.includes('react-native')) {
        const imports = `import { View, Text, StyleSheet, ScrollView } from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';\n`;
        fixedCode = fixedCode.replace('import React from \'react\';', `import React from 'react';\n${imports}`);
      }
    }
    
    if (issue.includes('HTML elements')) {
      fixedCode = fixedCode.replace(/<div/g, '<View');
      fixedCode = fixedCode.replace(/<\/div>/g, '</View>');
      fixedCode = fixedCode.replace(/<span/g, '<Text');
      fixedCode = fixedCode.replace(/<\/span>/g, '</Text>');
      fixedCode = fixedCode.replace(/<p/g, '<Text');
      fixedCode = fixedCode.replace(/<\/p>/g, '</Text>');
      fixedCode = fixedCode.replace(/<h[1-6]/g, '<Text style={styles.heading}');
      fixedCode = fixedCode.replace(/<\/h[1-6]>/g, '</Text>');
    }
    
    if (issue.includes('Text content not properly wrapped')) {
      // This is complex, but we can add basic Text wrapping
      fixedCode = fixedCode.replace(/>\s*([A-Za-z0-9\s]+)\s*</g, (match, text) => {
        if (!text.includes('<') && text.trim()) {
          return `><Text>${text.trim()}</Text><`;
        }
        return match;
      });
    }
    
    if (issue.includes('TypeScript interfaces/types might be missing')) {
      if (fileName.endsWith('.tsx')) {
        // Add basic TypeScript interfaces
        const componentName = getComponentName(fileName);
        const interfaceDefinition = `\ninterface ${componentName}Props {\n  // Add your props here\n}\n\ninterface ${componentName}State {\n  // Add your state here\n}\n`;
        
        // Insert interface before the component
        const componentMatch = fixedCode.match(/export\s+default\s+function\s+(\w+)/);
        if (componentMatch) {
          fixedCode = fixedCode.replace(componentMatch[0], `${interfaceDefinition}\n${componentMatch[0]}`);
        }
      }
    }
  }
  
  return fixedCode;
}

// 💡 AUTO-APPLY SUGGESTIONS FUNCTION
async function autoApplySuggestions(code, fileName, suggestions, projectContext) {
  let improvedCode = code;
  
  for (const suggestion of suggestions) {
    if (suggestion.includes('localStorage') && suggestion.includes('AsyncStorage')) {
      // Add AsyncStorage import
      if (!improvedCode.includes('@react-native-async-storage/async-storage')) {
        improvedCode = improvedCode.replace(
          'import React from \'react\';',
          `import React from 'react';\nimport AsyncStorage from '@react-native-async-storage/async-storage';`
        );
      }
      
      // Replace localStorage usage
      improvedCode = improvedCode.replace(/localStorage\.setItem/g, 'AsyncStorage.setItem');
      improvedCode = improvedCode.replace(/localStorage\.getItem/g, 'AsyncStorage.getItem');
      improvedCode = improvedCode.replace(/localStorage\.removeItem/g, 'AsyncStorage.removeItem');
    }
    
    if (suggestion.includes('HTML img') && suggestion.includes('React Native Image')) {
      // Replace img tags with Image components
      if (!improvedCode.includes('react-native') || !improvedCode.includes('Image')) {
        improvedCode = improvedCode.replace(
          'from \'react-native\';',
          'from \'react-native\';\nimport { Image } from \'expo-image\';'
        );
      }
      
      improvedCode = improvedCode.replace(/<img\s+([^>]*)\s*\/?>/g, '<Image $1 />');
    }
    
    if (suggestion.includes('accessibility')) {
      // Add basic accessibility props to touchable elements
      improvedCode = improvedCode.replace(
        /<TouchableOpacity/g,
        '<TouchableOpacity accessibilityRole="button"'
      );
      
      improvedCode = improvedCode.replace(
        /<Pressable/g,
        '<Pressable accessibilityRole="button"'
      );
    }
    
    if (suggestion.includes('SafeAreaView') && !improvedCode.includes('SafeAreaView')) {
      // Wrap component in SafeAreaView if it's a screen
      if (fileName.includes('page') || fileName.includes('screen')) {
        improvedCode = improvedCode.replace(
          /return\s*\(\s*<View/,
          'return (\n    <SafeAreaView style={styles.container}>\n      <View'
        );
        
        improvedCode = improvedCode.replace(
          /<\/View>\s*\)\s*;?\s*$|<\/View>\s*\)\s*;?\s*}/,
          '</View>\n    </SafeAreaView>\n  );'
        );
      }
    }
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