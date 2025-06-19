import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { aiManager } from './aiProviders.js';

export class IntelligentProjectAnalyzer {
  constructor(nextjsPath) {
    this.nextjsPath = nextjsPath;
    this.analysis = {
      structure: {},
      dependencies: {},
      features: {},
      architecture: {},
      complexity: 'simple',
      recommendations: []
    };
  }

  async analyzeProject() {
    console.log(chalk.cyan('🧠 Performing intelligent project analysis...'));
    console.log(chalk.gray('Understanding project architecture, patterns, and dependencies\n'));

    await aiManager.initialize();
    await aiManager.ensureApiKeys();

    // Deep analysis phases
    await this.analyzeProjectStructure();
    await this.analyzeDependencies();
    await this.analyzeCodePatterns();
    await this.analyzeArchitecture();
    await this.generateRecommendations();

    console.log(chalk.green('✅ Intelligent analysis complete!\n'));
    this.displayAnalysisResults();

    return this.analysis;
  }

  async analyzeProjectStructure() {
    console.log(chalk.blue('📁 Analyzing project structure...'));

    const structure = {
      directories: {},
      files: {},
      routes: {},
      components: {}
    };

    // Analyze directory structure
    const directories = [
      'app', 'pages', 'src', 'components', 'lib', 'utils', 
      'hooks', 'styles', 'public', 'api', 'types', 'contexts'
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.nextjsPath, dir);
      if (await fs.exists(dirPath)) {
        structure.directories[dir] = await this.analyzeDirectory(dirPath);
      }
    }

