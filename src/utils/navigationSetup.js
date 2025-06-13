import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class NavigationSetup {
  constructor(rnProjectPath, routeStructure) {
    this.rnProjectPath = rnProjectPath;
    this.routeStructure = routeStructure;
    this.screenFiles = new Map();
  }

  async setupNavigation() {
    console.log(chalk.cyan('🧭 Setting up React Navigation...'));

    // Install navigation dependencies
    const navigationDeps = {
      '@react-navigation/native': '^6.1.0',
      '@react-navigation/stack': '^6.3.0',
      '@react-navigation/bottom-tabs': '^6.5.0',
      '@react-navigation/drawer': '^6.6.0',
      'react-native-screens': '^3.25.0',
      'react-native-safe-area-context': '^4.7.0',
      'react-native-gesture-handler': '^2.12.0'
    };

    // Generate screen components mapping
    this.generateScreenMapping();

    // Generate navigation structure
    const appNavigator = this.generateAppNavigator();
    
    // Create App.tsx with navigation
    const appContent = this.generateAppTsx(appNavigator);
    
    await fs.writeFile(path.join(this.rnProjectPath, 'App.tsx'), appContent);
    
    // Create navigation types
    const navigationTypes = this.generateNavigationTypes();
    await fs.writeFile(
      path.join(this.rnProjectPath, 'types', 'navigation.ts'), 
      navigationTypes
    );

    console.log(chalk.green('✅ React Navigation setup complete'));
    return navigationDeps;
  }

  generateScreenMapping() {
    const screens = new Map();
    
    const processRoute = (routes, parentPath = '') => {
      for (const [routePath, routeInfo] of Object.entries(routes)) {
        if (routeInfo.type === 'page') {
          const screenName = this.pathToScreenName(routePath);
          screens.set(screenName, {
            file: routeInfo.file,
            path: routePath,
            layout: routeInfo.layout
          });
        }
        
        if (typeof routeInfo === 'object' && !routeInfo.type) {
          processRoute(routeInfo, routePath);
        }
      }
    };
    
    processRoute(this.routeStructure);
    this.screenFiles = screens;
  }

  pathToScreenName(routePath) {
    if (routePath === '/' || routePath === '') return 'Home';
    
    return routePath
      .split('/')
      .filter(segment => segment && segment !== ':dynamic')
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join('') + 'Screen';
  }

  generateAppNavigator() {
    const screens = Array.from(this.screenFiles.entries());
    
    if (screens.length === 0) {
      return 'Home'; // Fallback to simple home screen
    }

    const hasMultipleScreens = screens.length > 1;
    const hasTabRoutes = screens.some(([name]) => 
      ['Home', 'Profile', 'Settings', 'About'].includes(name.replace('Screen', ''))
    );

    if (hasTabRoutes && hasMultipleScreens) {
      return this.generateTabNavigator(screens);
    } else if (hasMultipleScreens) {
      return this.generateStackNavigator(screens);
    } else {
      return 'Home';
    }
  }

  generateStackNavigator(screens) {
    const screenImports = screens.map(([name, info]) => 
      `import ${name} from './screens/${name}';`
    ).join('\n');

    const screenComponents = screens.map(([name, info]) => 
      `        <Stack.Screen name="${name}" component={${name}} />`
    ).join('\n');

    return `
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
${screenImports}

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
${screenComponents}
      </Stack.Navigator>
    </NavigationContainer>
  );
}`;
  }

  generateTabNavigator(screens) {
    const tabScreens = screens.filter(([name]) => 
      ['HomeScreen', 'ProfileScreen', 'SettingsScreen', 'AboutScreen'].includes(name)
    );

    const otherScreens = screens.filter(([name]) => 
      !['HomeScreen', 'ProfileScreen', 'SettingsScreen', 'AboutScreen'].includes(name)
    );

    const screenImports = screens.map(([name, info]) => 
      `import ${name} from './screens/${name}';`
    ).join('\n');

    const tabScreenComponents = tabScreens.map(([name, info]) => 
      `        <Tab.Screen name="${name.replace('Screen', '')}" component={${name}} />`
    ).join('\n');

    const stackScreenComponents = otherScreens.map(([name, info]) => 
      `        <Stack.Screen name="${name}" component={${name}} />`
    ).join('\n');

    return `
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
${screenImports}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
${tabScreenComponents}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
${stackScreenComponents}
      </Stack.Navigator>
    </NavigationContainer>
  );
}`;
  }

  generateAppTsx(navigator) {
    if (navigator === 'Home') {
      return `
import React from 'react';
import { SafeAreaView } from 'react-native';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <HomeScreen />
    </SafeAreaView>
  );
}`.trim();
    }

    return `
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './AppNavigator';

export default function App() {
  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}`.trim();
  }

  generateNavigationTypes() {
    const screens = Array.from(this.screenFiles.keys());
    
    const screenTypes = screens.map(name => `  ${name}: undefined;`).join('\n');
    
    return `
export type RootStackParamList = {
${screenTypes}
};

export type ScreenProps = {
  navigation: any;
  route: any;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}`.trim();
  }
} 