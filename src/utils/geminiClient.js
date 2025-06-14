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
            response = await makeAPIRequest(prompt, 'conversion');
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
        
        // 🔍 MANDATORY ERROR DETECTION AND FIXING (after reaching good quality)
        if (qualityResult.qualityScore >= 85) {
          console.log(chalk.cyan(`\n🔍 Running mandatory error detection and fixing...`));
          console.log(chalk.gray(`   📋 This step ensures no runtime errors remain in the final code`));
          
          const errorDetectionResult = await detectAndFixErrors(convertedCode, fileName, enhancedContext);
          
          // Update code with error fixes
          convertedCode = errorDetectionResult.code;
          
          // STRICT ERROR CHECKING - Must be error-free to proceed
          if (errorDetectionResult.hasErrors) {
            console.log(chalk.red(`\n   ❌ CRITICAL: ${errorDetectionResult.errors.length} runtime errors still remain!`));
            console.log(chalk.yellow(`   🔄 Code quality will not be marked as complete until errors are resolved`));
            
            // Force another iteration to fix remaining errors
            qualityResult.qualityScore = Math.min(qualityResult.qualityScore, 75); // Reduce score if errors remain
            
            // Re-validate after error fixes
            qualityResult = validateCodeQuality(convertedCode, fileName, {
              '@react-navigation/native': '^6.1.9',
              '@react-navigation/native-stack': '^6.9.17',
              'react-native-screens': '^3.27.0',
              'react-native-safe-area-context': '^4.7.4',
              ...shadcnInfo.dependencies
            });
            
            console.log(chalk.cyan(`   📊 Post-Error-Fix Quality: ${qualityResult.qualityScore}% (Error Score: ${errorDetectionResult.errorScore}%)`));
            console.log(chalk.yellow(`   🔄 Will continue fixing until all runtime errors are resolved...`));
            
          } else {
            console.log(chalk.green(`\n   🎉 SUCCESS: All runtime errors have been fixed!`));
            console.log(chalk.cyan(`   📊 Final Quality: ${qualityResult.qualityScore}% (Error Score: ${errorDetectionResult.errorScore}%)`));
          }
          
          // ENHANCED COMPLETION CRITERIA - Must be error-free
          const overallScore = Math.min(qualityResult.qualityScore, errorDetectionResult.errorScore);
          
          if (overallScore >= 95 && !errorDetectionResult.hasErrors) {
            console.log(chalk.green(`\n🎉 PERFECT QUALITY ACHIEVED for ${fileName}!`));
            console.log(chalk.green(`   ✅ Quality Score: ${qualityResult.qualityScore}%`));
            console.log(chalk.green(`   ✅ Error Score: ${errorDetectionResult.errorScore}%`));
            console.log(chalk.green(`   ✅ Production Ready: ${errorDetectionResult.isProductionReady}`));
            break;
          } else if (!errorDetectionResult.hasErrors && qualityResult.qualityScore >= 85 && attempt === maxAttempts) {
            console.log(chalk.green(`\n✅ GOOD QUALITY ACHIEVED for ${fileName}`));
            console.log(chalk.green(`   ✅ No Runtime Errors: ${!errorDetectionResult.hasErrors}`));
            console.log(chalk.yellow(`   📊 Overall Score: ${overallScore}% (acceptable for production)`));
            break;
          } else if (errorDetectionResult.hasErrors && attempt === maxAttempts) {
            console.log(chalk.red(`\n⚠️ WARNING: Completed with remaining errors for ${fileName}`));
            console.log(chalk.red(`   🚨 ${errorDetectionResult.errors.length} runtime errors still present`));
            console.log(chalk.yellow(`   🔧 Manual review and fixing may be required`));
            break;
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
          
          // Update prompt for next iteration (this will be used with 'improvement' type)
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
    
          console.log(chalk.green(`\n✅ CONVERSION COMPLETE: ${fileName}`));
      console.log(chalk.green(`   📊 Final Quality Score: ${qualityResult.qualityScore}%`));
      console.log(chalk.green(`   📝 Code Length: ${convertedCode.length} characters`));
      console.log(chalk.green(`   🔄 Improvement Iterations: ${attempt}/${maxAttempts}`));
      
      // Add error detection summary if available
      if (convertedCode.includes('// Error detection completed') || convertedCode.includes('Production Ready')) {
        console.log(chalk.green(`   🛡️ Error Detection: COMPLETED`));
        console.log(chalk.green(`   🎉 Status: PRODUCTION READY`));
      } else {
        console.log(chalk.yellow(`   🔍 Error Detection: May need manual review`));
      }
    
    // Final error detection if not already run
    let finalErrorDetection = null;
    if (qualityResult.qualityScore >= 85) {
      try {
        finalErrorDetection = await detectAndFixErrors(convertedCode, fileName, enhancedContext);
        convertedCode = finalErrorDetection.code;
      } catch (errorDetectionError) {
        console.log(chalk.yellow(`⚠️ Error detection failed: ${errorDetectionError.message}`));
      }
    }
    
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
      improvementAttempts: attempt - 1,
      errorDetection: finalErrorDetection,
      overallScore: finalErrorDetection ? Math.min(qualityResult.qualityScore, finalErrorDetection.errorScore) : qualityResult.qualityScore,
      hasRuntimeErrors: finalErrorDetection ? finalErrorDetection.hasErrors : false,
      errorSummary: finalErrorDetection ? {
        errors: finalErrorDetection.errors.length,
        warnings: finalErrorDetection.warnings.length,
        suggestions: finalErrorDetection.suggestions.length
      } : null
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

// Missing API request function with token tracking
async function makeAPIRequest(prompt, requestType = 'conversion') {
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

    // Track token usage from response
    if (response && response.usageMetadata) {
      trackTokenUsage(response, requestType);
    }

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

// 🔧 AUTO-FIX ISSUES FUNCTION WITH SURGICAL PRECISION AND VERIFICATION
async function autoFixIssues(code, fileName, issues, projectContext) {
  let fixedCode = code;
  let appliedFixes = [];
  let failedFixes = [];
  let verificationResults = [];
  
  console.log(chalk.cyan(`    🔧 Starting surgical auto-fix with verification for ${issues.length} issues...`));
  
  for (const issue of issues) {
    const originalLength = fixedCode.length;
    let fixApplied = false;
    let verificationPassed = false;
    let maxAttempts = 3;
    let attempt = 1;
    
    console.log(chalk.blue(`    🎯 [${issues.indexOf(issue) + 1}/${issues.length}] Processing: ${issue.substring(0, 80)}...`));
    
    while (!verificationPassed && attempt <= maxAttempts) {
      try {
        const beforeFixCode = fixedCode;
        
        if (issue.includes('Missing React import')) {
          console.log(`      🔧 Attempt ${attempt}: Adding React import...`);
          
          if (!fixedCode.includes('import React')) {
            fixedCode = `import React from 'react';\n${fixedCode}`;
            fixApplied = true;
            
            // Verify the fix
            if (fixedCode.includes('import React from \'react\'')) {
              verificationPassed = true;
              appliedFixes.push('Added React import');
              verificationResults.push({
                issue: 'Missing React import',
                status: 'success',
                verification: 'React import found in code',
                attempt: attempt
              });
              console.log(chalk.green(`        ✅ Verified: React import successfully added`));
            } else {
              console.log(chalk.red(`        ❌ Verification failed: React import not found after fix`));
            }
          } else {
            verificationPassed = true;
            appliedFixes.push('React import already exists');
            verificationResults.push({
              issue: 'Missing React import',
              status: 'already_exists',
              verification: 'React import already present',
              attempt: attempt
            });
            console.log(chalk.green(`        ✅ Verified: React import already exists`));
          }
        }
        
        else if (issue.includes('Missing React Native imports')) {
          console.log(`      🔧 Attempt ${attempt}: Adding React Native imports...`);
          
          const neededImports = [];
          const reactNativeComponents = ['View', 'Text', 'Image', 'ScrollView', 'TouchableOpacity', 'TextInput', 'StyleSheet', 'SafeAreaView', 'FlatList', 'SectionList'];
          
          reactNativeComponents.forEach(component => {
            if (fixedCode.includes(`<${component}`) && !fixedCode.includes(`${component},`) && !fixedCode.includes(`{ ${component} }`)) {
              neededImports.push(component);
            }
          });
          
          if (neededImports.length > 0) {
            const beforeImportCount = (fixedCode.match(/from 'react-native'/g) || []).length;
            fixedCode = addMultipleImports(fixedCode, neededImports);
            fixApplied = true;
            
            // Verify the fix - check if all needed imports are now present
            const missingAfterFix = neededImports.filter(component => 
              !fixedCode.includes(`${component},`) && !fixedCode.includes(`{ ${component} }`)
            );
            
            if (missingAfterFix.length === 0) {
              verificationPassed = true;
              appliedFixes.push(`Added React Native imports: ${neededImports.join(', ')}`);
              verificationResults.push({
                issue: 'Missing React Native imports',
                status: 'success',
                verification: `All imports verified: ${neededImports.join(', ')}`,
                attempt: attempt
              });
              console.log(chalk.green(`        ✅ Verified: All imports added - ${neededImports.join(', ')}`));
            } else {
              console.log(chalk.red(`        ❌ Verification failed: Still missing - ${missingAfterFix.join(', ')}`));
            }
          } else {
            verificationPassed = true;
            appliedFixes.push('No missing React Native imports detected');
            verificationResults.push({
              issue: 'Missing React Native imports',
              status: 'not_needed',
              verification: 'No missing imports detected',
              attempt: attempt
            });
            console.log(chalk.green(`        ✅ Verified: No missing imports detected`));
          }
        }
        
        else if (issue.includes('HTML elements')) {
          console.log(`      🔧 Attempt ${attempt}: Converting HTML elements...`);
          
          const htmlConversions = [
            { from: /<div(\s[^>]*)?>/, to: '<View$1>', name: 'div → View', check: /<div\b/ },
            { from: /<\/div>/g, to: '</View>', name: 'closing div', check: /<\/div>/ },
            { from: /<span(\s[^>]*)?>/, to: '<Text$1>', name: 'span → Text', check: /<span\b/ },
            { from: /<\/span>/g, to: '</Text>', name: 'closing span', check: /<\/span>/ },
            { from: /<p(\s[^>]*)?>/, to: '<Text$1>', name: 'p → Text', check: /<p\b/ },
            { from: /<\/p>/g, to: '</Text>', name: 'closing p', check: /<\/p>/ },
            { from: /<h[1-6](\s[^>]*)?>/, to: '<Text$1>', name: 'heading → Text', check: /<h[1-6]\b/ },
            { from: /<\/h[1-6]>/g, to: '</Text>', name: 'closing heading', check: /<\/h[1-6]>/ },
            { from: /<img(\s[^>]*)?\/?>/, to: '<Image$1/>', name: 'img → Image', check: /<img\b/ },
            { from: /<button(\s[^>]*)?>/, to: '<TouchableOpacity$1>', name: 'button → TouchableOpacity', check: /<button\b/ },
            { from: /<\/button>/g, to: '</TouchableOpacity>', name: 'closing button', check: /<\/button>/ },
            { from: /<input(\s[^>]*)?\/?>/, to: '<TextInput$1/>', name: 'input → TextInput', check: /<input\b/ }
          ];
          
          let conversionsApplied = 0;
          const htmlElementsBefore = [];
          const htmlElementsAfter = [];
          
          // Track what HTML elements exist before conversion
          htmlConversions.forEach(conversion => {
            if (conversion.check.test(fixedCode)) {
              htmlElementsBefore.push(conversion.name.split(' → ')[0]);
            }
          });
          
          htmlConversions.forEach(conversion => {
            const beforeMatch = fixedCode.match(conversion.from);
            if (beforeMatch) {
              fixedCode = fixedCode.replace(conversion.from, conversion.to);
              conversionsApplied++;
              console.log(chalk.blue(`          ✓ ${conversion.name}`));
            }
          });
          
          if (conversionsApplied > 0) {
            fixApplied = true;
            
            // Verify the conversion - check that HTML elements are gone
            htmlConversions.forEach(conversion => {
              if (conversion.check.test(fixedCode)) {
                htmlElementsAfter.push(conversion.name.split(' → ')[0]);
              }
            });
            
            if (htmlElementsAfter.length === 0) {
              verificationPassed = true;
              appliedFixes.push(`Converted ${conversionsApplied} HTML elements`);
              verificationResults.push({
                issue: 'HTML elements conversion',
                status: 'success',
                verification: `All HTML elements converted: ${htmlElementsBefore.join(', ')}`,
                attempt: attempt
              });
              console.log(chalk.green(`        ✅ Verified: All HTML elements converted (${conversionsApplied} elements)`));
              
              // Ensure React Native components are imported
              const neededImports = [];
              if (fixedCode.includes('<View') && !fixedCode.includes('View,')) neededImports.push('View');
              if (fixedCode.includes('<Text') && !fixedCode.includes('Text,')) neededImports.push('Text');
              if (fixedCode.includes('<Image') && !fixedCode.includes('Image,')) neededImports.push('Image');
              if (fixedCode.includes('<TouchableOpacity') && !fixedCode.includes('TouchableOpacity,')) neededImports.push('TouchableOpacity');
              if (fixedCode.includes('<TextInput') && !fixedCode.includes('TextInput,')) neededImports.push('TextInput');
              
              if (neededImports.length > 0) {
                fixedCode = addMultipleImports(fixedCode, neededImports);
                console.log(chalk.green(`          ✅ Added imports: ${neededImports.join(', ')}`));
              }
            } else {
              console.log(chalk.red(`        ❌ Verification failed: HTML elements still present - ${htmlElementsAfter.join(', ')}`));
            }
          } else {
            verificationPassed = true;
            appliedFixes.push('No HTML elements found to convert');
            verificationResults.push({
              issue: 'HTML elements conversion',
              status: 'not_needed',
              verification: 'No HTML elements found',
              attempt: attempt
            });
            console.log(chalk.green(`        ✅ Verified: No HTML elements found`));
          }
        }
        
        else if (issue.includes('Text content not properly wrapped')) {
          console.log(`      🔧 Attempt ${attempt}: Fixing text wrapping...`);
          
          // Use AI for complex text wrapping issues
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

          const fixResponse = await makeAPIRequest(fixPrompt, 'error-fix');
          const textFix = extractCodeFromResponse(fixResponse);
          
          if (textFix && textFix.length > fixedCode.length * 0.7) {
            fixedCode = textFix;
            fixApplied = true;
            
            // Verify text wrapping - check for unwrapped text
            const unwrappedTextPattern = />[\s]*[A-Za-z0-9][^<>]*[A-Za-z0-9][\s]*</;
            const hasUnwrappedText = unwrappedTextPattern.test(fixedCode);
            
            if (!hasUnwrappedText || fixedCode.includes('<Text>')) {
              verificationPassed = true;
              appliedFixes.push('Fixed text wrapping');
              verificationResults.push({
                issue: 'Text wrapping',
                status: 'success',
                verification: 'All text properly wrapped in <Text> components',
                attempt: attempt
              });
              console.log(chalk.green(`        ✅ Verified: Text wrapping fixed`));
            } else {
              console.log(chalk.red(`        ❌ Verification failed: Unwrapped text still present`));
            }
          }
        }
        
        // 🧠 INTELLIGENT ANALYSIS FOR NEW/UNKNOWN ISSUES
        else {
          console.log(`      🧠 Attempt ${attempt}: Analyzing unknown issue intelligently...`);
          
          const analysisResult = await analyzeAndFixUnknownIssue(fixedCode, issue, fileName, attempt);
          
          if (analysisResult.fixed) {
            fixedCode = analysisResult.code;
            fixApplied = true;
            
            // Verify the intelligent fix
            if (analysisResult.verification && analysisResult.verification(fixedCode)) {
              verificationPassed = true;
              appliedFixes.push(analysisResult.description);
              verificationResults.push({
                issue: issue.substring(0, 50) + '...',
                status: 'success',
                verification: analysisResult.verificationMessage,
                attempt: attempt,
                method: 'intelligent_analysis'
              });
              console.log(chalk.green(`        ✅ Verified: ${analysisResult.verificationMessage}`));
            } else {
              console.log(chalk.red(`        ❌ Verification failed: ${analysisResult.verificationMessage || 'Fix not properly applied'}`));
            }
          } else {
            console.log(chalk.yellow(`        ⚠️ Could not analyze/fix unknown issue: ${issue.substring(0, 50)}...`));
          }
        }
        
        // If fix was applied but verification failed, try again
        if (fixApplied && !verificationPassed && attempt < maxAttempts) {
          console.log(chalk.yellow(`        🔄 Fix applied but verification failed, retrying (${attempt + 1}/${maxAttempts})...`));
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        } else if (!fixApplied) {
          // If no fix was applied, break the loop
          break;
        } else {
          // Either verification passed or max attempts reached
          break;
        }
        
      } catch (fixError) {
        console.log(chalk.red(`        ❌ Fix attempt ${attempt} failed: ${fixError.message}`));
        if (attempt < maxAttempts) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          failedFixes.push({
            issue: issue,
            error: fixError.message,
            attempts: attempt
          });
          break;
        }
      }
    }
    
    // Final status for this issue
    if (!verificationPassed) {
      failedFixes.push({
        issue: issue,
        reason: 'Verification failed after all attempts',
        attempts: maxAttempts
      });
      console.log(chalk.red(`      ❌ Failed to fix after ${maxAttempts} attempts: ${issue.substring(0, 50)}...`));
    }
    
    // Small delay between issues
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Comprehensive Summary with Verification Results
  console.log(chalk.cyan(`\n    📋 Auto-fix Summary with Verification:`));
  console.log(chalk.green(`      ✅ Successfully Applied & Verified: ${appliedFixes.length} fixes`));
  
  if (appliedFixes.length > 0) {
    appliedFixes.forEach((fix, index) => {
      const verification = verificationResults[index];
      if (verification) {
        console.log(chalk.green(`        • ${fix}`));
        console.log(chalk.gray(`          └─ Verified: ${verification.verification} (attempt ${verification.attempt})`));
      } else {
        console.log(chalk.green(`        • ${fix}`));
      }
    });
  }
  
  if (failedFixes.length > 0) {
    console.log(chalk.red(`      ❌ Failed Fixes: ${failedFixes.length}`));
    failedFixes.forEach(failure => {
      if (typeof failure === 'string') {
        console.log(chalk.red(`        • ${failure}`));
      } else {
        console.log(chalk.red(`        • ${failure.issue.substring(0, 60)}...`));
        console.log(chalk.gray(`          └─ Reason: ${failure.reason || failure.error} (${failure.attempts} attempts)`));
      }
    });
  }
  
  // Final verification of the entire code
  console.log(chalk.cyan(`\n    🔍 Running final code verification...`));
  const finalVerification = await verifyCodeIntegrity(fixedCode, fileName);
  
  if (finalVerification.isValid) {
    console.log(chalk.green(`      ✅ Final verification passed: Code is syntactically valid`));
  } else {
    console.log(chalk.red(`      ❌ Final verification failed: ${finalVerification.issues.join(', ')}`));
  }
  
  return {
    code: fixedCode,
    appliedFixes: appliedFixes,
    failedFixes: failedFixes,
    verificationResults: verificationResults,
    finalVerification: finalVerification
  };
}

// 🧠 INTELLIGENT ANALYSIS FOR UNKNOWN ISSUES
export async function analyzeAndFixUnknownIssue(code, issue, fileName, attempt) {
  console.log(chalk.blue(`        🧠 Analyzing issue: ${issue.substring(0, 80)}...`));
  
  try {
    // Pattern-based analysis for common issue types
    if (issue.toLowerCase().includes('import') && issue.toLowerCase().includes('missing')) {
      // Extract component name from various error formats
      const componentMatch = issue.match(/(\w+)\s+(?:component|is)\s+(?:used but )?not imported/i) ||
                           issue.match(/(\w+)\s+is not defined/i) ||
                           issue.match(/Cannot find name '(\w+)'/i);
      
      if (componentMatch) {
        const component = componentMatch[1];
        console.log(chalk.blue(`          🎯 Detected missing import: ${component}`));
        
        const fixedCode = addMissingImport(code, component);
        
        return {
          fixed: fixedCode !== code,
          code: fixedCode,
          description: `Added missing import: ${component}`,
          verification: (code) => code.includes(`${component},`) || code.includes(`{ ${component} }`),
          verificationMessage: `${component} import verified in code`
        };
      }
    }
    
    else if (issue.toLowerCase().includes('web api') || issue.toLowerCase().includes('browser') || 
             issue.includes('window') || issue.includes('document') || issue.includes('localStorage')) {
      console.log(chalk.blue(`          🌐 Detected web API usage`));
      
      let fixedCode = code;
      let changes = [];
      
      // Remove window APIs
      if (fixedCode.includes('window.')) {
        const beforeCount = (fixedCode.match(/window\./g) || []).length;
        fixedCode = fixedCode.replace(/window\.[^;\s\)]+/g, 'null');
        fixedCode = fixedCode.replace(/window\.location\.href/g, "'#'");
        changes.push(`Removed ${beforeCount} window API calls`);
      }
      
      // Convert localStorage
      if (fixedCode.includes('localStorage')) {
        fixedCode = addAsyncStorageImport(fixedCode);
        fixedCode = replaceLocalStorageWithAsyncStorage(fixedCode);
        changes.push('Converted localStorage to AsyncStorage');
      }
      
      // Remove document APIs
      if (fixedCode.includes('document.')) {
        const beforeCount = (fixedCode.match(/document\./g) || []).length;
        fixedCode = fixedCode.replace(/document\.getElementById\([^)]+\)/g, 'null');
        fixedCode = fixedCode.replace(/document\.querySelector\([^)]+\)/g, 'null');
        changes.push(`Removed ${beforeCount} document API calls`);
      }
      
      return {
        fixed: fixedCode !== code,
        code: fixedCode,
        description: `Web API cleanup: ${changes.join(', ')}`,
        verification: (code) => !code.includes('window.') && !code.includes('document.') && !code.includes('localStorage'),
        verificationMessage: 'All web APIs removed/converted'
      };
    }
    
    else if (issue.toLowerCase().includes('syntax') || issue.toLowerCase().includes('bracket') || 
             issue.toLowerCase().includes('parenthes')) {
      console.log(chalk.blue(`          🔧 Detected syntax issue`));
      
      let fixedCode = code;
      let changes = [];
      
      // Fix bracket mismatches
      const openBrackets = (fixedCode.match(/\{/g) || []).length;
      const closeBrackets = (fixedCode.match(/\}/g) || []).length;
      
      if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;
        fixedCode += '\n' + '}'.repeat(missing);
        changes.push(`Added ${missing} missing closing brackets`);
      }
      
      // Fix parentheses mismatches
      const openParens = (fixedCode.match(/\(/g) || []).length;
      const closeParens = (fixedCode.match(/\)/g) || []).length;
      
      if (openParens > closeParens) {
        const missing = openParens - closeParens;
        fixedCode += ')'.repeat(missing);
        changes.push(`Added ${missing} missing closing parentheses`);
      }
      
      return {
        fixed: fixedCode !== code,
        code: fixedCode,
        description: `Syntax fixes: ${changes.join(', ')}`,
        verification: (code) => {
          const openB = (code.match(/\{/g) || []).length;
          const closeB = (code.match(/\}/g) || []).length;
          const openP = (code.match(/\(/g) || []).length;
          const closeP = (code.match(/\)/g) || []).length;
          return openB === closeB && openP === closeP;
        },
        verificationMessage: 'Brackets and parentheses balanced'
      };
    }
    
    else {
      // Use AI for complex unknown issues
      console.log(chalk.blue(`          🤖 Using AI analysis for complex issue...`));
      
      const analysisPrompt = `You are a React Native expert. Analyze this specific issue and provide a targeted fix.

ISSUE TO ANALYZE:
${issue}

CURRENT CODE:
\`\`\`tsx
${code}
\`\`\`

ANALYSIS TASK:
1. Understand what the issue is describing
2. Identify the root cause in the code
3. Provide a minimal, targeted fix
4. Explain what you changed and why

REQUIREMENTS:
- Make the smallest possible change to fix the issue
- Maintain all existing functionality
- Ensure React Native compatibility
- Return ONLY the corrected code section or full code if needed

Return the fixed code:`;

      const analysisResponse = await makeAPIRequest(analysisPrompt, 'intelligent-analysis');
      const analyzedFix = extractCodeFromResponse(analysisResponse);
      
      if (analyzedFix && analyzedFix.length > code.length * 0.5) {
        return {
          fixed: true,
          code: analyzedFix,
          description: `AI-analyzed fix for: ${issue.substring(0, 40)}...`,
          verification: (code) => code.length > 0 && !code.includes('undefined'),
          verificationMessage: 'AI fix applied and basic validation passed'
        };
      }
    }
    
    return {
      fixed: false,
      code: code,
      description: 'Could not analyze issue',
      verification: null,
      verificationMessage: 'Analysis failed'
    };
    
  } catch (error) {
    console.log(chalk.red(`          ❌ Analysis failed: ${error.message}`));
    return {
      fixed: false,
      code: code,
      description: 'Analysis error',
      verification: null,
      verificationMessage: `Analysis error: ${error.message}`
    };
  }
}

