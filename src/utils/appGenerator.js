import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class AppGenerator {
  constructor(rnProjectPath, conversionResults, routeStructure) {
    this.rnProjectPath = rnProjectPath;
    this.conversionResults = conversionResults;
    this.routeStructure = routeStructure;
    this.screensDir = path.join(rnProjectPath, 'screens');
    this.componentsDir = path.join(rnProjectPath, 'components');
  }

  async generateApp() {
    console.log(chalk.cyan('🏗️ Generating main App.tsx with navigation...'));

    const screens = await this.getAvailableScreens();
    const hasScreens = screens.length > 0;

    if (!hasScreens) {
      console.log(chalk.yellow('⚠️ No screens found, creating basic app structure'));
      await this.generateBasicApp();
      return;
    }

    // Determine navigation pattern
    const navPattern = this.determineNavigationPattern(screens);
    
    console.log(chalk.cyan(`📱 Setting up ${navPattern} navigation with ${screens.length} screens`));

    // Generate appropriate navigation structure
    switch (navPattern) {
      case 'tabs':
        await this.generateTabApp(screens);
        break;
      case 'drawer':
        await this.generateDrawerApp(screens);
        break;
      case 'stack':
      default:
        await this.generateStackApp(screens);
        break;
    }

    // Generate navigation types
    await this.generateNavigationTypes(screens);
    
    console.log(chalk.green('✅ App.tsx generated successfully'));
  }

  async getAvailableScreens() {
    const screens = [];
    
    // Ensure screens directory exists
    await fs.ensureDir(this.screensDir);
    
    if (await fs.exists(this.screensDir)) {
      const files = await fs.readdir(this.screensDir);
      
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const screenName = path.basename(file, path.extname(file));
          const filePath = path.join(this.screensDir, file);
          
          // Check if file actually has content (not just an error placeholder)
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const isValidScreen = !content.includes('CONVERSION FAILED') && 
                                 !content.includes('Manual conversion required') &&
                                 content.trim().length > 0;
            
            if (isValidScreen) {
              screens.push({
                name: screenName,
                file: file,
                component: screenName,
                route: this.getRouteForScreen(screenName)
              });
            }
          } catch (error) {
            console.warn(`⚠️ Could not read screen file: ${file}`);
          }
        }
      }
    }

    // Ensure we have at least a Home screen
    if (screens.length === 0) {
      await this.createFallbackHomeScreen();
      screens.push({
        name: 'HomeScreen',
        file: 'HomeScreen.tsx',
        component: 'HomeScreen',
        route: '/'
      });
    }

    return screens;
  }

  getRouteForScreen(screenName) {
    // Map screen names back to routes
    const routeMapping = {
      'HomeScreen': '/',
      'AboutScreen': '/about',
      'ContactScreen': '/contact',
      'ProfileScreen': '/profile',
      'SettingsScreen': '/settings',
      'LoginScreen': '/login',
      'SignupScreen': '/signup'
    };

    return routeMapping[screenName] || `/${screenName.toLowerCase().replace('screen', '')}`;
  }

  determineNavigationPattern(screens) {
    const screenNames = screens.map(s => s.name.toLowerCase());
    
    // Check for tab navigation patterns
    const tabIndicators = ['home', 'profile', 'settings', 'search', 'notifications'];
    const hasTabScreens = tabIndicators.some(indicator => 
      screenNames.some(name => name.includes(indicator))
    );

    // Check for drawer navigation patterns
    const drawerIndicators = ['menu', 'sidebar', 'drawer'];
    const hasDrawerScreens = drawerIndicators.some(indicator => 
      screenNames.some(name => name.includes(indicator))
    );

    if (screens.length >= 3 && hasTabScreens) {
      return 'tabs';
    } else if (screens.length >= 4 && hasDrawerScreens) {
      return 'drawer';
    } else {
      return 'stack';
    }
  }

  async generateStackApp(screens) {
    const imports = screens.map(screen => 
      `import ${screen.component} from './screens/${screen.file.replace('.tsx', '').replace('.ts', '')}';`
    ).join('\n');

    const screenComponents = screens.map(screen => 
      `        <Stack.Screen 
          name="${screen.name}" 
          component={${screen.component}}
          options={{ title: '${this.formatTitle(screen.name)}' }}
        />`
    ).join('\n');

    const homeScreen = screens.find(s => s.name.includes('Home')) || screens[0];

    const appContent = `
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

${imports}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="${homeScreen.name}"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
${screenComponents}
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`.trim();

    await fs.writeFile(path.join(this.rnProjectPath, 'App.tsx'), appContent);
  }

  async generateTabApp(screens) {
    // Separate tab screens from modal screens
    const tabScreens = screens.filter(s => 
      ['home', 'profile', 'settings', 'search'].some(tab => 
        s.name.toLowerCase().includes(tab)
      )
    ).slice(0, 5); // Limit to 5 tabs

    const modalScreens = screens.filter(s => !tabScreens.includes(s));

    const imports = [
      ...tabScreens.map(screen => 
        `import ${screen.component} from './screens/${screen.file.replace('.tsx', '').replace('.ts', '')}';`
      ),
      ...modalScreens.map(screen => 
        `import ${screen.component} from './screens/${screen.file.replace('.tsx', '').replace('.ts', '')}';`
      )
    ].join('\n');

    const tabScreenComponents = tabScreens.map(screen => 
      `        <Tab.Screen 
          name="${screen.name}" 
          component={${screen.component}}
          options={{
            title: '${this.formatTitle(screen.name)}',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="${this.getIconForScreen(screen.name)}" size={size} color={color} />
            ),
          }}
        />`
    ).join('\n');

    const modalScreenComponents = modalScreens.map(screen => 
      `        <Stack.Screen 
          name="${screen.name}" 
          component={${screen.component}}
          options={{ title: '${this.formatTitle(screen.name)}' }}
        />`
    ).join('\n');

    const appContent = `
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

${imports}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
      }}
    >
${tabScreenComponents}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabs} 
            options={{ headerShown: false }}
          />
${modalScreenComponents}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`.trim();

    await fs.writeFile(path.join(this.rnProjectPath, 'App.tsx'), appContent);
  }

  async generateDrawerApp(screens) {
    const imports = screens.map(screen => 
      `import ${screen.component} from './screens/${screen.file.replace('.tsx', '').replace('.ts', '')}';`
    ).join('\n');

    const screenComponents = screens.map(screen => 
      `        <Drawer.Screen 
          name="${screen.name}" 
          component={${screen.component}}
          options={{
            title: '${this.formatTitle(screen.name)}',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="${this.getIconForScreen(screen.name)}" size={size} color={color} />
            ),
          }}
        />`
    ).join('\n');

    const appContent = `
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

${imports}

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{
            drawerActiveTintColor: '#007AFF',
            drawerInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
          }}
        >
${screenComponents}
        </Drawer.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}`.trim();

    await fs.writeFile(path.join(this.rnProjectPath, 'App.tsx'), appContent);
  }

  async generateBasicApp() {
    const appContent = `
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>🎉 Conversion Complete!</Text>
          <Text style={styles.subtitle}>Your Next.js app has been converted to React Native</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 What's Next?</Text>
            <Text style={styles.text}>
              • Check the /screens folder for your converted pages{'\n'}
              • Review the /components folder for your UI components{'\n'}
              • Customize the navigation in App.tsx{'\n'}
              • Test on your preferred platform
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛠️ Development</Text>
            <Text style={styles.text}>
              Run: npx expo start{'\n'}
              Then scan the QR code with Expo Go app
            </Text>
          </View>
        </ScrollView>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});`.trim();

    await fs.writeFile(path.join(this.rnProjectPath, 'App.tsx'), appContent);
  }

  async createFallbackHomeScreen() {
    await fs.ensureDir(this.screensDir);
    
    const homeScreenContent = `
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🏠 Welcome Home</Text>
        <Text style={styles.subtitle}>Your Next.js app has been converted!</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Conversion Status</Text>
          <Text style={styles.cardText}>
            Your app has been successfully converted from Next.js to React Native.
            Check the other screens and components that were generated.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📱 Next Steps</Text>
          <Text style={styles.cardText}>
            • Customize this screen with your content{'\n'}
            • Add navigation between screens{'\n'}
            • Test on different devices{'\n'}
            • Deploy to app stores
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
});`.trim();

    await fs.writeFile(path.join(this.screensDir, 'HomeScreen.tsx'), homeScreenContent);
  }

  formatTitle(screenName) {
    return screenName
      .replace('Screen', '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  getIconForScreen(screenName) {
    const iconMap = {
      'HomeScreen': 'home',
      'ProfileScreen': 'person',
      'SettingsScreen': 'settings',
      'SearchScreen': 'search',
      'NotificationsScreen': 'notifications',
      'ContactScreen': 'mail',
      'AboutScreen': 'information-circle',
      'LoginScreen': 'log-in',
      'SignupScreen': 'person-add',
    };

    return iconMap[screenName] || 'document';
  }

  async generateNavigationTypes(screens) {
    const screenParams = screens.map(screen => 
      `  ${screen.name}: undefined;`
    ).join('\n');

    const typesContent = `
export type RootStackParamList = {
${screenParams}
};

export type RootTabParamList = {
${screenParams}
};

export type RootDrawerParamList = {
${screenParams}
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}`.trim();

    await fs.ensureDir(path.join(this.rnProjectPath, 'types'));
    await fs.writeFile(path.join(this.rnProjectPath, 'types', 'navigation.ts'), typesContent);
  }
} 