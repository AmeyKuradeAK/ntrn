// Ultra-robust AI prompts for 100% working React Native conversions
// These prompts are designed to be more comprehensive than Cursor AI

export function generateUltraRobustPrompt(sourceCode, fileName, projectContext) {
  const { dependencies, hasStateManagement, hasApiRoutes, shadcnInfo } = projectContext;
  
  return `# ULTRA-ROBUST NEXT.JS TO REACT NATIVE CONVERSION

You are an expert React Native developer converting Next.js code. Your output MUST be 100% functional, production-ready React Native code with ZERO errors.

## 🎯 CRITICAL SUCCESS REQUIREMENTS

**MANDATORY RULES - NEVER VIOLATE:**
1. **ALL CODE MUST COMPILE** - Zero syntax errors, zero runtime errors
2. **ALL IMPORTS MUST BE VALID** - Only use imports that exist in React Native ecosystem
3. **ALL TEXT MUST BE IN <Text>** - Never put raw text outside Text components
4. **ALL EVENTS MUST USE onPress** - Never use onClick in React Native
5. **ALL STYLES MUST USE StyleSheet** - Never use className or inline styles
6. **ALL NAVIGATION MUST USE @react-navigation** - Install and configure properly

## 📱 REACT NATIVE CONVERSION CONTEXT

**Target Framework:** React Native with Expo
**Navigation:** @react-navigation/native-stack
**Styling:** StyleSheet (NO CSS, NO className)
**State:** React hooks (useState, useEffect)
**Images:** expo-image
**Storage:** @react-native-async-storage/async-storage

## 🔧 AUTOMATIC DEPENDENCY RESOLUTION

Based on code analysis, automatically include these dependencies if used:

### Core React Native
\`\`\`javascript
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  FlatList,
  Modal,
  Alert
} from 'react-native';
\`\`\`

### Navigation (ALWAYS include if routing detected)
\`\`\`javascript
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
\`\`\`

### Storage (if localStorage/sessionStorage found)
\`\`\`javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
\`\`\`

### Images (if Image components found)
\`\`\`javascript
import { Image } from 'expo-image';
\`\`\`

## 🎨 SHADCN/UI CONVERSION ${shadcnInfo?.hasComponents ? '(DETECTED!)' : ''}

${shadcnInfo?.hasComponents ? `
**CRITICAL: Shadcn components detected: ${shadcnInfo.components.join(', ')}**

### Mandatory Shadcn Conversions:

#### Button → TouchableOpacity
\`\`\`jsx
// WRONG (Shadcn)
<Button variant="default" onClick={handleClick}>Text</Button>

// CORRECT (React Native)
<TouchableOpacity 
  style={styles.button}
  onPress={handleClick}
  activeOpacity={0.7}
  accessibilityRole="button"
>
  <Text style={styles.buttonText}>Text</Text>
</TouchableOpacity>
\`\`\`

#### Input → TextInput
\`\`\`jsx
// WRONG (Shadcn)
<Input type="email" placeholder="Enter email" onChange={setEmail} />

// CORRECT (React Native)
<TextInput
  style={styles.input}
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
/>
\`\`\`

#### Card → View
\`\`\`jsx
// WRONG (Shadcn)
<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>

// CORRECT (React Native)
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Title</Text>
  </View>
</View>
\`\`\`
` : ''}

## 🌐 WEB API CONVERSION PATTERNS