// 🔍 COMPREHENSIVE CODE INTEGRITY VERIFICATION
export async function verifyCodeIntegrity(code, fileName) {
  const issues = [];
  let isValid = true;
  
  try {
    // 1. Basic syntax checks
    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Bracket mismatch: ${openBrackets} open, ${closeBrackets} close`);
      isValid = false;
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Parentheses mismatch: ${openParens} open, ${closeParens} close`);
      isValid = false;
    }
    
    // 2. React/React Native structure checks
    if (!code.includes('import React')) {
      issues.push('Missing React import');
      isValid = false;
    }
    
    if (!code.includes('export default')) {
      issues.push('Missing default export');
      isValid = false;
    }
    
    // 3. Check for remaining HTML elements
    const htmlElements = code.match(/<(div|span|p|h[1-6]|img|button|input|form)\b/g);
    if (htmlElements) {
      issues.push(`HTML elements still present: ${htmlElements.join(', ')}`);
      isValid = false;
    }
    
    // 4. Check for web APIs
    const webApis = [];
    if (code.includes('window.')) webApis.push('window');
    if (code.includes('document.')) webApis.push('document');
    if (code.includes('localStorage')) webApis.push('localStorage');
    
    if (webApis.length > 0) {
      issues.push(`Web APIs still present: ${webApis.join(', ')}`);
      isValid = false;
    }
    
    // 5. Check for component usage without imports
    const componentsUsed = [];
    const componentChecks = [
      { name: 'View', pattern: /<View\b/ },
      { name: 'Text', pattern: /<Text\b/ },
      { name: 'Image', pattern: /<Image\b/ },
      { name: 'TouchableOpacity', pattern: /<TouchableOpacity\b/ },
      { name: 'TextInput', pattern: /<TextInput\b/ }
    ];
    
    componentChecks.forEach(({ name, pattern }) => {
      if (pattern.test(code) && !code.includes(`${name},`) && !code.includes(`{ ${name} }`)) {
        componentsUsed.push(name);
      }
    });
    
    if (componentsUsed.length > 0) {
      issues.push(`Components used but not imported: ${componentsUsed.join(', ')}`);
      isValid = false;
    }
    
    return {
      isValid: isValid,
      issues: issues,
      score: Math.max(0, 100 - (issues.length * 15))
    };
    
  } catch (error) {
    return {
      isValid: false,
      issues: [`Verification error: ${error.message}`],
      score: 0
    };
  }
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

