import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class ProjectAnalyzer {
  constructor(nextjsPath) {
    this.nextjsPath = nextjsPath;
    this.appDir = path.join(nextjsPath, 'app');
    this.componentsDir = path.join(nextjsPath, 'components');
    this.libDir = path.join(nextjsPath, 'lib');
    this.hookDir = path.join(nextjsPath, 'hooks');
    this.packageJson = path.join(nextjsPath, 'package.json');
  }

  async analyzeProject() {
    console.log(chalk.cyan('🔍 Analyzing Next.js project structure...'));
    
    const analysis = {
      files: [],
      routes: {},
      components: [],
      dependencies: {},
      hasStateManagement: false,
      hasApiRoutes: false,
      hasTailwind: false,
      hasTypeScript: false,
      importGraph: new Map(),
      fileContents: new Map()
    };

    // Analyze package.json
    if (fs.existsSync(this.packageJson)) {
      const pkg = JSON.parse(await fs.readFile(this.packageJson, 'utf-8'));
      analysis.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Check for state management
      analysis.hasStateManagement = !!(
        analysis.dependencies['redux'] ||
        analysis.dependencies['@reduxjs/toolkit'] ||
        analysis.dependencies['zustand'] ||
        analysis.dependencies['jotai'] ||
        analysis.dependencies['recoil']
      );

      // Check for Tailwind
      analysis.hasTailwind = !!analysis.dependencies['tailwindcss'];
      
      // Check for TypeScript
      analysis.hasTypeScript = !!(
        analysis.dependencies['typescript'] ||
        analysis.dependencies['@types/node']
      );
    }

    // Analyze app directory structure
    if (fs.existsSync(this.appDir)) {
      analysis.routes = await this.analyzeRoutes(this.appDir);
      analysis.hasApiRoutes = await this.hasApiDirectory();
    }

    // Analyze all files
    const allFiles = await this.getAllFiles([
      this.appDir,
      this.componentsDir,
      this.libDir,
      this.hookDir
    ]);

    for (const filePath of allFiles) {
      if (this.isValidFile(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = path.relative(this.nextjsPath, filePath);
        
        analysis.files.push(relativePath);
        analysis.fileContents.set(relativePath, content);
        
        // Analyze imports
        const imports = this.extractImports(content);
        analysis.importGraph.set(relativePath, imports);

        // Categorize components
        if (relativePath.startsWith('components/')) {
          analysis.components.push(relativePath);
        }
      }
    }

    console.log(chalk.green(`✅ Analysis complete: ${analysis.files.length} files found`));
    
    // Transform the analysis to match expected format
    const transformedAnalysis = {
      totalFiles: analysis.files.length,
      pageFiles: this.extractPageFiles(analysis),
      componentFiles: this.extractComponentFiles(analysis),
      dependencies: analysis.dependencies,
      routeStructure: analysis.routes,
      projectMetadata: {
        framework: 'Next.js',
        hasTypeScript: analysis.hasTypeScript,
        hasTailwind: analysis.hasTailwind,
        hasStateManagement: analysis.hasStateManagement,
        hasApiRoutes: analysis.hasApiRoutes
      },
      componentImports: this.extractComponentImports(analysis)
    };
    
    return transformedAnalysis;
  }

  async analyzeRoutes(dir, baseRoute = '') {
    const routes = {};
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // Handle dynamic routes [slug] and catch-all [...slug]
          const routeName = item.startsWith('[') && item.endsWith(']') 
            ? ':dynamic'
            : item;
          
          const newRoute = baseRoute + '/' + routeName;
          routes[newRoute] = await this.analyzeRoutes(fullPath, newRoute);
        } else if (item === 'page.tsx' || item === 'page.js') {
          routes[baseRoute || '/'] = {
            type: 'page',
            file: path.relative(this.nextjsPath, fullPath)
          };
        } else if (item === 'layout.tsx' || item === 'layout.js') {
          routes[baseRoute || '/'] = {
            ...routes[baseRoute || '/'],
            layout: path.relative(this.nextjsPath, fullPath)
          };
        } else if (item === 'loading.tsx' || item === 'loading.js') {
          routes[baseRoute || '/'] = {
            ...routes[baseRoute || '/'],
            loading: path.relative(this.nextjsPath, fullPath)
          };
        } else if (item === 'error.tsx' || item === 'error.js') {
          routes[baseRoute || '/'] = {
            ...routes[baseRoute || '/'],
            error: path.relative(this.nextjsPath, fullPath)
          };
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Could not analyze routes in ${dir}`));
    }
    
    return routes;
  }

  async hasApiDirectory() {
    const apiDir = path.join(this.appDir, 'api');
    return fs.existsSync(apiDir);
  }

  async getAllFiles(directories) {
    const files = [];
    
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        const dirFiles = await this.getFilesRecursively(dir);
        files.push(...dirFiles);
      }
    }
    
    return files;
  }

  async getFilesRecursively(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const subFiles = await this.getFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Could not read directory ${dir}`));
    }
    
    return files;
  }

  isValidFile(filePath) {
    const validExtensions = ['.tsx', '.ts', '.jsx', '.js'];
    const ext = path.extname(filePath);
    return validExtensions.includes(ext) && !filePath.includes('node_modules');
  }

  extractImports(content) {
    const imports = [];
    
    // Match various import patterns
    const importPatterns = [
      /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g,
      /import\(['"`]([^'"`]+)['"`]\)/g,
      /require\(['"`]([^'"`]+)['"`]\)/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return imports;
  }

  getProjectContext(filePath, analysis) {
    const relativePath = path.relative(this.nextjsPath, filePath);
    const content = analysis.fileContents.get(relativePath) || '';
    
    return {
      allFiles: analysis.files,
      dependencies: analysis.dependencies,
      routeStructure: analysis.routes,
      hasStateManagement: analysis.hasStateManagement,
      hasApiRoutes: analysis.hasApiRoutes,
      componentImports: analysis.importGraph.get(relativePath) || [],
      fileContent: content,
      hasTailwind: analysis.hasTailwind,
      hasTypeScript: analysis.hasTypeScript
    };
  }

  extractPageFiles(analysis) {
    const pageFiles = [];
    
    for (const filePath of analysis.files) {
      const content = analysis.fileContents.get(filePath);
      
      // Check if it's a page file (page.tsx/js but NOT API routes)
      const isPageFile = (filePath.includes('/page.') || filePath.includes('\\page.')) && 
                        !filePath.includes('/api/') && 
                        !filePath.includes('\\api\\');
      
      // Also include pages/ directory files (for Pages Router)
      const isPagesRouterFile = (filePath.includes('pages/') || filePath.includes('pages\\')) && 
                               !filePath.includes('/api/') && 
                               !filePath.includes('\\api\\') &&
                               !filePath.includes('_app.') &&
                               !filePath.includes('_document.');

      if (isPageFile || isPagesRouterFile) {
        pageFiles.push({
          path: path.join(this.nextjsPath, filePath),
          relativePath: filePath,
          content: content
        });
      }
    }
    
    return pageFiles;
  }

  extractComponentFiles(analysis) {
    const componentFiles = [];
    
    for (const filePath of analysis.files) {
      const content = analysis.fileContents.get(filePath);
      
      // Skip API routes, pages, and Next.js special files
      const isApiRoute = filePath.includes('/api/') || filePath.includes('\\api\\');
      const isPageFile = (filePath.includes('/page.') || filePath.includes('\\page.')) ||
                        ((filePath.includes('pages/') || filePath.includes('pages\\')) && 
                         !filePath.includes('_app.') && !filePath.includes('_document.'));
      const isNextSpecialFile = filePath.includes('/layout.') || 
                               filePath.includes('\\layout.') ||
                               filePath.includes('/loading.') || 
                               filePath.includes('\\loading.') ||
                               filePath.includes('/error.') || 
                               filePath.includes('\\error.') ||
                               filePath.includes('_app.') ||
                               filePath.includes('_document.');
      
      // Only include actual component files
      const isComponentFile = (filePath.includes('components/') || 
                              filePath.includes('components\\') ||
                              filePath.includes('lib/') || 
                              filePath.includes('lib\\') ||
                              filePath.includes('hooks/') || 
                              filePath.includes('hooks\\') ||
                              (filePath.endsWith('.tsx') || 
                               filePath.endsWith('.ts') || 
                               filePath.endsWith('.jsx') || 
                               filePath.endsWith('.js'))) &&
                              !isApiRoute && 
                              !isPageFile && 
                              !isNextSpecialFile;

      if (isComponentFile) {
        componentFiles.push({
          path: path.join(this.nextjsPath, filePath),
          relativePath: filePath,
          content: content
        });
      }
    }
    
    return componentFiles;
  }

  extractComponentImports(analysis) {
    const componentImports = [];
    
    for (const [filePath, imports] of analysis.importGraph.entries()) {
      componentImports.push({
        file: filePath,
        imports: imports
      });
    }
    
    return componentImports;
  }
} 