### Storage APIs
\`\`\`javascript
// CONVERT: localStorage → AsyncStorage
localStorage.setItem('key', 'value') → await AsyncStorage.setItem('key', 'value')
localStorage.getItem('key') → await AsyncStorage.getItem('key')
\`\`\`

### Navigation APIs
\`\`\`javascript
// CONVERT: router → navigation
router.push('/path') → navigation.navigate('ScreenName')
router.back() → navigation.goBack()
\`\`\`

### Event APIs
\`\`\`javascript
// CONVERT: onClick → onPress
onClick={handler} → onPress={handler}
\`\`\`

## 📋 COMPONENT TRANSFORMATION MATRIX

| Web Element | React Native | Required Props | Style Requirements |
|-------------|--------------|----------------|-------------------|
| \`<div>\` | \`<View>\` | None | Use StyleSheet |
| \`<span>\` | \`<Text>\` | None | Use StyleSheet |
| \`<button>\` | \`<TouchableOpacity>\` | onPress | activeOpacity={0.7} |
| \`<input>\` | \`<TextInput>\` | value, onChangeText | style prop |
| \`<img>\` | \`<Image>\` | source | from expo-image |
| \`<a>\` | \`<TouchableOpacity>\` | onPress | navigation.navigate |

## 🎯 ULTRA-SPECIFIC CONVERSION RULES

### 1. TEXT HANDLING (CRITICAL)
**EVERY piece of text MUST be in <Text>:**
\`\`\`jsx
// WRONG - WILL CRASH
<View>Hello World</View>

// CORRECT - WILL WORK
<View><Text>Hello World</Text></View>
\`\`\`

### 2. STYLING (CRITICAL)
**NEVER use className, ALWAYS use StyleSheet:**
\`\`\`jsx
// WRONG - WILL ERROR
<View className="container">

// CORRECT - WILL WORK
<View style={styles.container}>
\`\`\`

### 3. IMPORTS (CRITICAL)
**Include ALL required imports at top:**
\`\`\`javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
\`\`\`

### 4. PROPS VALIDATION
**Ensure all props are React Native compatible:**
- onClick → onPress
- className → style
- href → onPress with navigation
- src → source (for Images)

## 🔍 ERROR PREVENTION CHECKLIST

Before outputting code, verify:
- ✅ All imports are valid React Native modules
- ✅ All text is wrapped in <Text> components  
- ✅ All interactive elements use onPress
- ✅ All styles use StyleSheet
- ✅ Navigation uses @react-navigation patterns
- ✅ No web-only APIs remain
- ✅ Component structure is valid JSX

## 📱 MOBILE-FIRST OPTIMIZATIONS

### Touch Targets
\`\`\`javascript
// Minimum 44pt touch targets
minHeight: 44,
minWidth: 44,
\`\`\`

### Accessibility
\`\`\`javascript
accessibilityRole="button"
accessibilityLabel="Descriptive label"
\`\`\`

### Performance
\`\`\`javascript
// Use FlatList for lists
// Use Image from expo-image
// Optimize re-renders with useCallback
\`\`\`

## 🎯 FINAL OUTPUT REQUIREMENTS

Your response MUST include:

1. **Complete functional component** with all imports
2. **StyleSheet** with all required styles
3. **Error-free JSX** that compiles immediately
4. **Navigation setup** if routing is used
5. **Dependency list** for package.json

## 🔧 DEPENDENCIES TO INCLUDE

Based on conversion, include in package.json:
\`\`\`json
{
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/native-stack": "^6.9.17",
  "react-native-screens": "^3.27.0",
  "react-native-safe-area-context": "^4.7.4",
  "expo-image": "^1.8.1",
  "@react-native-async-storage/async-storage": "^1.19.5"
}
\`\`\`

---

## 📋 SOURCE CODE TO CONVERT:

**File:** ${fileName}
**Project Context:** ${JSON.stringify(projectContext, null, 2)}

\`\`\`${getFileExtension(fileName)}
${sourceCode}
\`\`\`

## 🎯 YOUR TASK:

Convert this code to 100% functional React Native following ALL rules above. Output ONLY the converted code with imports and styles. The code must run without ANY errors or modifications.

**CRITICAL:** Your output will be directly used in a React Native app. It MUST work perfectly on first try.`;
}

function getFileExtension(fileName) {
  return fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? 'jsx' : 'javascript';
}