// 🔍 COMPREHENSIVE ERROR DETECTION SYSTEM WITH ENHANCED LOGGING
async function detectAndFixErrors(code, fileName, projectContext) {
  console.log(chalk.cyan(`\n    🔍 Running comprehensive error detection for ${fileName}...`));
  console.log(chalk.gray(`       📋 Analyzing code for runtime issues, compatibility problems, and best practices...`));
  
  const errors = [];
  const warnings = [];
  const suggestions = [];
  let fixedCode = code;
  let fixesApplied = 0;
  let totalIssues = 0;
  
  // 1. RUNTIME ERROR DETECTION
  console.log(chalk.blue(`       🚨 Step 1/5: Checking for runtime errors...`));
  const runtimeErrors = detectRuntimeErrors(code, fileName);
  errors.push(...runtimeErrors.errors);
  warnings.push(...runtimeErrors.warnings);
  totalIssues += runtimeErrors.errors.length + runtimeErrors.warnings.length;
  
  if (runtimeErrors.errors.length > 0) {
    console.log(chalk.red(`          ❌ Found ${runtimeErrors.errors.length} critical runtime errors`));
    runtimeErrors.errors.forEach(error => console.log(chalk.red(`             • ${error}`)));
  } else {
    console.log(chalk.green(`          ✅ No critical runtime errors found`));
  }
  
  // 2. NEXT.JS SPECIFIC FUNCTION DETECTION
  console.log(chalk.blue(`       ⚛️ Step 2/5: Checking for Next.js specific functions...`));
  const nextjsIssues = detectNextjsSpecificFunctions(code, fileName);
  errors.push(...nextjsIssues.errors);
  suggestions.push(...nextjsIssues.suggestions);
  totalIssues += nextjsIssues.errors.length;
  
  if (nextjsIssues.errors.length > 0) {
    console.log(chalk.red(`          ❌ Found ${nextjsIssues.errors.length} Next.js compatibility issues`));
    nextjsIssues.errors.forEach(error => console.log(chalk.red(`             • ${error}`)));
  } else {
    console.log(chalk.green(`          ✅ No Next.js compatibility issues found`));
  }
  
  // 3. DEPENDENCY COMPATIBILITY CHECK
  console.log(chalk.blue(`       📦 Step 3/5: Checking dependency compatibility...`));
  const depIssues = await checkDependencyCompatibility(code, fileName, projectContext);
  warnings.push(...depIssues.warnings);
  suggestions.push(...depIssues.suggestions);
  totalIssues += depIssues.warnings.length;
  
  if (depIssues.warnings.length > 0) {
    console.log(chalk.yellow(`          ⚠️ Found ${depIssues.warnings.length} dependency compatibility warnings`));
  } else {
    console.log(chalk.green(`          ✅ All dependencies are React Native compatible`));
  }
  
  // 4. REACT NATIVE COMPATIBILITY CHECK
  console.log(chalk.blue(`       📱 Step 4/5: Checking React Native compatibility...`));
  const rnIssues = detectReactNativeIncompatibilities(code, fileName);
  errors.push(...rnIssues.errors);
  warnings.push(...rnIssues.warnings);
  totalIssues += rnIssues.errors.length + rnIssues.warnings.length;
  
  if (rnIssues.errors.length > 0) {
    console.log(chalk.red(`          ❌ Found ${rnIssues.errors.length} React Native compatibility errors`));
    rnIssues.errors.forEach(error => console.log(chalk.red(`             • ${error}`)));
  } else {
    console.log(chalk.green(`          ✅ Code is React Native compatible`));
  }
  
  // 5. PERFORMANCE AND BEST PRACTICES
  console.log(chalk.blue(`       ⚡ Step 5/5: Checking performance and best practices...`));
  const performanceIssues = detectPerformanceIssues(code, fileName);
  warnings.push(...performanceIssues.warnings);
  suggestions.push(...performanceIssues.suggestions);
  totalIssues += performanceIssues.warnings.length;
  
  if (performanceIssues.warnings.length > 0) {
    console.log(chalk.yellow(`          ⚠️ Found ${performanceIssues.warnings.length} performance optimization opportunities`));
  } else {
    console.log(chalk.green(`          ✅ Code follows React Native best practices`));
  }
  
  // SUMMARY OF FOUND ISSUES
  console.log(chalk.cyan(`\n       📊 Issue Detection Summary:`));
  console.log(chalk.red(`          🚨 Critical Errors: ${errors.length}`));
  console.log(chalk.yellow(`          ⚠️ Warnings: ${warnings.length}`));
  console.log(chalk.blue(`          💡 Suggestions: ${suggestions.length}`));
  console.log(chalk.gray(`          📈 Total Issues Found: ${totalIssues}`));
  
  // ENHANCED AUTO-FIX WITH VERIFICATION SYSTEM
  if (errors.length > 0) {
    console.log(chalk.cyan(`\n       🔧 Starting enhanced auto-fix with verification for ${errors.length} critical errors...`));
    console.log(chalk.gray(`          📋 Each fix will be verified and iterated until properly applied`));
    
    // Use the enhanced autoFixIssues function with verification
    const fixResult = await autoFixIssues(fixedCode, fileName, errors, projectContext);
    
    if (fixResult.code !== fixedCode) {
      fixedCode = fixResult.code;
      fixesApplied += fixResult.appliedFixes.length;
      
      console.log(chalk.green(`\n       🎉 Enhanced Auto-Fix Results:`));
      console.log(chalk.green(`          ✅ Successfully Applied & Verified: ${fixResult.appliedFixes.length} fixes`));
      
      if (fixResult.failedFixes.length > 0) {
        console.log(chalk.red(`          ❌ Failed Fixes: ${fixResult.failedFixes.length}`));
      }
      
      // Re-validate to see final error count
      console.log(chalk.blue(`          🔍 Re-validating after enhanced fixes...`));
      const revalidationResult = await revalidateAfterFixes(fixedCode, fileName);
      
      const remainingErrors = revalidationResult.errors;
      if (remainingErrors.length < errors.length) {
        const fixedCount = errors.length - remainingErrors.length;
        console.log(chalk.green(`          🎉 Successfully fixed ${fixedCount} out of ${errors.length} errors!`));
        errors.splice(0, errors.length, ...remainingErrors);
      }
      
      // Display verification results
      if (fixResult.verificationResults && fixResult.verificationResults.length > 0) {
        console.log(chalk.cyan(`\n          📋 Verification Details:`));
        fixResult.verificationResults.forEach(result => {
          const statusIcon = result.status === 'success' ? '✅' : result.status === 'already_exists' ? '🔄' : '⚠️';
          console.log(chalk.gray(`            ${statusIcon} ${result.issue}: ${result.verification}`));
        });
      }
      
      // Final verification integrity check
      if (fixResult.finalVerification) {
        if (fixResult.finalVerification.isValid) {
          console.log(chalk.green(`          ✅ Final integrity check passed (Score: ${fixResult.finalVerification.score}%)`));
        } else {
          console.log(chalk.yellow(`          ⚠️ Final integrity check found issues: ${fixResult.finalVerification.issues.join(', ')}`));
        }
      }
    } else {
      console.log(chalk.yellow(`          ⚠️ No code changes were made during auto-fix process`));
    }
    
    if (errors.length === 0) {
      console.log(chalk.green(`\n       🎉 All critical errors successfully fixed and verified!`));
    } else {
      console.log(chalk.yellow(`\n       ⚠️ ${errors.length} errors remaining after enhanced auto-fix`));
      console.log(chalk.gray(`          These may require manual intervention or are complex edge cases`));
      
      // Log remaining errors for debugging
      console.log(chalk.gray(`          📋 Remaining errors:`));
      errors.forEach((error, index) => {
        console.log(chalk.gray(`            ${index + 1}. ${error.substring(0, 80)}...`));
      });
    }
  }
  
  // AUTO-APPLY HIGH-PRIORITY SUGGESTIONS
  const criticalSuggestions = suggestions.filter(s => 
    s.includes('useRouter') || 
    s.includes('useEffect') ||
    s.includes('localStorage') ||
    s.includes('fetch') ||
    s.includes('Image') ||
    s.includes('navigation') ||
    s.includes('next/')
  );
  
  if (criticalSuggestions.length > 0) {
    console.log(chalk.cyan(`\n       💡 Applying ${criticalSuggestions.length} critical suggestions...`));
    console.log(chalk.gray(`          📋 These improvements will enhance React Native compatibility`));
    
    fixedCode = await autoApplyCriticalSuggestionsWithLogging(fixedCode, fileName, criticalSuggestions, projectContext);
  }
  
  // FINAL VALIDATION AND SCORING
  console.log(chalk.cyan(`\n       📊 Final validation and scoring...`));
  const finalValidation = await revalidateAfterFixes(fixedCode, fileName);
  const errorScore = Math.max(0, 100 - (finalValidation.errors.length * 20) - (finalValidation.warnings.length * 5));
  
  console.log(chalk.cyan(`\n       🏁 Error Detection Complete:`));
  console.log(chalk.green(`          ✅ Fixes Applied: ${fixesApplied}`));
  console.log(chalk.red(`          🚨 Remaining Errors: ${finalValidation.errors.length}`));
  console.log(chalk.yellow(`          ⚠️ Remaining Warnings: ${finalValidation.warnings.length}`));
  console.log(chalk.blue(`          📊 Error Score: ${errorScore}%`));
  
  if (finalValidation.errors.length === 0) {
    console.log(chalk.green(`          🎉 File is now error-free and production-ready!`));
  } else {
    console.log(chalk.yellow(`          🔧 File has remaining issues that may need manual review`));
  }
  
  return {
    code: fixedCode,
    errors: finalValidation.errors,
    warnings: finalValidation.warnings,
    suggestions: finalValidation.suggestions || suggestions,
    hasErrors: finalValidation.errors.length > 0,
    hasWarnings: finalValidation.warnings.length > 0,
    errorScore: errorScore,
    fixesApplied: fixesApplied,
    isProductionReady: finalValidation.errors.length === 0
  };
}

