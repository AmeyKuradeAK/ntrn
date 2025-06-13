import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

// Core React Native dependencies that are always needed
const CORE_DEPENDENCIES = {
  '@react-navigation/native': '^6.1.9',
  '@react-navigation/native-stack': '^6.9.17',
  'react-native-screens': '^3.27.0',
  'react-native-safe-area-context': '^4.7.4',
  '@react-native-async-storage/async-storage': '^1.19.5'
};

// Optional dependencies based on usage
const OPTIONAL_DEPENDENCIES = {
  'expo-image': '^1.8.1',
  'expo-linear-gradient': '^13.0.2',
  'expo-location': '^16.5.5',
  'expo-clipboard': '^5.0.1',
  'expo-file-system': '^16.0.6',
  'react-native-gesture-handler': '^2.14.0',
  '@react-native-community/slider': '^4.4.2',
  'react-native-toast-message': '^2.1.6'
};

export class DependencyManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.packageJsonPath = path.join(projectPath, 'package.json');
  }

  // Install core navigation dependencies automatically
  async installCoreNavigationDeps() {
    console.log('🔧 Installing React Navigation dependencies...');
    
    try {
      // Try to detect package manager
      const packageManager = await this.detectPackageManager();
      
      const deps = Object.entries(CORE_DEPENDENCIES)
        .map(([pkg, version]) => `${pkg}@${version}`)
        .join(' ');

      const command = packageManager === 'yarn' 
        ? `yarn add ${deps}`
        : `npm install ${deps}`;

      console.log(`📦 Running: ${command}`);
      
      execSync(command, { 
        cwd: this.projectPath, 
        stdio: 'inherit',
        timeout: 300000 // 5 minute timeout
      });

      console.log('✅ Navigation dependencies installed successfully');
      return { success: true, installedDeps: Object.keys(CORE_DEPENDENCIES) };
      
    } catch (error) {
      console.error('❌ Failed to install navigation dependencies:', error.message);
      
      // Try manual package.json update as fallback
      return await this.updatePackageJsonManually(CORE_DEPENDENCIES);
    }
  }

  // Install additional dependencies based on code analysis
  async installAdditionalDeps(additionalDeps = {}) {
    if (Object.keys(additionalDeps).length === 0) {
      return { success: true, installedDeps: [] };
    }

    console.log(`🔧 Installing additional dependencies: ${Object.keys(additionalDeps).join(', ')}`);
    
    try {
      const packageManager = await this.detectPackageManager();
      
      const deps = Object.entries(additionalDeps)
        .map(([pkg, version]) => `${pkg}@${version}`)
        .join(' ');

      const command = packageManager === 'yarn' 
        ? `yarn add ${deps}`
        : `npm install ${deps}`;

      execSync(command, { 
        cwd: this.projectPath, 
        stdio: 'inherit',
        timeout: 180000 // 3 minute timeout
      });

      console.log('✅ Additional dependencies installed successfully');
      return { success: true, installedDeps: Object.keys(additionalDeps) };
      
    } catch (error) {
      console.error('❌ Failed to install additional dependencies:', error.message);
      return await this.updatePackageJsonManually(additionalDeps);
    }
  }

  // Detect which package manager to use
  async detectPackageManager() {
    // Check for yarn.lock
    if (await fs.exists(path.join(this.projectPath, 'yarn.lock'))) {
      return 'yarn';
    }
    
    // Check for package-lock.json
    if (await fs.exists(path.join(this.projectPath, 'package-lock.json'))) {
      return 'npm';
    }
    
    // Default to npm
    return 'npm';
  }

  // Manually update package.json if install fails
  async updatePackageJsonManually(dependencies) {
    try {
      console.log('🔧 Manually updating package.json...');
      
      const packageJson = await fs.readJson(this.packageJsonPath);
      
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      
      // Add new dependencies
      Object.entries(dependencies).forEach(([pkg, version]) => {
        packageJson.dependencies[pkg] = version;
      });
      
      await fs.writeJson(this.packageJsonPath, packageJson, { spaces: 2 });
      
      console.log('✅ package.json updated manually');
      console.log('⚠️ Run "npm install" or "yarn" to install the dependencies');
      
      return { 
        success: true, 
        installedDeps: Object.keys(dependencies),
        manualInstallRequired: true 
      };
      
    } catch (error) {
      console.error('❌ Failed to update package.json manually:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Analyze code to determine required dependencies
  static analyzeDependencies(sourceCode, fileName) {
    const requiredDeps = {};
    
    // Navigation detection
    if (sourceCode.includes('useNavigation') || 
        sourceCode.includes('navigation.') || 
        sourceCode.includes('router.')) {
      Object.assign(requiredDeps, {
        '@react-navigation/native': CORE_DEPENDENCIES['@react-navigation/native'],
        '@react-navigation/native-stack': CORE_DEPENDENCIES['@react-navigation/native-stack'],
        'react-native-screens': CORE_DEPENDENCIES['react-native-screens'],
        'react-native-safe-area-context': CORE_DEPENDENCIES['react-native-safe-area-context']
      });
    }

    // Storage detection
    if (sourceCode.includes('AsyncStorage') || 
        sourceCode.includes('localStorage') || 
        sourceCode.includes('sessionStorage')) {
      requiredDeps['@react-native-async-storage/async-storage'] = 
        CORE_DEPENDENCIES['@react-native-async-storage/async-storage'];
    }

    // Image detection
    if (sourceCode.includes('expo-image') || 
        sourceCode.includes('from "expo-image"')) {
      requiredDeps['expo-image'] = OPTIONAL_DEPENDENCIES['expo-image'];
    }

    // Gesture detection
    if (sourceCode.includes('react-native-gesture-handler')) {
      requiredDeps['react-native-gesture-handler'] = OPTIONAL_DEPENDENCIES['react-native-gesture-handler'];
    }

    // Toast detection
    if (sourceCode.includes('Toast.show') || 
        sourceCode.includes('react-native-toast-message')) {
      requiredDeps['react-native-toast-message'] = OPTIONAL_DEPENDENCIES['react-native-toast-message'];
    }

    return requiredDeps;
  }

  // Validate that all required dependencies are installed
  async validateDependencies(requiredDeps = {}) {
    try {
      const packageJson = await fs.readJson(this.packageJsonPath);
      const installedDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const missingDeps = {};
      
      // Check core dependencies
      Object.entries(CORE_DEPENDENCIES).forEach(([pkg, version]) => {
        if (!installedDeps[pkg]) {
          missingDeps[pkg] = version;
        }
      });

      // Check required dependencies
      Object.entries(requiredDeps).forEach(([pkg, version]) => {
        if (!installedDeps[pkg]) {
          missingDeps[pkg] = version;
        }
      });

      return {
        isValid: Object.keys(missingDeps).length === 0,
        missingDeps,
        installedDeps: Object.keys(installedDeps)
      };
      
    } catch (error) {
      console.error('❌ Failed to validate dependencies:', error.message);
      return { isValid: false, error: error.message };
    }
  }

  // Setup complete dependency environment
  async setupCompleteDependencies(additionalDeps = {}) {
    console.log('\n🔧 Setting up complete React Native dependency environment...');
    
    // 1. Install core navigation dependencies
    const coreResult = await this.installCoreNavigationDeps();
    
    // 2. Install additional dependencies if provided
    const additionalResult = await this.installAdditionalDeps(additionalDeps);
    
    // 3. Validate installation
    const validation = await this.validateDependencies(additionalDeps);
    
    const summary = {
      coreInstallation: coreResult,
      additionalInstallation: additionalResult,
      validation,
      totalInstalled: [
        ...(coreResult.installedDeps || []),
        ...(additionalResult.installedDeps || [])
      ]
    };

    console.log('\n📊 Dependency Setup Summary:');
    console.log(`   ✅ Core dependencies: ${coreResult.success ? 'Installed' : 'Failed'}`);
    console.log(`   ✅ Additional dependencies: ${additionalResult.success ? 'Installed' : 'Failed'}`);
    console.log(`   ✅ Validation: ${validation.isValid ? 'Passed' : 'Failed'}`);
    console.log(`   📦 Total packages: ${summary.totalInstalled.length}`);

    if (coreResult.manualInstallRequired || additionalResult.manualInstallRequired) {
      console.log('\n⚠️ Manual installation required:');
      console.log('   Run: npm install  (or yarn)');
    }

    return summary;
  }
}

// Static helper function for quick dependency analysis
export function quickDependencyAnalysis(sourceCode, fileName) {
  return DependencyManager.analyzeDependencies(sourceCode, fileName);
}

// Auto-install dependencies based on converted code
export async function autoInstallDependencies(projectPath, convertedFiles) {
  const dependencyManager = new DependencyManager(projectPath);
  
  // Analyze all converted files to determine dependencies
  const allRequiredDeps = {};
  
  for (const file of convertedFiles) {
    if (file.code) {
      const fileDeps = DependencyManager.analyzeDependencies(file.code, file.fileName);
      Object.assign(allRequiredDeps, fileDeps);
    }
  }

  console.log(`🔍 Analyzed ${convertedFiles.length} files, found ${Object.keys(allRequiredDeps).length} required dependencies`);
  
  // Setup all dependencies
  return await dependencyManager.setupCompleteDependencies(allRequiredDeps);
} 