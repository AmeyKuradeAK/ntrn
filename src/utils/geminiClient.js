import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import prompts from 'prompts';
import { fileURLToPath } from 'url';
import { RateLimiter } from './rateLimiter.js';
import { createRateLimiter } from './rateLimiter.js';
import { convertShadcnToReactNative, detectShadcnComponents } from './shadcnConverter.js';
import { generateUltraRobustPrompt, generateSuggestionPrompt, generateImprovementPrompt } from './perfectPrompts.js';

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
    
    const response = await makeAPIRequest(prompt);
    
    // Extract code from response
    let convertedCode = extractCodeFromResponse(response);
    
    // Validate and get initial quality
    const initialQuality = validateCodeQuality(convertedCode, fileName, {});
    console.log(`📊 Initial AI Quality: ${initialQuality.qualityScore}%`);
    
    // Apply iterative quality improvement until 100% or max iterations
    const improvedResult = await improveCodeQuality(
      convertedCode, 
      fileName, 
      {},
      enhancedContext,
      5 // max iterations
    );
    
    return {
      code: improvedResult.code,
      originalCode: sourceCode,
      dependencies: {
        '@react-navigation/native': '^6.1.9',
        '@react-navigation/native-stack': '^6.9.17',
        'react-native-screens': '^3.27.0',
        'react-native-safe-area-context': '^4.7.4',
        ...shadcnInfo.dependencies,
        ...improvedResult.dependencies
      },
      shadcnInfo,
      qualityScore: improvedResult.quality.qualityScore,
      improvements: improvedResult.quality.iterationsUsed,
      isProductionReady: improvedResult.quality.isProductionReady
    };
  } catch (error) {
    console.error(`❌ Gemini API error for ${fileName}:`, error.message);
    throw new Error(`AI conversion failed: ${error.message}`);
  }
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
  return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[^a-zA-Z0-9]/g, '');
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