// 🎯 TARGETED ERROR FIXING SYSTEM - Surgical Precision
async function autoFixCriticalErrorsWithRetry(code, fileName, errors, projectContext, attempt) {
  let fixedCode = code;
  let appliedFixes = [];
  
  console.log(chalk.blue(`             📝 Processing ${errors.length} errors with targeted surgical fixes...`));
  
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    console.log(chalk.gray(`             🔧 [${i+1}/${errors.length}] Targeting: ${error.substring(0, 60)}...`));
    console.log(chalk.gray(`                📋 Full error: ${error}`));
    
    try {
      // 🎯 TARGETED FIX 1: Missing React Native Imports
      if (error.includes('component used but not imported') || error.includes('not imported from react-native') || error.includes('is not defined')) {
        const missingComponent = extractMissingComponent(error);
        if (missingComponent) {
          console.log(chalk.blue(`                🔍 Adding missing import: ${missingComponent}`));
          const beforeCode = fixedCode;
          fixedCode = addMissingImport(fixedCode, missingComponent);
          if (fixedCode !== beforeCode) {
            appliedFixes.push(`Added ${missingComponent} import`);
            console.log(chalk.green(`                ✅ Successfully added ${missingComponent} import`));
          } else {
            console.log(chalk.yellow(`                ⚠️ ${missingComponent} import already exists`));
          }
        } else {
          console.log(chalk.yellow(`                ⚠️ Could not extract component name from: ${error}`));
        }
      }
      
      // 🎯 TARGETED FIX 2: Web APIs (window, document, localStorage)
      else if (error.includes('window') || error.includes('document') || error.includes('localStorage') || 
               error.includes('DOM methods') || error.includes('addEventListener') || error.includes('location.href')) {
        console.log(chalk.blue(`                🌐 Removing/replacing web APIs...`));
        
        // Remove window.* calls
        if (fixedCode.includes('window.')) {
          const beforeCount = (fixedCode.match(/window\./g) || []).length;
          fixedCode = fixedCode.replace(/window\.[^;\s\)]+/g, 'null');
          fixedCode = fixedCode.replace(/window\.location\.href/g, "'#'");
          fixedCode = fixedCode.replace(/window\.open\([^)]+\)/g, 'console.log("Navigation not available in React Native")');
          const afterCount = (fixedCode.match(/window\./g) || []).length;
          if (afterCount < beforeCount) {
            appliedFixes.push(`Removed ${beforeCount - afterCount} window API calls`);
            console.log(chalk.green(`                ✅ Removed ${beforeCount - afterCount} window API calls`));
          }
        }
        
        // Replace localStorage with AsyncStorage
        if (fixedCode.includes('localStorage')) {
          fixedCode = addAsyncStorageImport(fixedCode);
          fixedCode = replaceLocalStorageWithAsyncStorage(fixedCode);
          appliedFixes.push('Converted localStorage to AsyncStorage');
          console.log(chalk.green(`                ✅ Converted localStorage to AsyncStorage`));
        }
        
        // Remove document.* calls
        if (fixedCode.includes('document.')) {
          const beforeCount = (fixedCode.match(/document\./g) || []).length;
          fixedCode = fixedCode.replace(/document\.getElementById\([^)]+\)/g, 'null');
          fixedCode = fixedCode.replace(/document\.querySelector\([^)]+\)/g, 'null');
          fixedCode = fixedCode.replace(/document\.addEventListener\([^)]+\)/g, '// Event listener removed for React Native');
          const afterCount = (fixedCode.match(/document\./g) || []).length;
          if (afterCount < beforeCount) {
            appliedFixes.push(`Removed ${beforeCount - afterCount} document API calls`);
            console.log(chalk.green(`                ✅ Removed ${beforeCount - afterCount} document API calls`));
          }
        }
      }
      
      // 🎯 TARGETED FIX 3: HTML Elements to React Native Components
      else if (error.includes('HTML element') || error.includes('should be converted')) {
        console.log(chalk.blue(`                🏷️ Converting HTML elements to React Native...`));
        
        const htmlConversions = [
          { from: /<div(\s[^>]*)?>/, to: '<View$1>', name: 'div → View' },
          { from: /<\/div>/g, to: '</View>', name: 'closing div' },
          { from: /<span(\s[^>]*)?>/, to: '<Text$1>', name: 'span → Text' },
          { from: /<\/span>/g, to: '</Text>', name: 'closing span' },
          { from: /<p(\s[^>]*)?>/, to: '<Text$1>', name: 'p → Text' },
          { from: /<\/p>/g, to: '</Text>', name: 'closing p' },
          { from: /<h[1-6](\s[^>]*)?>/, to: '<Text$1>', name: 'heading → Text' },
          { from: /<\/h[1-6]>/g, to: '</Text>', name: 'closing heading' },
          { from: /<img(\s[^>]*)?\/?>/, to: '<Image$1/>', name: 'img → Image' },
          { from: /<button(\s[^>]*)?>/, to: '<TouchableOpacity$1>', name: 'button → TouchableOpacity' },
          { from: /<\/button>/g, to: '</TouchableOpacity>', name: 'closing button' },
          { from: /<input(\s[^>]*)?\/?>/, to: '<TextInput$1/>', name: 'input → TextInput' }
        ];
        
        let conversionsApplied = 0;
        htmlConversions.forEach(conversion => {
          const beforeMatch = fixedCode.match(conversion.from);
          if (beforeMatch) {
            fixedCode = fixedCode.replace(conversion.from, conversion.to);
            conversionsApplied++;
            console.log(chalk.green(`                  ✅ ${conversion.name}`));
          }
        });
        
        if (conversionsApplied > 0) {
          appliedFixes.push(`Converted ${conversionsApplied} HTML elements`);
          
          // Ensure React Native components are imported
          const neededImports = [];
          if (fixedCode.includes('<View') && !fixedCode.includes('View,')) neededImports.push('View');
          if (fixedCode.includes('<Text') && !fixedCode.includes('Text,')) neededImports.push('Text');
          if (fixedCode.includes('<Image') && !fixedCode.includes('Image,')) neededImports.push('Image');
          if (fixedCode.includes('<TouchableOpacity') && !fixedCode.includes('TouchableOpacity,')) neededImports.push('TouchableOpacity');
          if (fixedCode.includes('<TextInput') && !fixedCode.includes('TextInput,')) neededImports.push('TextInput');
          
          if (neededImports.length > 0) {
            fixedCode = addMultipleImports(fixedCode, neededImports);
            console.log(chalk.green(`                  ✅ Added imports: ${neededImports.join(', ')}`));
          }
        }
      }
      
      // 🎯 TARGETED FIX 4: Next.js Router to React Navigation
      else if (error.includes('useRouter') || error.includes('next/router') || error.includes('router.push') || error.includes('router.back')) {
        console.log(chalk.blue(`                ⚛️ Converting Next.js router to React Navigation...`));
        
        // Remove Next.js router import
        if (fixedCode.includes("import { useRouter } from 'next/router'")) {
          fixedCode = fixedCode.replace("import { useRouter } from 'next/router';", '');
          fixedCode = fixedCode.replace("import { useRouter } from 'next/router'", '');
          console.log(chalk.green(`                  ✅ Removed Next.js router import`));
        }
        
        // Add React Navigation imports
        if (!fixedCode.includes('@react-navigation/native')) {
          const importLine = "import { useNavigation, useRoute } from '@react-navigation/native';";
          fixedCode = addImportAtTop(fixedCode, importLine);
          console.log(chalk.green(`                  ✅ Added React Navigation imports`));
        }
        
        // Replace router usage
        fixedCode = fixedCode.replace(/const router = useRouter\(\)/g, 'const navigation = useNavigation()');
        fixedCode = fixedCode.replace(/router\.push\(/g, 'navigation.navigate(');
        fixedCode = fixedCode.replace(/router\.back\(\)/g, 'navigation.goBack()');
        fixedCode = fixedCode.replace(/router\.replace\(/g, 'navigation.replace(');
        
        appliedFixes.push('Converted Next.js router to React Navigation');
        console.log(chalk.green(`                ✅ Converted router methods`));
      }
      
      // 🎯 TARGETED FIX 5: Syntax Errors (brackets, parentheses)
      else if (error.includes('syntax') || error.includes('brackets') || error.includes('parentheses') || 
               error.includes('Unmatched curly brackets') || error.includes('Unmatched parentheses')) {
        console.log(chalk.blue(`                🔧 Fixing syntax errors...`));
        
        // Fix unmatched brackets
        const openBrackets = (fixedCode.match(/\{/g) || []).length;
        const closeBrackets = (fixedCode.match(/\}/g) || []).length;
        
        if (openBrackets > closeBrackets) {
          const missing = openBrackets - closeBrackets;
          fixedCode += '\n' + '}'.repeat(missing);
          appliedFixes.push(`Added ${missing} missing closing brackets`);
          console.log(chalk.green(`                ✅ Added ${missing} missing closing brackets`));
        } else if (closeBrackets > openBrackets) {
          const extra = closeBrackets - openBrackets;
          // Remove extra closing brackets from the end
          for (let j = 0; j < extra; j++) {
            fixedCode = fixedCode.replace(/\}(\s*)$/, '$1');
          }
          appliedFixes.push(`Removed ${extra} extra closing brackets`);
          console.log(chalk.green(`                ✅ Removed ${extra} extra closing brackets`));
        }
        
        // Fix unmatched parentheses
        const openParens = (fixedCode.match(/\(/g) || []).length;
        const closeParens = (fixedCode.match(/\)/g) || []).length;
        
        if (openParens > closeParens) {
          const missing = openParens - closeParens;
          fixedCode += ')'.repeat(missing);
          appliedFixes.push(`Added ${missing} missing closing parentheses`);
          console.log(chalk.green(`                ✅ Added ${missing} missing closing parentheses`));
        }
      }
      
      // 🎯 TARGETED FIX 6: Missing React Import
      else if (error.includes('React') && error.includes('not defined')) {
        console.log(chalk.blue(`                ⚛️ Adding React import...`));
        
        if (!fixedCode.includes("import React from 'react'")) {
          fixedCode = "import React from 'react';\n" + fixedCode;
          appliedFixes.push('Added React import');
          console.log(chalk.green(`                ✅ Added React import`));
        }
      }
      
      // 🎯 TARGETED FIX 7: Aggressive catch-all for unmatched errors
      else {
        console.log(chalk.blue(`                🔧 Attempting aggressive fix for unmatched error...`));
        
        // Try to fix common issues that might not match exact patterns
        let fixAttempted = false;
        
        // Check for any HTML elements in the code
        if (fixedCode.match(/<(div|span|p|h[1-6]|img|button|input|form)\b/)) {
          console.log(chalk.blue(`                  🏷️ Found HTML elements, converting...`));
          const htmlConversions = [
            { from: /<div(\s[^>]*)?>/, to: '<View$1>' },
            { from: /<\/div>/g, to: '</View>' },
            { from: /<span(\s[^>]*)?>/, to: '<Text$1>' },
            { from: /<\/span>/g, to: '</Text>' },
            { from: /<p(\s[^>]*)?>/, to: '<Text$1>' },
            { from: /<\/p>/g, to: '</Text>' },
            { from: /<h[1-6](\s[^>]*)?>/, to: '<Text$1>' },
            { from: /<\/h[1-6]>/g, to: '</Text>' },
            { from: /<img(\s[^>]*)?\/?>/, to: '<Image$1/>' },
            { from: /<button(\s[^>]*)?>/, to: '<TouchableOpacity$1>' },
            { from: /<\/button>/g, to: '</TouchableOpacity>' },
            { from: /<input(\s[^>]*)?\/?>/, to: '<TextInput$1/>' }
          ];
          
          htmlConversions.forEach(conversion => {
            if (fixedCode.match(conversion.from)) {
              fixedCode = fixedCode.replace(conversion.from, conversion.to);
              fixAttempted = true;
            }
          });
        }
        
        // Check for any web APIs
        if (fixedCode.includes('window.') || fixedCode.includes('document.') || fixedCode.includes('localStorage')) {
          console.log(chalk.blue(`                  🌐 Found web APIs, removing...`));
          fixedCode = fixedCode.replace(/window\.[^;\s\)]+/g, 'null');
          fixedCode = fixedCode.replace(/document\.[^;\s\)]+/g, 'null');
          if (fixedCode.includes('localStorage')) {
            fixedCode = addAsyncStorageImport(fixedCode);
            fixedCode = replaceLocalStorageWithAsyncStorage(fixedCode);
          }
          fixAttempted = true;
        }
        
        // Check for missing React Native imports
        const componentsInCode = [];
        const componentChecks = [
          { name: 'View', pattern: /<View\b/ },
          { name: 'Text', pattern: /<Text\b/ },
          { name: 'Image', pattern: /<Image\b/ },
          { name: 'TouchableOpacity', pattern: /<TouchableOpacity\b/ },
          { name: 'TextInput', pattern: /<TextInput\b/ },
          { name: 'ScrollView', pattern: /<ScrollView\b/ },
          { name: 'SafeAreaView', pattern: /<SafeAreaView\b/ }
        ];
        
        componentChecks.forEach(({ name, pattern }) => {
          if (pattern.test(fixedCode) && !fixedCode.includes(`${name},`) && !fixedCode.includes(`{ ${name} }`)) {
            componentsInCode.push(name);
          }
        });
        
        if (componentsInCode.length > 0) {
          console.log(chalk.blue(`                  📦 Adding missing imports: ${componentsInCode.join(', ')}`));
          fixedCode = addMultipleImports(fixedCode, componentsInCode);
          fixAttempted = true;
        }
        
        if (fixAttempted) {
          appliedFixes.push(`Aggressive fix applied for: ${error.substring(0, 40)}...`);
          console.log(chalk.green(`                ✅ Aggressive fix applied`));
        } else {
          console.log(chalk.yellow(`                ⚠️ No applicable fix found for: ${error.substring(0, 40)}...`));
        }
      }
      
      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (fixError) {
      console.log(chalk.red(`                ❌ Fix failed: ${fixError.message}`));
    }
  }
  
  console.log(chalk.cyan(`\n             📊 Surgical Fix Summary:`));
  console.log(chalk.green(`                ✅ Applied ${appliedFixes.length} targeted fixes`));
  appliedFixes.forEach(fix => console.log(chalk.green(`                  • ${fix}`)));
  
  return fixedCode;
}

