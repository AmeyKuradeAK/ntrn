import path from 'path';
import fs from 'fs-extra';

// Helper functions (defined first)
function getButtonVariant(variant) {
  const variants = {
    'default': 'defaultButton',
    'primary': 'primaryButton',
    'secondary': 'secondaryButton',
    'destructive': 'destructiveButton',
    'outline': 'outlineButton',
    'ghost': 'ghostButton'
  };
  return variants[variant] || 'defaultButton';
}

function getKeyboardType(inputType) {
  const types = {
    'email': '"email-address"',
    'number': '"numeric"',
    'tel': '"phone-pad"',
    'url': '"url"',
    'search': '"web-search"'
  };
  return types[inputType] || '"default"';
}

// Comprehensive Shadcn/ui to React Native component mapping
const SHADCN_TO_RN_MAPPING = {
  // Basic Components
  'Button': {
    component: 'TouchableOpacity',
    imports: ['TouchableOpacity', 'Text'],
    dependencies: {},
    conversion: (props, children) => `
<TouchableOpacity 
  style={[styles.button, ${props.className ? `styles.${getButtonVariant(props.variant)}` : 'styles.defaultButton'}]}
  onPress={${props.onClick || 'onPress'}}
  disabled={${props.disabled || 'false'}}
  activeOpacity={0.7}
  accessibilityRole="button"
  ${props.disabled ? 'accessibilityState={{ disabled: true }}' : ''}
>
  <Text style={[styles.buttonText, ${props.disabled ? 'styles.disabledText' : ''}]}>
    ${children}
  </Text>
</TouchableOpacity>`
  },

  'Input': {
    component: 'TextInput',
    imports: ['TextInput', 'View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.inputContainer}>
  <TextInput
    style={[styles.input, ${props.className ? `styles.${props.className}` : ''}]}
    placeholder={${props.placeholder || '""'}}
    value={${props.value || 'value'}}
    onChangeText={${props.onChange || 'onChangeText'}}
    secureTextEntry={${props.type === 'password' ? 'true' : 'false'}}
    keyboardType={${getKeyboardType(props.type)}}
    editable={${props.disabled ? 'false' : 'true'}}
    selectTextOnFocus={true}
    accessibilityLabel={${props.placeholder || '""'}}
  />
</View>`
  },

  'Card': {
    component: 'View',
    imports: ['View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={[styles.card, ${props.className ? `styles.${props.className}` : ''}]}>
  ${children}
</View>`
  },

  'CardHeader': {
    component: 'View',
    imports: ['View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.cardHeader}>
  ${children}
</View>`
  },

  'CardContent': {
    component: 'View',
    imports: ['View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.cardContent}>
  ${children}
</View>`
  },

  'CardTitle': {
    component: 'Text',
    imports: ['Text'],
    dependencies: {},
    conversion: (props, children) => `
<Text style={styles.cardTitle} accessibilityRole="header">
  ${children}
</Text>`
  },

  'Badge': {
    component: 'View',
    imports: ['View', 'Text'],
    dependencies: {},
    conversion: (props, children) => `
<View style={[styles.badge, styles.${props.variant || 'default'}Badge]}>
  <Text style={styles.badgeText}>
    ${children}
  </Text>
</View>`
  },

  'Avatar': {
    component: 'Image',
    imports: ['View'],
    dependencies: { 'expo-image': '^1.10.0' },
    conversion: (props, children) => `
<View style={styles.avatarContainer}>
  <Image
    source={${props.src ? `{ uri: ${props.src} }` : 'require("./assets/default-avatar.png")'}}
    style={[styles.avatar, ${props.className ? `styles.${props.className}` : ''}]}
    contentFit="cover"
    accessibilityLabel={${props.alt || '"User avatar"'}}
  />
  ${children ? `<View style={styles.avatarFallback}><Text style={styles.avatarFallbackText}>${children}</Text></View>` : ''}
</View>`
  },

  'Dialog': {
    component: 'Modal',
    imports: ['Modal', 'View', 'TouchableOpacity'],
    dependencies: {},
    conversion: (props, children) => `
<Modal
  visible={${props.open || 'visible'}}
  transparent={true}
  animationType="fade"
  onRequestClose={${props.onOpenChange || 'onClose'}}
>
  <View style={styles.modalOverlay}>
    <View style={styles.dialogContent}>
      ${children}
    </View>
  </View>
</Modal>`
  },

  'AlertDialog': {
    component: 'Modal',
    imports: ['Modal', 'View', 'TouchableOpacity'],
    dependencies: {},
    conversion: (props, children) => `
<Modal
  visible={${props.open || 'visible'}}
  transparent={true}
  animationType="fade"
  onRequestClose={${props.onOpenChange || 'onClose'}}
>
  <View style={styles.alertOverlay}>
    <View style={styles.alertContent}>
      ${children}
    </View>
  </View>
</Modal>`
  },

  'Sheet': {
    component: 'Modal',
    imports: ['Modal', 'View', 'ScrollView'],
    dependencies: { 'react-native-gesture-handler': '^2.14.0' },
    conversion: (props, children) => `
<Modal
  visible={${props.open || 'visible'}}
  transparent={true}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={${props.onOpenChange || 'onClose'}}
>
  <View style={styles.sheetContainer}>
    <View style={styles.sheetContent}>
      <View style={styles.sheetHandle} />
      <ScrollView style={styles.sheetBody}>
        ${children}
      </ScrollView>
    </View>
  </View>
</Modal>`
  },

  'Tabs': {
    component: 'View',
    imports: ['View', 'TouchableOpacity', 'Text'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.tabsContainer}>
  <View style={styles.tabsList}>
    {tabs.map((tab, index) => (
      <TouchableOpacity
        key={tab.value}
        style={[styles.tabTrigger, activeTab === tab.value && styles.activeTab]}
        onPress={() => setActiveTab(tab.value)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === tab.value }}
      >
        <Text style={[styles.tabText, activeTab === tab.value && styles.activeTabText]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.tabContent}>
    ${children}
  </View>
</View>`
  },

  'Select': {
    component: 'TouchableOpacity',
    imports: ['TouchableOpacity', 'Text', 'View', 'Modal', 'FlatList'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.selectContainer}>
  <TouchableOpacity
    style={styles.selectTrigger}
    onPress={() => setSelectOpen(true)}
    accessibilityRole="button"
    accessibilityLabel="Open select"
  >
    <Text style={styles.selectValue}>
      {${props.value || 'selectedValue'} || ${props.placeholder || '"Select an option"'}}
    </Text>
    <Text style={styles.selectIcon}>▼</Text>
  </TouchableOpacity>
  
  <Modal
    visible={selectOpen}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setSelectOpen(false)}
  >
    <TouchableOpacity 
      style={styles.selectOverlay} 
      onPress={() => setSelectOpen(false)}
    >
      <View style={styles.selectContent}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.selectItem}
              onPress={() => {
                ${props.onValueChange || 'onSelect'}(item.value);
                setSelectOpen(false);
              }}
            >
              <Text style={styles.selectItemText}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
</View>`
  },

  'Checkbox': {
    component: 'TouchableOpacity',
    imports: ['TouchableOpacity', 'View', 'Text'],
    dependencies: {},
    conversion: (props, children) => `
<TouchableOpacity
  style={styles.checkboxContainer}
  onPress={() => ${props.onCheckedChange || 'onToggle'}(!${props.checked || 'checked'})}
  accessibilityRole="checkbox"
  accessibilityState={{ checked: ${props.checked || 'checked'} }}
>
  <View style={[styles.checkbox, ${props.checked || 'checked'} && styles.checkboxChecked]}>
    {${props.checked || 'checked'} && <Text style={styles.checkmark}>✓</Text>}
  </View>
  ${children ? `<Text style={styles.checkboxLabel}>${children}</Text>` : ''}
</TouchableOpacity>`
  },

  'Switch': {
    component: 'Switch',
    imports: ['Switch', 'View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.switchContainer}>
  <Switch
    value={${props.checked || 'checked'}}
    onValueChange={${props.onCheckedChange || 'onToggle'}}
    trackColor={{ false: '#767577', true: '#81b0ff' }}
    thumbColor={${props.checked || 'checked'} ? '#f5dd4b' : '#f4f3f4'}
    accessibilityLabel="Toggle switch"
  />
  ${children ? `<Text style={styles.switchLabel}>${children}</Text>` : ''}
</View>`
  },

  'Progress': {
    component: 'View',
    imports: ['View'],
    dependencies: {},
    conversion: (props, children) => `
<View style={styles.progressContainer}>
  <View style={styles.progressTrack}>
    <View 
      style={[
        styles.progressFill, 
        { width: \`\${${props.value || 'progress'}}%\` }
      ]} 
    />
  </View>
</View>`
  },

  'Slider': {
    component: 'Slider',
    imports: ['View'],
    dependencies: { '@react-native-community/slider': '^4.4.2' },
    conversion: (props, children) => `
<View style={styles.sliderContainer}>
  <Slider
    style={styles.slider}
    minimumValue={${props.min || '0'}}
    maximumValue={${props.max || '100'}}
    value={${props.value || 'value'}}
    onValueChange={${props.onValueChange || 'onValueChange'}}
    minimumTrackTintColor="#1976d2"
    maximumTrackTintColor="#d3d3d3"
    thumbStyle={styles.sliderThumb}
  />
</View>`
  },

  'Toast': {
    component: 'View',
    imports: ['View', 'Text'],
    dependencies: { 'react-native-toast-message': '^2.1.6' },
    conversion: (props, children) => `
// Use Toast.show() instead of JSX
Toast.show({
  type: '${props.variant || 'success'}',
  text1: ${props.title || '""'},
  text2: ${children || '""'},
  position: 'top',
  visibilityTime: ${props.duration || '4000'},
});`
  }
};

// Helper function to generate appropriate styles for components
function generateShadcnStyles() {
  return `
const styles = StyleSheet.create({
  // Button styles
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  defaultButton: {
    backgroundColor: '#0f172a',
  },
  primaryButton: {
    backgroundColor: '#0f172a',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  disabledText: {
    color: '#94a3b8',
  },

  // Input styles
  inputContainer: {
    marginVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
    minHeight: 44,
  },

  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },

  // Badge styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  defaultBadge: {
    backgroundColor: '#f1f5f9',
  },
  primaryBadge: {
    backgroundColor: '#0f172a',
  },
  secondaryBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  destructiveBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },

  // Avatar styles
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  avatarFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    margin: 20,
    maxWidth: 300,
    width: '80%',
  },

  // Sheet styles
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 32,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Tabs styles
  tabsContainer: {
    flex: 1,
  },
  tabsList: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabTrigger: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0f172a',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },

  // Select styles
  selectContainer: {
    position: 'relative',
  },
  selectTrigger: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    minHeight: 44,
  },
  selectValue: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  selectIcon: {
    fontSize: 12,
    color: '#64748b',
  },
  selectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxHeight: 200,
    width: '80%',
    maxWidth: 300,
  },
  selectItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectItemText: {
    fontSize: 14,
    color: '#0f172a',
  },

  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0f172a',
  },

  // Switch styles
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0f172a',
  },

  // Progress styles
  progressContainer: {
    marginVertical: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 4,
  },

  // Slider styles
  sliderContainer: {
    marginVertical: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#0f172a',
    width: 20,
    height: 20,
  },
});`;
}



// Main function to detect and convert Shadcn components
export function detectShadcnComponents(sourceCode, fileName) {
  const detectedComponents = [];
  const requiredDependencies = {};
  
  // Look for Shadcn component imports
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"`]@\/components\/ui\/([^'"`]+)['"`]/g;
  let match;
  
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const components = match[1].split(',').map(c => c.trim());
    const uiFile = match[2];
    
    components.forEach(component => {
      if (SHADCN_TO_RN_MAPPING[component]) {
        detectedComponents.push({
          name: component,
          originalImport: match[0],
          uiFile: uiFile,
          mapping: SHADCN_TO_RN_MAPPING[component]
        });
        
        // Collect dependencies
        Object.assign(requiredDependencies, SHADCN_TO_RN_MAPPING[component].dependencies);
      }
    });
  }
  
  // Also check for direct usage of components
  Object.keys(SHADCN_TO_RN_MAPPING).forEach(componentName => {
    const usage = new RegExp(`<${componentName}\\b`, 'g');
    if (usage.test(sourceCode) && !detectedComponents.some(c => c.name === componentName)) {
      detectedComponents.push({
        name: componentName,
        originalImport: null,
        uiFile: 'direct-usage',
        mapping: SHADCN_TO_RN_MAPPING[componentName]
      });
      
      Object.assign(requiredDependencies, SHADCN_TO_RN_MAPPING[componentName].dependencies);
    }
  });
  
  return {
    components: detectedComponents,
    dependencies: requiredDependencies,
    hasComponents: detectedComponents.length > 0
  };
}

// Convert Shadcn imports to React Native imports
export function convertShadcnImports(sourceCode, detectedComponents) {
  let convertedCode = sourceCode;
  
  // Remove original Shadcn imports
  detectedComponents.forEach(comp => {
    if (comp.originalImport) {
      convertedCode = convertedCode.replace(comp.originalImport, '');
    }
  });
  
  // Collect all required React Native imports
  const requiredImports = new Set(['React']);
  const requiredRNImports = new Set();
  const requiredExpoImports = {};
  
  detectedComponents.forEach(comp => {
    comp.mapping.imports.forEach(imp => {
      if (['View', 'Text', 'TouchableOpacity', 'TextInput', 'Modal', 'ScrollView', 'FlatList', 'Switch'].includes(imp)) {
        requiredRNImports.add(imp);
      } else if (imp === 'Image') {
        requiredExpoImports['expo-image'] = ['Image'];
      }
    });
  });
  
  // Add React import if not present
  if (!convertedCode.includes('import React')) {
    convertedCode = `import React from 'react';\n${convertedCode}`;
  }
  
  // Add React Native imports
  if (requiredRNImports.size > 0) {
    const rnImports = `import { ${Array.from(requiredRNImports).join(', ')} } from 'react-native';\n`;
    convertedCode = convertedCode.replace(/^import React[^\n]*\n/, `$&${rnImports}`);
  }
  
  // Add Expo imports
  Object.entries(requiredExpoImports).forEach(([pkg, imports]) => {
    const expoImport = `import { ${imports.join(', ')} } from '${pkg}';\n`;
    convertedCode = convertedCode.replace(/^import React[^\n]*\n/, `$&${expoImport}`);
  });
  
  return convertedCode;
}

// Convert Shadcn JSX to React Native JSX
export function convertShadcnJSX(sourceCode, detectedComponents) {
  let convertedCode = sourceCode;
  
  detectedComponents.forEach(comp => {
    const componentName = comp.name;
    const mapping = comp.mapping;
    
    // Create regex to match component usage
    const componentRegex = new RegExp(
      `<${componentName}(\\s[^>]*)?>([\\s\\S]*?)<\\/${componentName}>|<${componentName}(\\s[^>]*)?\\s*\\/>`,
      'g'
    );
    
    convertedCode = convertedCode.replace(componentRegex, (match, props1, children, props2) => {
      const props = props1 || props2 || '';
      const content = children || '';
      
      // Parse props (simplified)
      const propsObj = {};
      const propMatches = props.match(/(\w+)=\{([^}]+)\}|(\w+)="([^"]+)"/g);
      if (propMatches) {
        propMatches.forEach(prop => {
          const [key, value] = prop.split('=');
          propsObj[key] = value.replace(/[{}'"]/g, '');
        });
      }
      
      return mapping.conversion(propsObj, content.trim());
    });
  });
  
  return convertedCode;
}

// Generate complete converted component with styles
export function generateConvertedShadcnComponent(sourceCode, fileName, detectedComponents) {
  // Convert imports
  let convertedCode = convertShadcnImports(sourceCode, detectedComponents);
  
  // Convert JSX
  convertedCode = convertShadcnJSX(convertedCode, detectedComponents);
  
  // Add StyleSheet import if styles are needed
  if (detectedComponents.length > 0) {
    convertedCode = convertedCode.replace(
      /import { ([^}]+) } from 'react-native';/,
      `import { $1, StyleSheet } from 'react-native';`
    );
    
    // Add styles at the end
    convertedCode += '\n\n' + generateShadcnStyles();
  }
  
  return convertedCode;
}

// Main export function
export function convertShadcnToReactNative(sourceCode, fileName) {
  const detection = detectShadcnComponents(sourceCode, fileName);
  
  if (!detection.hasComponents) {
    return {
      code: sourceCode,
      dependencies: {},
      shadcnInfo: {
        hasComponents: false,
        components: []
      }
    };
  }
  
  const convertedCode = generateConvertedShadcnComponent(
    sourceCode, 
    fileName, 
    detection.components
  );
  
  return {
    code: convertedCode,
    dependencies: detection.dependencies,
    shadcnInfo: {
      hasComponents: true,
      components: detection.components.map(c => c.name),
      conversionsApplied: detection.components.length
    }
  };
} 