// Enhanced prompt for iterative improvement
export function generateImprovementPrompt(code, fileName, issues, iteration) {
  return `# REACT NATIVE CODE IMPROVEMENT - ITERATION ${iteration}

You are fixing React Native code to achieve 100% quality. This is iteration ${iteration}/5.

## 🎯 CURRENT ISSUES TO FIX:

${issues.map(issue => `❌ **${issue.type}**: ${issue.description}`).join('\n')}

## 🔧 MANDATORY FIXES:

### 1. Import Issues
- Ensure ALL imports are valid React Native modules
- Remove any web-only imports
- Add missing React Native imports

### 2. Component Issues  
- Wrap ALL text in <Text> components
- Convert ALL className to style props
- Convert ALL onClick to onPress

### 3. Navigation Issues
- Use proper @react-navigation/native patterns
- Install required navigation dependencies
- Convert router.push to navigation.navigate

### 4. Style Issues
- Use StyleSheet.create for all styles
- Remove any CSS-like properties
- Use React Native style properties only

## 📱 CURRENT CODE:

\`\`\`jsx
${code}
\`\`\`

## 🎯 YOUR TASK:

Fix ALL issues above and return 100% working React Native code. The output must:
- Compile without errors
- Run without crashes  
- Follow React Native best practices
- Be production-ready

**CRITICAL:** Each iteration must improve quality score towards 100%.`;
}

// Context-aware prompts based on file type
export function generateContextualPrompt(sourceCode, fileName, projectContext) {
  const isPage = fileName.includes('/pages/') || fileName.includes('\\pages\\');
  const isComponent = !isPage;
  const hasNavigation = sourceCode.includes('router') || sourceCode.includes('Link');
  const hasState = sourceCode.includes('useState') || sourceCode.includes('state');
  const hasEffects = sourceCode.includes('useEffect') || sourceCode.includes('componentDidMount');

  let contextualInstructions = '';

  if (isPage) {
    contextualInstructions += `
## 📄 PAGE CONVERSION CONTEXT

This is a Next.js PAGE - convert to React Native SCREEN:
- Add navigation setup if needed
- Convert routing to navigation.navigate()
- Handle screen lifecycle properly
- Add proper screen styling
`;
  }

  if (isComponent) {
    contextualInstructions += `
## 🧩 COMPONENT CONVERSION CONTEXT

This is a Next.js COMPONENT - convert to React Native component:
- Ensure reusability across screens
- Convert props properly
- Handle touch interactions
- Optimize for mobile performance
`;
  }

  if (hasNavigation) {
    contextualInstructions += `
## 🧭 NAVIGATION DETECTED

Navigation patterns found - MANDATORY conversions:
- router.push() → navigation.navigate()
- Link components → TouchableOpacity with navigation
- router.back() → navigation.goBack()
- Add useNavigation hook
`;
  }

  if (hasState) {
    contextualInstructions += `
## 🔄 STATE MANAGEMENT DETECTED

State patterns found - optimize for mobile:
- Preserve useState patterns
- Convert class state to hooks if needed
- Optimize re-renders for mobile performance
- Handle async state properly
`;
  }

  return generateUltraRobustPrompt(sourceCode, fileName, projectContext) + contextualInstructions;
}

// Suggestion resolution prompt
export function generateSuggestionPrompt(code, fileName, suggestions) {
  return `# IMPLEMENT ALL SUGGESTIONS FOR 100% QUALITY

You must implement ALL suggestions to achieve perfect React Native code.

## 📋 SUGGESTIONS TO IMPLEMENT:

${suggestions.map((suggestion, index) => `
### ${index + 1}. ${suggestion}
**Action Required:** Implement this suggestion completely
`).join('')}

## 📱 CURRENT CODE:

\`\`\`jsx
${code}
\`\`\`

## 🎯 YOUR TASK:

Implement EVERY suggestion above and return the improved code. The result must:
- Address all suggestions completely
- Maintain 100% functionality  
- Be production-ready React Native code
- Follow all React Native best practices

**CRITICAL:** Implement suggestions, don't just acknowledge them.`;
} 