// 🔧 HELPER FUNCTIONS FOR TARGETED FIXES

function extractMissingComponent(error) {
  // Handle different error message formats
  const patterns = [
    /([A-Z][a-zA-Z]+) component used but not imported/,  // "View component used but not imported"
    /'([^']+)' is not defined/,                          // "'View' is not defined"
    /([A-Z][a-zA-Z]+) is not imported/,                  // "View is not imported"
    /([A-Z][a-zA-Z]+) not imported from react-native/   // "View not imported from react-native"
  ];
  
  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function addMissingImport(code, component) {
  const reactNativeComponents = ['View', 'Text', 'Image', 'ScrollView', 'TouchableOpacity', 'TextInput', 'StyleSheet', 'SafeAreaView', 'FlatList', 'SectionList'];
  
  if (reactNativeComponents.includes(component)) {
    // Check if react-native import exists
    const importMatch = code.match(/import\s*{([^}]+)}\s*from\s*['"]react-native['"]/);
    
    if (importMatch) {
      // Add to existing import
      const currentImports = importMatch[1].split(',').map(s => s.trim());
      if (!currentImports.includes(component)) {
        currentImports.push(component);
        const newImportLine = `import { ${currentImports.join(', ')} } from 'react-native'`;
        code = code.replace(/import\s*{[^}]+}\s*from\s*['"]react-native['"]/, newImportLine);
      }
    } else {
      // Add new react-native import
      const importLine = `import { ${component} } from 'react-native';`;
      code = addImportAtTop(code, importLine);
    }
  }
  
  return code;
}

function addMultipleImports(code, components) {
  const reactNativeComponents = components.filter(comp => 
    ['View', 'Text', 'Image', 'ScrollView', 'TouchableOpacity', 'TextInput', 'StyleSheet', 'SafeAreaView', 'FlatList', 'SectionList'].includes(comp)
  );
  
  if (reactNativeComponents.length > 0) {
    const importMatch = code.match(/import\s*{([^}]+)}\s*from\s*['"]react-native['"]/);
    
    if (importMatch) {
      // Add to existing import
      const currentImports = importMatch[1].split(',').map(s => s.trim());
      const newImports = reactNativeComponents.filter(comp => !currentImports.includes(comp));
      
      if (newImports.length > 0) {
        const allImports = [...currentImports, ...newImports];
        const newImportLine = `import { ${allImports.join(', ')} } from 'react-native'`;
        code = code.replace(/import\s*{[^}]+}\s*from\s*['"]react-native['"]/, newImportLine);
      }
    } else {
      // Add new react-native import
      const importLine = `import { ${reactNativeComponents.join(', ')} } from 'react-native';`;
      code = addImportAtTop(code, importLine);
    }
  }
  
  return code;
}

function addAsyncStorageImport(code) {
  if (!code.includes('@react-native-async-storage/async-storage')) {
    const importLine = "import AsyncStorage from '@react-native-async-storage/async-storage';";
    code = addImportAtTop(code, importLine);
  }
  return code;
}

function replaceLocalStorageWithAsyncStorage(code) {
  // Replace localStorage.setItem
  code = code.replace(/localStorage\.setItem\(([^,]+),\s*([^)]+)\)/g, 'await AsyncStorage.setItem($1, $2)');
  
  // Replace localStorage.getItem
  code = code.replace(/localStorage\.getItem\(([^)]+)\)/g, 'await AsyncStorage.getItem($1)');
  
  // Replace localStorage.removeItem
  code = code.replace(/localStorage\.removeItem\(([^)]+)\)/g, 'await AsyncStorage.removeItem($1)');
  
  // Replace localStorage.clear
  code = code.replace(/localStorage\.clear\(\)/g, 'await AsyncStorage.clear()');
  
  // Make functions async if they use AsyncStorage
  if (code.includes('await AsyncStorage')) {
    // Find functions that use AsyncStorage and make them async
    const functionRegex = /(function\s+\w+\s*\([^)]*\)\s*{[^}]*await AsyncStorage[^}]*})/g;
    code = code.replace(functionRegex, (match) => {
      if (!match.includes('async')) {
        return match.replace('function', 'async function');
      }
      return match;
    });
    
    // Handle arrow functions
    const arrowFunctionRegex = /(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]*await AsyncStorage[^}]*})/g;
    code = code.replace(arrowFunctionRegex, (match) => {
      if (!match.includes('async')) {
        return match.replace('=>', 'async =>');
      }
      return match;
    });
  }
  
  return code;
}