    // Analyze package.json
    const packageJsonPath = path.join(this.nextjsPath, 'package.json');
    if (await fs.exists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      structure.packageInfo = {
        name: packageJson.name,
        version: packageJson.version,
        scripts: Object.keys(packageJson.scripts || {}),
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {})
      };
    }

    // Analyze configuration files
    const configFiles = [
      'next.config.js', 'next.config.mjs', 'tailwind.config.js', 
      'tsconfig.json', '.eslintrc.json', 'prettier.config.js'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(this.nextjsPath, configFile);
      if (await fs.exists(configPath)) {
        structure.configs = structure.configs || {};
        structure.configs[configFile] = await this.analyzeConfigFile(configPath);
      }
    }

    this.analysis.structure = structure;
  }

  async analyzeDirectory(dirPath, depth = 0) {
    if (depth > 3) return { skipped: true, reason: 'Max depth reached' };

    const analysis = {
      fileCount: 0,
      subdirectories: [],
      fileTypes: {},
      patterns: []
    };

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fs.stat(itemPath);

        if (stat.isDirectory()) {
          analysis.subdirectories.push(item);
        } else {
          analysis.fileCount++;
          const ext = path.extname(item);
          analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;

          // Detect patterns
          if (item.includes('.test.') || item.includes('.spec.')) {
            analysis.patterns.push('testing');
          }
          if (item.includes('.stories.')) {
            analysis.patterns.push('storybook');
          }
          if (item === 'page.tsx' || item === 'page.js') {
            analysis.patterns.push('app-router');
          }
          if (item === 'layout.tsx' || item === 'layout.js') {
            analysis.patterns.push('layout');
          }
        }
      }
    } catch (error) {
      analysis.error = error.message;
    }

    return analysis;
  }

  async analyzeConfigFile(configPath) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const fileName = path.basename(configPath);

      if (fileName.includes('next.config')) {
        return this.analyzeNextConfig(content);
      } else if (fileName.includes('tailwind')) {
        return this.analyzeTailwindConfig(content);
      } else if (fileName.includes('tsconfig')) {
        return JSON.parse(content);
      }

      return { analyzed: true, size: content.length };
    } catch (error) {
      return { error: error.message };
    }
  }

  analyzeNextConfig(content) {
    const features = {
      images: content.includes('images:') || content.includes('Image'),
      experimental: content.includes('experimental:'),
      webpack: content.includes('webpack:'),
      env: content.includes('env:'),
      rewrites: content.includes('rewrites:'),
      redirects: content.includes('redirects:')
    };

    return { features, hasCustomConfig: Object.values(features).some(Boolean) };
  }

  analyzeTailwindConfig(content) {
    const features = {
      darkMode: content.includes('darkMode'),
      customTheme: content.includes('theme:') && content.includes('extend'),
      plugins: content.includes('plugins:'),
      content: content.includes('content:')
    };

    return { features };
  }

  async analyzeDependencies() {
    console.log(chalk.blue('📦 Analyzing dependencies and tech stack...'));

    const packageJson = await fs.readJson(path.join(this.nextjsPath, 'package.json'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const techStack = {
      framework: 'Next.js',
      ui: [],
      styling: [],
      stateManagement: [],
      testing: [],
      validation: [],
      api: [],
      database: [],
      auth: [],
      deployment: [],
      development: []
    };

    // Categorize dependencies
    for (const [dep, version] of Object.entries(allDeps)) {
      // UI Libraries
      if (['@mui/material', '@chakra-ui/react', '@mantine/core', 'antd', 'react-bootstrap'].includes(dep)) {
        techStack.ui.push({ name: dep, version, category: 'component-library' });
      }
      if (dep.includes('shadcn') || dep.includes('@radix-ui')) {
        techStack.ui.push({ name: dep, version, category: 'headless-ui' });
      }

      // Styling
      if (['tailwindcss', 'styled-components', '@emotion/react', 'sass', 'less'].includes(dep)) {
        techStack.styling.push({ name: dep, version });
      }

      // State Management
      if (['redux', '@reduxjs/toolkit', 'zustand', 'jotai', 'recoil', 'valtio'].includes(dep)) {
        techStack.stateManagement.push({ name: dep, version });
      }

      // Testing
      if (['jest', '@testing-library/react', 'cypress', 'playwright', 'vitest'].includes(dep)) {
        techStack.testing.push({ name: dep, version });
      }

      // API & Data
      if (['@tanstack/react-query', 'swr', 'apollo-client', 'relay', 'axios', 'fetch'].includes(dep)) {
        techStack.api.push({ name: dep, version });
      }

      // Database
      if (['prisma', 'drizzle-orm', 'mongoose', 'sequelize', 'typeorm'].includes(dep)) {
        techStack.database.push({ name: dep, version });
      }

      // Auth
      if (['next-auth', '@auth0/nextjs-auth0', 'firebase', 'supabase', 'clerk'].includes(dep)) {
        techStack.auth.push({ name: dep, version });
      }
    }

    this.analysis.dependencies = {
      total: Object.keys(allDeps).length,
      techStack,
      complexity: this.calculateDependencyComplexity(techStack)
    };
  }

  calculateDependencyComplexity(techStack) {
    const weights = {
      ui: 2,
      styling: 1,
      stateManagement: 3,
      testing: 1,
      api: 2,
      database: 3,
      auth: 2
    };

    let score = 0;
    for (const [category, deps] of Object.entries(techStack)) {
      if (Array.isArray(deps)) {
        score += deps.length * (weights[category] || 1);
      }
    }

    if (score < 10) return 'simple';
    if (score < 25) return 'moderate';
    if (score < 40) return 'complex';
    return 'enterprise';
  }

  async analyzeCodePatterns() {
    console.log(chalk.blue('🔍 Analyzing code patterns and architecture...'));

    const patterns = {
      routing: await this.detectRoutingPatterns(),
      components: await this.analyzeComponentPatterns(),
      hooks: await this.analyzeHookPatterns(),
      api: await this.analyzeApiPatterns(),
      styling: await this.analyzeStylingPatterns(),
      dataFetching: await this.analyzeDataFetchingPatterns()
    };

    this.analysis.patterns = patterns;
  }

  async detectRoutingPatterns() {
    const appDir = path.join(this.nextjsPath, 'app');
    const pagesDir = path.join(this.nextjsPath, 'pages');

    const routingInfo = {
      type: 'unknown',
      routes: [],
      features: []
    };

    if (await fs.exists(appDir)) {
      routingInfo.type = 'app-router';
      routingInfo.routes = await this.analyzeAppRouterStructure(appDir);
    } else if (await fs.exists(pagesDir)) {
      routingInfo.type = 'pages-router';
      routingInfo.routes = await this.analyzePagesRouterStructure(pagesDir);
    }

    return routingInfo;
  }

  async analyzeAppRouterStructure(appDir) {
    const routes = [];
    const analyzeRouteDir = async (dir, route = '') => {
      try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            const newRoute = route + '/' + item;
            await analyzeRouteDir(itemPath, newRoute);
          } else {
            const routeInfo = {
              path: route || '/',
              file: path.relative(this.nextjsPath, itemPath),
              type: item.replace(/\.(tsx?|jsx?)$/, '')
            };

            if (item.startsWith('page.')) {
              routeInfo.isPage = true;
            } else if (item.startsWith('layout.')) {
              routeInfo.isLayout = true;
            } else if (item.startsWith('loading.')) {
              routeInfo.isLoading = true;
            } else if (item.startsWith('error.')) {
              routeInfo.isError = true;
            }

            routes.push(routeInfo);
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };

    await analyzeRouteDir(appDir);
    return routes;
  }

  async analyzePagesRouterStructure(pagesDir) {
    const routes = [];
    const analyzeRouteDir = async (dir, route = '') => {
      try {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = await fs.stat(itemPath);

          if (stat.isDirectory()) {
            if (item !== 'api') {
              const newRoute = route + '/' + item;
              await analyzeRouteDir(itemPath, newRoute);
            }
          } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.jsx') || item.endsWith('.js')) {
            const routePath = route + '/' + item.replace(/\.(tsx?|jsx?)$/, '');
            routes.push({
              path: routePath === '/index' ? '/' : routePath,
              file: path.relative(this.nextjsPath, itemPath),
              type: 'page'
            });
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    };

    await analyzeRouteDir(pagesDir);
    return routes;
  }

  async analyzeComponentPatterns() {
    const componentsDir = path.join(this.nextjsPath, 'components');
    if (!await fs.exists(componentsDir)) {
      return { found: false };
    }

    const components = await this.getFilesRecursively(componentsDir);
    const patterns = {
      total: components.length,
      byType: {},
      complexity: 'simple'
    };

    for (const componentPath of components) {
      if (componentPath.endsWith('.tsx') || componentPath.endsWith('.jsx')) {
        try {
          const content = await fs.readFile(componentPath, 'utf-8');
          const componentName = path.basename(componentPath, path.extname(componentPath));
          
          patterns.byType[componentName] = {
            path: path.relative(this.nextjsPath, componentPath),
            hasProps: content.includes('interface') || content.includes('type'),
            hasState: content.includes('useState') || content.includes('useReducer'),
            hasEffects: content.includes('useEffect'),
            isForwardRef: content.includes('forwardRef'),
            isMemo: content.includes('memo'),
            linesOfCode: content.split('\n').length
          };
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    // Determine complexity
    const avgLinesOfCode = Object.values(patterns.byType).reduce((sum, comp) => sum + comp.linesOfCode, 0) / patterns.total;
    if (avgLinesOfCode > 200) patterns.complexity = 'complex';
    else if (avgLinesOfCode > 100) patterns.complexity = 'moderate';

    return patterns;
  }

  async analyzeHookPatterns() {
    const hooksDir = path.join(this.nextjsPath, 'hooks');
    if (!await fs.exists(hooksDir)) {
      return { found: false };
    }

    const hooks = await this.getFilesRecursively(hooksDir);
    return {
      total: hooks.length,
      customHooks: hooks.filter(h => path.basename(h).startsWith('use')).length
    };
  }

  async analyzeApiPatterns() {
    const apiDirs = [
      path.join(this.nextjsPath, 'app', 'api'),
      path.join(this.nextjsPath, 'pages', 'api')
    ];

    for (const apiDir of apiDirs) {
      if (await fs.exists(apiDir)) {
        const apiFiles = await this.getFilesRecursively(apiDir);
        return {
          found: true,
          endpoints: apiFiles.length,
          hasAuth: apiFiles.some(f => f.includes('auth')),
          hasDatabase: apiFiles.some(f => f.includes('db') || f.includes('database'))
        };
      }
    }

    return { found: false };
  }

  async analyzeStylingPatterns() {
    const stylingInfo = {
      hasTailwind: false,
      hasCSS: false,
      hasSCSS: false,
      hasStyledComponents: false,
      hasEmotion: false
    };

    // Check package.json
    const packageJson = await fs.readJson(path.join(this.nextjsPath, 'package.json'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    stylingInfo.hasTailwind = !!deps['tailwindcss'];
    stylingInfo.hasStyledComponents = !!deps['styled-components'];
    stylingInfo.hasEmotion = !!(deps['@emotion/react'] || deps['@emotion/styled']);

    // Check for CSS files
    const allFiles = await this.getFilesRecursively(this.nextjsPath);
    stylingInfo.hasCSS = allFiles.some(f => f.endsWith('.css'));
    stylingInfo.hasSCSS = allFiles.some(f => f.endsWith('.scss') || f.endsWith('.sass'));

    return stylingInfo;
  }

  async analyzeDataFetchingPatterns() {
    const allFiles = await this.getFilesRecursively(this.nextjsPath);
    const patterns = {
      hasGetServerSideProps: false,
      hasGetStaticProps: false,
      hasUseEffect: false,
      hasReactQuery: false,
      hasSWR: false
    };

    // Sample some files to detect patterns
    const sampleFiles = allFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx')).slice(0, 10);
    
    for (const filePath of sampleFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        if (content.includes('getServerSideProps')) patterns.hasGetServerSideProps = true;
        if (content.includes('getStaticProps')) patterns.hasGetStaticProps = true;
        if (content.includes('useEffect')) patterns.hasUseEffect = true;
        if (content.includes('useQuery') || content.includes('useMutation')) patterns.hasReactQuery = true;
        if (content.includes('useSWR')) patterns.hasSWR = true;
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return patterns;
  }

  async analyzeArchitecture() {
    console.log(chalk.blue('🏗️ Analyzing project architecture...'));

    const architecture = {
      pattern: 'unknown',
      layering: {},
      features: {},
      scalability: 'unknown'
    };

    // Detect architectural patterns
    if (this.analysis.structure.directories.components && this.analysis.structure.directories.hooks) {
      architecture.pattern = 'component-based';
    }
    if (this.analysis.structure.directories.lib && this.analysis.structure.directories.utils) {
      architecture.pattern = 'layered';
    }
    if (this.analysis.dependencies.techStack.stateManagement.length > 0) {
      architecture.pattern = 'state-driven';
    }

    // Analyze feature organization
    if (this.analysis.patterns.routing.type === 'app-router') {
      architecture.features.modernRouting = true;
    }
    if (this.analysis.patterns.api.found) {
      architecture.features.fullStack = true;
    }

    // Determine scalability
    const complexityScore = this.calculateArchitectureComplexity();
    if (complexityScore < 5) architecture.scalability = 'small';
    else if (complexityScore < 15) architecture.scalability = 'medium';
    else if (complexityScore < 30) architecture.scalability = 'large';
    else architecture.scalability = 'enterprise';

    this.analysis.architecture = architecture;
  }

  calculateArchitectureComplexity() {
    let score = 0;
    
    // Add points for various complexity factors
    score += Object.keys(this.analysis.structure.directories).length;
    score += this.analysis.dependencies.techStack.stateManagement.length * 3;
    score += this.analysis.dependencies.techStack.ui.length * 2;
    score += this.analysis.patterns.routing.routes.length;
    
    if (this.analysis.patterns.api.found) score += 5;
    if (this.analysis.patterns.components.total > 20) score += 5;
    
    return score;
  }

  async generateRecommendations() {
    console.log(chalk.blue('💡 Generating React Native conversion recommendations...'));

    const recommendations = [];

    // Routing recommendations
    if (this.analysis.patterns.routing.type === 'app-router') {
      recommendations.push({
        category: 'routing',
        priority: 'high',
        title: 'App Router Conversion',
        description: 'Convert Next.js App Router to React Navigation 6 with proper TypeScript support',
        impact: 'Critical for navigation functionality'
      });
    }

    // State management recommendations
    if (this.analysis.dependencies.techStack.stateManagement.length > 0) {
      const stateLib = this.analysis.dependencies.techStack.stateManagement[0].name;
      recommendations.push({
        category: 'state',
        priority: 'medium',
        title: `${stateLib} Migration`,
        description: `Adapt ${stateLib} patterns for React Native with proper async storage integration`,
        impact: 'Important for state persistence'
      });
    }

    // Styling recommendations
    if (this.analysis.patterns.styling.hasTailwind) {
      recommendations.push({
        category: 'styling',
        priority: 'high',
        title: 'NativeWind Integration',
        description: 'Convert Tailwind CSS classes to NativeWind for React Native compatibility',
        impact: 'Essential for maintaining design system'
      });
    }

    // API recommendations
    if (this.analysis.patterns.api.found) {
      recommendations.push({
        category: 'api',
        priority: 'medium',
        title: 'API Layer Adaptation',
        description: 'Migrate API routes to external backend or adapt for mobile app architecture',
        impact: 'Required for data functionality'
      });
    }

    // Performance recommendations
    if (this.analysis.architecture.scalability === 'large' || this.analysis.architecture.scalability === 'enterprise') {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Performance Optimization',
        description: 'Implement lazy loading, code splitting, and React Native performance best practices',
        impact: 'Critical for large-scale app performance'
      });
    }

    this.analysis.recommendations = recommendations;
  }

  displayAnalysisResults() {
    console.log(chalk.cyan('📊 Project Analysis Results'));
    console.log(chalk.cyan('=' .repeat(50)));

    // Architecture overview
    console.log(chalk.yellow('\n🏗️ Architecture:'));
    console.log(`   Pattern: ${this.analysis.architecture.pattern}`);
    console.log(`   Scalability: ${this.analysis.architecture.scalability}`);
    console.log(`   Complexity: ${this.analysis.dependencies.complexity}`);

    // Tech stack
    console.log(chalk.yellow('\n📦 Tech Stack:'));
    if (this.analysis.dependencies.techStack.ui.length > 0) {
      console.log(`   UI: ${this.analysis.dependencies.techStack.ui.map(u => u.name).join(', ')}`);
    }
    if (this.analysis.dependencies.techStack.styling.length > 0) {
      console.log(`   Styling: ${this.analysis.dependencies.techStack.styling.map(s => s.name).join(', ')}`);
    }
    if (this.analysis.dependencies.techStack.stateManagement.length > 0) {
      console.log(`   State: ${this.analysis.dependencies.techStack.stateManagement.map(s => s.name).join(', ')}`);
    }

    // Routing
    console.log(chalk.yellow('\n🧭 Routing:'));
    console.log(`   Type: ${this.analysis.patterns.routing.type}`);
    console.log(`   Routes: ${this.analysis.patterns.routing.routes.length}`);

    // Recommendations
    if (this.analysis.recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Key Recommendations:'));
      this.analysis.recommendations.slice(0, 3).forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`   ${priority} ${rec.title}`);
      });
    }

    console.log('');
  }

  async getFilesRecursively(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }
} 