// Enhanced quality improvement system
async function improveCodeQuality(code, fileName, dependencies, projectContext, maxIterations = 5) {
  let currentCode = code;
  let currentDependencies = { ...dependencies };
  let iteration = 0;
  let bestQuality = validateCodeQuality(currentCode, fileName, currentDependencies);
  let bestCode = currentCode;
  let bestDependencies = { ...currentDependencies };

  console.log(`🎯 Starting quality improvement for ${fileName}`);
  console.log(`📊 Initial Quality Score: ${bestQuality.qualityScore}%`);

  // If already perfect, no need to iterate
  if (bestQuality.qualityScore === 100 && bestQuality.isProductionReady) {
    console.log(`✅ Perfect quality achieved on first attempt!`);
    return { code: currentCode, dependencies: currentDependencies, quality: bestQuality };
  }

  while (iteration < maxIterations && bestQuality.qualityScore < 100) {
    iteration++;
    console.log(`\n🔄 Quality Improvement Iteration ${iteration}/${maxIterations}`);
    
    try {
      // Generate improvement prompt based on current issues
      const improvementPrompt = generateImprovementPrompt(currentCode, fileName, bestQuality, projectContext);
      
      // Get improved code from AI
      const improvedResult = await makeQualityImprovementRequest(improvementPrompt, fileName);
      
      if (improvedResult && improvedResult.code) {
        // Validate the improved code
        const newQuality = validateCodeQuality(improvedResult.code, fileName, improvedResult.dependencies);
        
        console.log(`📊 Iteration ${iteration} Quality Score: ${newQuality.qualityScore}% (${newQuality.qualityScore > bestQuality.qualityScore ? '⬆️ Improved' : newQuality.qualityScore === bestQuality.qualityScore ? '➡️ Same' : '⬇️ Worse'})`);
        
        // Keep the best version
        if (newQuality.qualityScore > bestQuality.qualityScore || 
           (newQuality.qualityScore === bestQuality.qualityScore && newQuality.issues.length < bestQuality.issues.length)) {
          bestQuality = newQuality;
          bestCode = improvedResult.code;
          bestDependencies = { ...improvedResult.dependencies };
          
          console.log(`✅ Improvement accepted! New best: ${bestQuality.qualityScore}%`);
          
          // Update current code for next iteration
          currentCode = bestCode;
          currentDependencies = { ...bestDependencies };
          
          // If we reached perfection, break early
          if (bestQuality.qualityScore === 100 && bestQuality.isProductionReady) {
            console.log(`🎉 Perfect quality achieved in ${iteration} iterations!`);
            break;
          }
        } else {
          console.log(`⚠️ No improvement in iteration ${iteration}, keeping previous best`);
          
          // If no improvement for 2 consecutive iterations, try a different approach
          if (iteration >= 2) {
            console.log(`🔄 Trying alternative improvement approach...`);
            currentCode = bestCode; // Reset to best known version
          }
        }
      } else {
        console.log(`❌ Iteration ${iteration} failed, keeping previous version`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Quality improvement iteration ${iteration} failed:`, error.message);
      // Continue with next iteration or existing best code
    }
  }

  // Final report
  const improvement = bestQuality.qualityScore - validateCodeQuality(code, fileName, dependencies).qualityScore;
  console.log(`\n📈 Quality Improvement Summary for ${fileName}:`);
  console.log(`  🎯 Final Score: ${bestQuality.qualityScore}% ${bestQuality.isProductionReady ? '✅ Production Ready' : '⚠️ Needs Review'}`);
  console.log(`  📊 Improvement: +${improvement}% (${iteration} iterations)`);
  
  if (bestQuality.issues.length > 0) {
    console.log(`  🔧 Remaining Issues: ${bestQuality.issues.length}`);
    bestQuality.issues.forEach(issue => console.log(`    ${issue}`));
  }
  
  if (bestQuality.suggestions.length > 0) {
    console.log(`  💡 Suggestions: ${bestQuality.suggestions.length}`);
    bestQuality.suggestions.forEach(suggestion => console.log(`    ${suggestion}`));
  }

  return { 
    code: bestCode, 
    dependencies: bestDependencies, 
    quality: {
      ...bestQuality,
      iterationsUsed: iteration,
      totalImprovement: improvement
    }
  };
}

// Generate specific improvement prompts based on quality issues
function generateImprovementPrompt(code, fileName, quality, projectContext) {
  const { issues, suggestions } = quality;
  
  let improvementInstructions = `You are a React Native code quality expert. Your task is to IMPROVE the following code to achieve 100% quality score by fixing specific issues.

## CURRENT QUALITY ANALYSIS
**File**: ${fileName}
**Current Score**: ${quality.qualityScore}%
**Production Ready**: ${quality.isProductionReady ? 'Yes' : 'No'}

### CRITICAL ISSUES TO FIX:
${issues.length > 0 ? issues.map(issue => `- ${issue}`).join('\n') : 'None'}

### IMPROVEMENT SUGGESTIONS TO IMPLEMENT:
${suggestions.length > 0 ? suggestions.map(suggestion => `- ${suggestion}`).join('\n') : 'None'}

## SPECIFIC IMPROVEMENT REQUIREMENTS:

### 1. FIX CRITICAL ISSUES FIRST
- Ensure React and React Native imports are present
- Convert any remaining HTML elements to React Native components
- Wrap all text content in <Text> components
- Remove any web-specific APIs and replace with React Native equivalents

### 2. IMPLEMENT SUGGESTIONS
- Add missing accessibility props (accessibilityLabel, accessibilityRole)
- Use StyleSheet.create instead of inline styles where appropriate
- Add proper error handling for async operations
- Implement proper TypeScript interfaces

### 3. MOBILE UX ENHANCEMENTS
- Add proper touch feedback (activeOpacity, android_ripple)
- Implement SafeAreaView for screen components
- Add proper loading states and error boundaries
- Use proper mobile-appropriate spacing and sizing

### 4. PERFORMANCE OPTIMIZATIONS
- Use React.memo for expensive components
- Add proper key props for lists
- Optimize image loading and caching
- Use FlatList for long lists instead of ScrollView

## CODE TO IMPROVE:
\`\`\`tsx
${code}
\`\`\`

## OUTPUT REQUIREMENTS:
Return ONLY the improved code that addresses ALL issues and suggestions above:

IMPROVED_CODE:
\`\`\`tsx
// Your improved React Native code here
// Must fix all critical issues
// Must implement all suggestions
// Must be production-ready quality
\`\`\`

DEPENDENCIES:
\`\`\`json
{
  "dependencies": {
    "package-name": "^version"
  }
}
\`\`\`

CRITICAL: Focus on fixing the specific issues mentioned above. The goal is to reach 100% quality score.`;

  return improvementInstructions;
}

// Make quality improvement request to AI
async function makeQualityImprovementRequest(prompt, fileName) {
  try {
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
          temperature: 0.2, // Slightly higher for creative problem solving
          topP: 0.85,
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

    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content returned from Gemini');

    // Parse the improved code
    const codeMatch = content.match(/IMPROVED_CODE:\s*```tsx\n([\s\S]*?)```/);
    const depsMatch = content.match(/DEPENDENCIES:\s*```json\n([\s\S]*?)```/);

    let improvedCode = '';
    let dependencies = {};

    if (codeMatch && codeMatch[1]) {
      improvedCode = codeMatch[1].trim();
    } else {
      // Fallback parsing
      const codeBlocks = content.split('```');
      for (let i = 0; i < codeBlocks.length; i++) {
        if (codeBlocks[i].includes('tsx') && codeBlocks[i + 1]) {
          improvedCode = codeBlocks[i + 1].trim();
          break;
        }
      }
    }

    if (depsMatch && depsMatch[1]) {
      try {
        const json = JSON.parse(depsMatch[1].trim());
        dependencies = json.dependencies || json || {};
      } catch (err) {
        console.warn(`⚠️ Failed to parse improvement dependencies for ${fileName}`);
      }
    }

    if (!improvedCode || improvedCode.length < 50) {
      throw new Error('Improved code is too short or empty');
    }

    // Clean dependencies
    dependencies = Object.fromEntries(
      Object.entries(dependencies).filter(
        ([pkg, version]) =>
          typeof pkg === 'string' &&
          pkg.trim() &&
          typeof version === 'string' &&
          (version.startsWith('^') || version.startsWith('~') || version.match(/^\d/)) &&
          !pkg.includes('next')
      )
    );

    return { code: improvedCode, dependencies };
  } catch (error) {
    console.warn(`⚠️ Quality improvement request failed for ${fileName}:`, error.message);
    return null;
  }
}