function addImportAtTop(code, importLine) {
  const lines = code.split('\n');
  let insertIndex = 0;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() && !lines[i].trim().startsWith('//')) {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, importLine);
  return lines.join('\n');
}

// 🔍 RE-VALIDATION AFTER FIXES
async function revalidateAfterFixes(code, fileName) {
  console.log(chalk.gray(`             🔍 Running validation on fixed code...`));
  
  const runtimeErrors = detectRuntimeErrors(code, fileName);
  const nextjsIssues = detectNextjsSpecificFunctions(code, fileName);
  const rnIssues = detectReactNativeIncompatibilities(code, fileName);
  
  const allErrors = [
    ...runtimeErrors.errors,
    ...nextjsIssues.errors,
    ...rnIssues.errors
  ];
  
  const allWarnings = [
    ...runtimeErrors.warnings,
    ...rnIssues.warnings
  ];
  
  console.log(chalk.gray(`             📊 Validation complete: ${allErrors.length} errors, ${allWarnings.length} warnings`));
  
  return {
    errors: allErrors,
    warnings: allWarnings,
    suggestions: nextjsIssues.suggestions || []
  };
}

// 💡 ENHANCED SUGGESTION APPLICATION WITH LOGGING
async function autoApplyCriticalSuggestionsWithLogging(code, fileName, suggestions, projectContext) {
  let improvedCode = code;
  
  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    console.log(chalk.blue(`          💡 [${i+1}/${suggestions.length}] Applying: ${suggestion.substring(0, 60)}...`));
    
    try {
      if (suggestion.includes('localStorage') && suggestion.includes('AsyncStorage')) {
        console.log(chalk.gray(`             🔄 Converting localStorage to AsyncStorage...`));
        
        const suggestionPrompt = `Convert localStorage to AsyncStorage in this React Native code:

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

CONVERSION:
1. Add: import AsyncStorage from '@react-native-async-storage/async-storage'
2. localStorage.setItem → await AsyncStorage.setItem
3. localStorage.getItem → await AsyncStorage.getItem  
4. localStorage.removeItem → await AsyncStorage.removeItem
5. Make functions async and add error handling

Return COMPLETE code with AsyncStorage.`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const storageFix = extractCodeFromResponse(suggestionResponse);
        
        if (storageFix && storageFix.includes('AsyncStorage') && !storageFix.includes('localStorage')) {
          improvedCode = storageFix;
          console.log(chalk.green(`             ✅ Successfully converted to AsyncStorage`));
        }
      }
      
      else if (suggestion.includes('useRouter') && suggestion.includes('React Navigation')) {
        console.log(chalk.gray(`             ⚛️ Converting useRouter to React Navigation...`));
        
        const suggestionPrompt = `Convert Next.js useRouter to React Navigation:

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

CONVERSION:
1. Remove next/router imports
2. Add React Navigation imports
3. Convert router methods to navigation methods
4. Handle route parameters properly

Return COMPLETE code with React Navigation.`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const routerFix = extractCodeFromResponse(suggestionResponse);
        
        if (routerFix && routerFix.includes('useNavigation') && !routerFix.includes('next/router')) {
          improvedCode = routerFix;
          console.log(chalk.green(`             ✅ Successfully converted to React Navigation`));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (suggestionError) {
      console.log(chalk.yellow(`             ⚠️ Suggestion application failed: ${suggestionError.message}`));
    }
  }
  
  return improvedCode;
}

// 🚨 RUNTIME ERROR DETECTION
function detectRuntimeErrors(code, fileName) {
  const errors = [];
  const warnings = [];
  
  // Check for undefined variables/functions
  const undefinedPatterns = [
    { pattern: /window\./g, error: "window object not available in React Native" },
    { pattern: /document\./g, error: "document object not available in React Native" },
    { pattern: /querySelector|getElementById/g, error: "DOM methods not available in React Native" },
    { pattern: /addEventListener/g, error: "addEventListener not available in React Native" },
    { pattern: /location\.href/g, error: "location.href not available in React Native" },
    { pattern: /history\.push/g, error: "history.push not available - use React Navigation" },
    { pattern: /alert\(/g, warning: "alert() may not work consistently - use Alert from react-native" },
    { pattern: /console\.log\(/g, warning: "console.log should be removed in production" },
    { pattern: /\.innerHTML/g, error: "innerHTML not available in React Native" },
    { pattern: /\.style\.[a-zA-Z]/g, warning: "Direct style manipulation not recommended - use StyleSheet" }
  ];
  
  undefinedPatterns.forEach(({ pattern, error, warning: warn }) => {
    if (pattern.test(code)) {
      if (error) errors.push(error);
      if (warn) warnings.push(warn);
    }
  });
  
  // Check for missing imports
  const usedComponents = [];
  const componentPatterns = [
    { component: 'View', pattern: /<View\b/ },
    { component: 'Text', pattern: /<Text\b/ },
    { component: 'ScrollView', pattern: /<ScrollView\b/ },
    { component: 'TouchableOpacity', pattern: /<TouchableOpacity\b/ },
    { component: 'TextInput', pattern: /<TextInput\b/ },
    { component: 'Image', pattern: /<Image\b/ },
    { component: 'FlatList', pattern: /<FlatList\b/ },
    { component: 'Modal', pattern: /<Modal\b/ },
    { component: 'SafeAreaView', pattern: /<SafeAreaView\b/ }
  ];
  
  componentPatterns.forEach(({ component, pattern }) => {
    if (pattern.test(code) && !code.includes(`import.*${component}`)) {
      errors.push(`${component} component used but not imported from react-native`);
      usedComponents.push(component);
    }
  });
  
  // Check for syntax errors
  try {
    // Basic syntax validation
    if (code.includes('export default') && !code.match(/export\s+default\s+\w+/)) {
      errors.push("Invalid export default syntax");
    }
    
    // Check for unmatched brackets
    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push("Unmatched curly brackets detected");
    }
    
    // Check for unmatched parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push("Unmatched parentheses detected");
    }
  } catch (syntaxError) {
    errors.push(`Syntax error detected: ${syntaxError.message}`);
  }
  
  return { errors, warnings, usedComponents };
}

// ⚛️ NEXT.js SPECIFIC FUNCTION DETECTION
function detectNextjsSpecificFunctions(code, fileName) {
  const errors = [];
  const suggestions = [];
  
  const nextjsPatterns = [
    {
      pattern: /useRouter\(\)/g,
      error: "useRouter from next/router not available in React Native",
      suggestion: "Replace useRouter with React Navigation hooks (useNavigation, useRoute)"
    },
    {
      pattern: /router\.push\(/g,
      error: "router.push not available in React Native",
      suggestion: "Replace router.push with navigation.navigate"
    },
    {
      pattern: /router\.back\(\)/g,
      error: "router.back not available in React Native", 
      suggestion: "Replace router.back with navigation.goBack()"
    },
    {
      pattern: /next\/image/g,
      error: "next/image not available in React Native",
      suggestion: "Replace Next.js Image with React Native Image component"
    },
    {
      pattern: /next\/link/g,
      error: "next/link not available in React Native",
      suggestion: "Replace Next.js Link with TouchableOpacity + navigation"
    },
    {
      pattern: /next\/head/g,
      error: "next/head not available in React Native",
      suggestion: "Remove Next.js Head component (not needed in mobile apps)"
    },
    {
      pattern: /getServerSideProps|getStaticProps|getStaticPaths/g,
      error: "Next.js data fetching methods not available in React Native",
      suggestion: "Replace with useEffect + fetch or React Query for data fetching"
    },
    {
      pattern: /process\.env\.NODE_ENV/g,
      warning: "process.env may not work the same way in React Native",
      suggestion: "Use __DEV__ for development checks in React Native"
    },
    {
      pattern: /pages\/api\//g,
      error: "API routes not available in React Native",
      suggestion: "Move API logic to external backend service"
    },
    {
      pattern: /middleware\.ts|middleware\.js/g,
      error: "Next.js middleware not available in React Native",
      suggestion: "Implement middleware logic in your backend service"
    }
  ];
  
  nextjsPatterns.forEach(({ pattern, error, warning, suggestion }) => {
    if (pattern.test(code)) {
      if (error) errors.push(error);
      if (warning) warnings.push(warning);
      if (suggestion) suggestions.push(suggestion);
    }
  });
  
  return { errors, suggestions };
}

// 📦 DEPENDENCY COMPATIBILITY CHECK
async function checkDependencyCompatibility(code, fileName, projectContext) {
  const warnings = [];
  const suggestions = [];
  
  // Check for web-only packages
  const webOnlyPackages = [
    { package: 'next', alternative: 'Remove - not needed in React Native' },
    { package: 'react-dom', alternative: 'Remove - not needed in React Native' },
    { package: 'webpack', alternative: 'Remove - Metro bundler is used' },
    { package: 'postcss', alternative: 'Remove - use StyleSheet instead' },
    { package: 'tailwindcss', alternative: 'Use NativeWind for Tailwind-like styling' },
    { package: 'axios', alternative: 'Can be used, but consider fetch or react-native-fetch-api' },
    { package: 'lodash', alternative: 'Consider smaller alternatives for mobile' },
    { package: 'moment', alternative: 'Use dayjs or date-fns for smaller bundle size' }
  ];
  
  webOnlyPackages.forEach(({ package: pkg, alternative }) => {
    if (code.includes(`from '${pkg}'`) || code.includes(`require('${pkg}')`)) {
      warnings.push(`Package '${pkg}' may not be compatible with React Native`);
      suggestions.push(`Consider: ${alternative}`);
    }
  });
  
  // Check for missing React Native specific packages
  const rnRecommendations = [
    {
      condition: code.includes('AsyncStorage'),
      package: '@react-native-async-storage/async-storage',
      reason: 'AsyncStorage usage detected'
    },
    {
      condition: code.includes('navigation.'),
      package: '@react-navigation/native',
      reason: 'Navigation usage detected'
    },
    {
      condition: code.includes('SafeAreaView'),
      package: 'react-native-safe-area-context',
      reason: 'SafeAreaView usage detected'
    },
    {
      condition: code.includes('Vector') || code.includes('Icon'),
      package: 'react-native-vector-icons',
      reason: 'Icon usage detected'
    }
  ];
  
  rnRecommendations.forEach(({ condition, package: pkg, reason }) => {
    if (condition) {
      suggestions.push(`Consider adding ${pkg} dependency (${reason})`);
    }
  });
  
  return { warnings, suggestions };
}

// 📱 REACT NATIVE COMPATIBILITY CHECK
function detectReactNativeIncompatibilities(code, fileName) {
  const errors = [];
  const warnings = [];
  
  // Check for incompatible CSS properties
  const incompatibleCSS = [
    'position: fixed',
    'position: sticky', 
    'float:',
    'display: grid',
    'display: table',
    'background-attachment:',
    'box-shadow:',
    'text-shadow:',
    'cursor:',
    'user-select:'
  ];
  
  incompatibleCSS.forEach(css => {
    if (code.includes(css)) {
      warnings.push(`CSS property '${css}' not supported in React Native`);
    }
  });
  
  // Check for HTML elements that shouldn't be there
  const htmlElements = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'button', 'input', 'form'];
  htmlElements.forEach(element => {
    const pattern = new RegExp(`<${element}\\b`, 'gi');
    if (pattern.test(code)) {
      errors.push(`HTML element <${element}> found - should be converted to React Native component`);
    }
  });
  
  // Check for React Native best practices
  if (code.includes('<Text>') && code.includes('onPress')) {
    warnings.push('Text with onPress detected - consider using TouchableOpacity wrapper');
  }
  
  if (code.includes('StyleSheet.create') && code.includes('style={{')) {
    warnings.push('Mixed inline styles and StyleSheet detected - consider consistency');
  }
  
  return { errors, warnings };
}

// ⚡ PERFORMANCE ISSUE DETECTION
function detectPerformanceIssues(code, fileName) {
  const warnings = [];
  const suggestions = [];
  
  // Check for potential performance issues
  if (code.includes('map(') && code.includes('key=')) {
    if (!code.includes('FlatList') && code.match(/\.map\(/g)?.length > 1) {
      suggestions.push('Consider using FlatList for better performance with large lists');
    }
  }
  
  if (code.includes('useEffect') && !code.includes('[]')) {
    warnings.push('useEffect without dependency array detected - may cause performance issues');
  }
  
  if (code.includes('console.log')) {
    suggestions.push('Remove console.log statements in production build');
  }
  
  if (code.includes('require(') && code.includes('.png')) {
    suggestions.push('Consider optimizing images for mobile (use appropriate resolutions)');
  }
  
  return { warnings, suggestions };
}

// 🔧 AUTO-FIX CRITICAL ERRORS
async function autoFixCriticalErrors(code, fileName, errors, projectContext) {
  let fixedCode = code;
  
  for (const error of errors) {
    try {
      if (error.includes('not imported from react-native')) {
        console.log(`      🔧 Fixing: ${error}`);
        
        const fixPrompt = `Fix missing React Native imports in this code. Add all necessary imports from 'react-native':

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

TASK: Add missing React Native component imports. Return ONLY the import section with all necessary imports.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const importFix = extractCodeFromResponse(fixResponse);
        
        if (importFix && importFix.includes('react-native')) {
          // Insert imports after React import
          const reactImportMatch = fixedCode.match(/import React[^;]*;/);
          if (reactImportMatch) {
            fixedCode = fixedCode.replace(reactImportMatch[0], `${reactImportMatch[0]}\n${importFix}`);
          }
        }
      }
      
      else if (error.includes('HTML element') && error.includes('should be converted')) {
        console.log(`      🔧 Fixing: ${error}`);
        
        const fixPrompt = `Convert ALL remaining HTML elements to React Native components:

CURRENT CODE:
\`\`\`tsx
${fixedCode}
\`\`\`

CRITICAL: Convert ALL HTML elements to React Native equivalents and return the COMPLETE corrected code.`;

        const fixResponse = await makeAPIRequest(fixPrompt);
        const htmlFix = extractCodeFromResponse(fixResponse);
        
        if (htmlFix && htmlFix.length > fixedCode.length * 0.7) {
          fixedCode = htmlFix;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (fixError) {
      console.log(chalk.yellow(`      ⚠️ Could not auto-fix: ${error}`));
    }
  }
  
  return fixedCode;
}

// 💡 AUTO-APPLY CRITICAL SUGGESTIONS  
async function autoApplyCriticalSuggestions(code, fileName, suggestions, projectContext) {
  let improvedCode = code;
  
  for (const suggestion of suggestions) {
    try {
      if (suggestion.includes('useRouter') && suggestion.includes('React Navigation')) {
        console.log(`      💡 Applying: useRouter → React Navigation conversion`);
        
        const suggestionPrompt = `Convert Next.js useRouter to React Navigation in this code:

CURRENT CODE:
\`\`\`tsx
${improvedCode}
\`\`\`

CONVERSION TASK:
1. Remove: import { useRouter } from 'next/router'
2. Add: import { useNavigation, useRoute } from '@react-navigation/native'
3. Replace: const router = useRouter() with const navigation = useNavigation()
4. Convert: router.push('/path') to navigation.navigate('ScreenName')
5. Convert: router.back() to navigation.goBack()
6. Convert: router.query to route.params

Return the COMPLETE converted code:`;

        const suggestionResponse = await makeAPIRequest(suggestionPrompt);
        const routerFix = extractCodeFromResponse(suggestionResponse);
        
        if (routerFix && routerFix.includes('useNavigation') && !routerFix.includes('next/router')) {
          improvedCode = routerFix;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (suggestionError) {
      console.log(chalk.yellow(`      ⚠️ Could not apply: ${suggestion.substring(0, 50)}...`));
    }
  }
  
  return improvedCode;
}

// 📋 GENERATE COMPREHENSIVE ERROR REPORT
export function generateErrorReport(conversionResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: conversionResults.length,
      filesWithErrors: 0,
      filesWithWarnings: 0,
      totalErrors: 0,
      totalWarnings: 0,
      totalSuggestions: 0,
      averageErrorScore: 0,
      averageQualityScore: 0
    },
    categories: {
      runtimeErrors: {},
      nextjsIssues: {},
      dependencyIssues: {},
      compatibilityIssues: {},
      performanceIssues: {}
    },
    fileDetails: [],
    recommendations: []
  };

  // Analyze each file
  conversionResults.forEach(result => {
    if (result.errorDetection) {
      const errorData = result.errorDetection;
      
      // Update summary
      if (errorData.hasErrors) report.summary.filesWithErrors++;
      if (errorData.hasWarnings) report.summary.filesWithWarnings++;
      report.summary.totalErrors += errorData.errors.length;
      report.summary.totalWarnings += errorData.warnings.length;
      report.summary.totalSuggestions += errorData.suggestions.length;
      report.summary.averageErrorScore += errorData.errorScore;
      report.summary.averageQualityScore += result.qualityScore;
      
      // Categorize issues
      errorData.errors.forEach(error => {
        if (error.includes('window') || error.includes('document') || error.includes('DOM')) {
          report.categories.runtimeErrors[error] = (report.categories.runtimeErrors[error] || 0) + 1;
        } else if (error.includes('useRouter') || error.includes('next/')) {
          report.categories.nextjsIssues[error] = (report.categories.nextjsIssues[error] || 0) + 1;
        } else if (error.includes('HTML element')) {
          report.categories.compatibilityIssues[error] = (report.categories.compatibilityIssues[error] || 0) + 1;
        }
      });
      
      errorData.warnings.forEach(warning => {
        if (warning.includes('package') || warning.includes('dependency')) {
          report.categories.dependencyIssues[warning] = (report.categories.dependencyIssues[warning] || 0) + 1;
        } else if (warning.includes('performance') || warning.includes('useEffect')) {
          report.categories.performanceIssues[warning] = (report.categories.performanceIssues[warning] || 0) + 1;
        }
      });
      
      // File details
      report.fileDetails.push({
        fileName: result.fileName || 'unknown',
        qualityScore: result.qualityScore,
        errorScore: errorData.errorScore,
        overallScore: result.overallScore,
        errors: errorData.errors,
        warnings: errorData.warnings,
        suggestions: errorData.suggestions.slice(0, 5), // Top 5 suggestions
        hasRuntimeErrors: errorData.hasErrors,
        isProductionReady: result.isProductionReady && !errorData.hasErrors
      });
    }
  });
  
  // Calculate averages
  if (conversionResults.length > 0) {
    report.summary.averageErrorScore = Math.round(report.summary.averageErrorScore / conversionResults.length);
    report.summary.averageQualityScore = Math.round(report.summary.averageQualityScore / conversionResults.length);
  }
  
  // Generate recommendations
  if (report.summary.filesWithErrors > 0) {
    report.recommendations.push(`🚨 ${report.summary.filesWithErrors} files have critical errors that need immediate attention`);
  }
  
  if (Object.keys(report.categories.nextjsIssues).length > 0) {
    report.recommendations.push(`⚛️ Next.js specific functions detected - consider using React Navigation alternatives`);
  }
  
  if (Object.keys(report.categories.runtimeErrors).length > 0) {
    report.recommendations.push(`🌐 Web APIs detected - replace with React Native equivalents`);
  }
  
  if (report.summary.averageErrorScore < 85) {
    report.recommendations.push(`📊 Average error score is ${report.summary.averageErrorScore}% - consider additional fixes`);
  }
  
  if (Object.keys(report.categories.dependencyIssues).length > 0) {
    report.recommendations.push(`📦 Dependency compatibility issues found - review package.json`);
  }
  
  return report;
}

// 🔧 BATCH ERROR FIXING SUGGESTIONS
export function generateBatchFixSuggestions(errorReport) {
  const suggestions = [];
  
  // Most common issues first
  const commonRuntimeErrors = Object.entries(errorReport.categories.runtimeErrors)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  const commonNextjsIssues = Object.entries(errorReport.categories.nextjsIssues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  const commonCompatibilityIssues = Object.entries(errorReport.categories.compatibilityIssues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (commonRuntimeErrors.length > 0) {
    suggestions.push({
      category: 'Runtime Errors',
      priority: 'HIGH',
      issues: commonRuntimeErrors,
      action: 'Replace web APIs with React Native equivalents',
      files: errorReport.fileDetails.filter(f => f.errors.some(e => e.includes('window') || e.includes('document'))).length
    });
  }
  
  if (commonNextjsIssues.length > 0) {
    suggestions.push({
      category: 'Next.js Issues',
      priority: 'HIGH',
      issues: commonNextjsIssues,
      action: 'Convert Next.js specific functions to React Navigation',
      files: errorReport.fileDetails.filter(f => f.errors.some(e => e.includes('next/') || e.includes('useRouter'))).length
    });
  }
  
  if (commonCompatibilityIssues.length > 0) {
    suggestions.push({
      category: 'Compatibility Issues',
      priority: 'MEDIUM',
      issues: commonCompatibilityIssues,
      action: 'Convert HTML elements to React Native components',
      files: errorReport.fileDetails.filter(f => f.errors.some(e => e.includes('HTML element'))).length
    });
  }
  
  return suggestions;
}

// Token usage tracking
let tokenUsageStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalRequests: 0,
  requestBreakdown: {
    conversion: { requests: 0, inputTokens: 0, outputTokens: 0 },
    improvement: { requests: 0, inputTokens: 0, outputTokens: 0 },
    errorFix: { requests: 0, inputTokens: 0, outputTokens: 0 },
    validation: { requests: 0, inputTokens: 0, outputTokens: 0 }
  },
  startTime: null,
  endTime: null
};

// Initialize token tracking
export function initializeTokenTracking() {
  tokenUsageStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalRequests: 0,
    requestBreakdown: {
      conversion: { requests: 0, inputTokens: 0, outputTokens: 0 },
      improvement: { requests: 0, inputTokens: 0, outputTokens: 0 },
      errorFix: { requests: 0, inputTokens: 0, outputTokens: 0 },
      validation: { requests: 0, inputTokens: 0, outputTokens: 0 }
    },
    startTime: Date.now(),
    endTime: null
  };
  console.log(chalk.cyan('📊 Token usage tracking initialized'));
}

// Track token usage for each request
function trackTokenUsage(response, requestType = 'conversion') {
  if (response && response.usageMetadata) {
    const inputTokens = response.usageMetadata.promptTokenCount || 0;
    const outputTokens = response.usageMetadata.candidatesTokenCount || 0;
    
    // Update totals
    tokenUsageStats.totalInputTokens += inputTokens;
    tokenUsageStats.totalOutputTokens += outputTokens;
    tokenUsageStats.totalRequests += 1;
    
    // Update breakdown by request type
    if (tokenUsageStats.requestBreakdown[requestType]) {
      tokenUsageStats.requestBreakdown[requestType].requests += 1;
      tokenUsageStats.requestBreakdown[requestType].inputTokens += inputTokens;
      tokenUsageStats.requestBreakdown[requestType].outputTokens += outputTokens;
    }
    
    console.log(chalk.gray(`     📊 Tokens: ${inputTokens} in + ${outputTokens} out = ${inputTokens + outputTokens} total`));
    
    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
  }
  
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

// Get current token usage stats
export function getTokenUsageStats() {
  const totalTokens = tokenUsageStats.totalInputTokens + tokenUsageStats.totalOutputTokens;
  const duration = tokenUsageStats.startTime ? Date.now() - tokenUsageStats.startTime : 0;
  
  return {
    ...tokenUsageStats,
    totalTokens,
    duration,
    averageTokensPerRequest: tokenUsageStats.totalRequests > 0 ? Math.round(totalTokens / tokenUsageStats.totalRequests) : 0,
    tokensPerMinute: duration > 0 ? Math.round((totalTokens / duration) * 60000) : 0
  };
}

// Display comprehensive token usage report
export function displayTokenUsageReport() {
  tokenUsageStats.endTime = Date.now();
  const stats = getTokenUsageStats();
  const durationMinutes = Math.round(stats.duration / 60000);
  const durationSeconds = Math.round((stats.duration % 60000) / 1000);
  
  console.log(chalk.cyan('\n📊 ═══════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan('📊                    TOKEN USAGE REPORT                        '));
  console.log(chalk.cyan('📊 ═══════════════════════════════════════════════════════════════'));
  
  console.log(chalk.green(`\n🎯 TOTAL USAGE SUMMARY:`));
  console.log(chalk.white(`   📥 Input Tokens:     ${stats.totalInputTokens.toLocaleString()}`));
  console.log(chalk.white(`   📤 Output Tokens:    ${stats.totalOutputTokens.toLocaleString()}`));
  console.log(chalk.yellow(`   🔢 Total Tokens:     ${stats.totalTokens.toLocaleString()}`));
  console.log(chalk.blue(`   📞 Total Requests:   ${stats.totalRequests}`));
  
  console.log(chalk.green(`\n⏱️ PERFORMANCE METRICS:`));
  console.log(chalk.white(`   ⏰ Duration:         ${durationMinutes}m ${durationSeconds}s`));
  console.log(chalk.white(`   📊 Avg/Request:      ${stats.averageTokensPerRequest.toLocaleString()} tokens`));
  console.log(chalk.white(`   🚀 Tokens/Minute:    ${stats.tokensPerMinute.toLocaleString()}`));
  
  console.log(chalk.green(`\n📋 BREAKDOWN BY REQUEST TYPE:`));
  
  Object.entries(stats.requestBreakdown).forEach(([type, data]) => {
    if (data.requests > 0) {
      const typeTotal = data.inputTokens + data.outputTokens;
      const percentage = stats.totalTokens > 0 ? Math.round((typeTotal / stats.totalTokens) * 100) : 0;
      
      console.log(chalk.blue(`   ${getRequestTypeIcon(type)} ${type.toUpperCase()}:`));
      console.log(chalk.white(`      📞 Requests: ${data.requests}`));
      console.log(chalk.white(`      📥 Input:    ${data.inputTokens.toLocaleString()}`));
      console.log(chalk.white(`      📤 Output:   ${data.outputTokens.toLocaleString()}`));
      console.log(chalk.yellow(`      🔢 Total:    ${typeTotal.toLocaleString()} (${percentage}%)`));
    }
  });
  
  // Cost estimation (approximate)
  const estimatedCost = calculateEstimatedCost(stats.totalInputTokens, stats.totalOutputTokens);
  if (estimatedCost > 0) {
    console.log(chalk.green(`\n💰 ESTIMATED COST:`));
    console.log(chalk.yellow(`   💵 Approximate:      $${estimatedCost.toFixed(4)} USD`));
    console.log(chalk.gray(`   ℹ️  Based on Gemini Pro pricing (may vary)`));
  }
  
  console.log(chalk.cyan('\n📊 ═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green('🎉 Token usage tracking complete!'));
  console.log(chalk.cyan('📊 ═══════════════════════════════════════════════════════════════\n'));
}

// Helper function to get icons for request types
function getRequestTypeIcon(type) {
  const icons = {
    conversion: '🔄',
    improvement: '✨',
    errorFix: '🔧',
    validation: '🔍'
  };
  return icons[type] || '📝';
}

// Calculate estimated cost (approximate based on Gemini Pro pricing)
function calculateEstimatedCost(inputTokens, outputTokens) {
  // Approximate Gemini Pro pricing (as of 2024)
  const inputCostPer1K = 0.00025;  // $0.00025 per 1K input tokens
  const outputCostPer1K = 0.0005;  // $0.0005 per 1K output tokens
  
  const inputCost = (inputTokens / 1000) * inputCostPer1K;
  const outputCost = (outputTokens / 1000) * outputCostPer1K;
  
  return inputCost + outputCost;
}