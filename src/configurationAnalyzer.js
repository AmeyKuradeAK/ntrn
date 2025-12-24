import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export class ConfigurationAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze next.config.js or next.config.mjs
   */
  async analyzeNextConfig(projectPath) {
    const configFiles = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      'next.config.cjs'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await fs.exists(configPath)) {
        try {
          // For .js/.mjs files, we'll try to read and parse
          // For .ts files, we'll just note they exist
          if (configFile.endsWith('.ts')) {
            return {
              exists: true,
              file: configFile,
              config: null, // TypeScript configs need compilation
              imageOptimization: true, // Default in Next.js
              redirects: 0,
              rewrites: 0,
              headers: 0
            };
          }

          const content = await fs.readFile(configPath, 'utf-8');
          
          // Simple regex-based extraction (not full parsing)
          const redirectsMatch = content.match(/redirects\s*[:=]\s*\[/g);
          const rewritesMatch = content.match(/rewrites\s*[:=]\s*\[/g);
          const headersMatch = content.match(/headers\s*[:=]\s*\[/g);
          const imageOptimizationMatch = content.match(/images\s*[:=]\s*\{/g);

          return {
            exists: true,
            file: configFile,
            config: null, // Would need eval or proper parsing for full config
            imageOptimization: imageOptimizationMatch !== null,
            redirects: redirectsMatch ? redirectsMatch.length : 0,
            rewrites: rewritesMatch ? rewritesMatch.length : 0,
            headers: headersMatch ? headersMatch.length : 0
          };
        } catch (error) {
          return {
            exists: true,
            file: configFile,
            config: null,
            error: error.message
          };
        }
      }
    }

    return {
      exists: false,
      config: null,
      imageOptimization: true,
      redirects: 0,
      rewrites: 0,
      headers: 0
    };
  }

  /**
   * Analyze tsconfig.json
   */
  async analyzeTypeScriptConfig(projectPath) {
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    
    if (!await fs.exists(tsconfigPath)) {
      return {
        exists: false,
        pathAliases: {},
        compilerOptions: {}
      };
    }

    try {
      const tsconfig = await fs.readJson(tsconfigPath);
      const pathAliases = tsconfig.compilerOptions?.paths || {};
      const compilerOptions = tsconfig.compilerOptions || {};

      return {
        exists: true,
        pathAliases,
        compilerOptions: {
          baseUrl: compilerOptions.baseUrl,
          target: compilerOptions.target,
          lib: compilerOptions.lib,
          jsx: compilerOptions.jsx,
          module: compilerOptions.module,
          moduleResolution: compilerOptions.moduleResolution,
          strict: compilerOptions.strict
        }
      };
    } catch (error) {
      return {
        exists: true,
        pathAliases: {},
        compilerOptions: {},
        error: error.message
      };
    }
  }

  /**
   * Analyze tailwind.config.js or tailwind.config.ts
   * Also checks postcss.config.js for Tailwind plugin
   */
  async analyzeTailwindConfig(projectPath, packageJson) {
    const configFiles = [
      'tailwind.config.js',
      'tailwind.config.mjs',
      'tailwind.config.ts',
      'tailwind.config.cjs'
    ];

    // Check for dedicated Tailwind config files
    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await fs.exists(configPath)) {
        try {
          if (configFile.endsWith('.ts')) {
            // TypeScript configs need compilation, just note existence
            return {
              exists: true,
              file: configFile,
              theme: null
            };
          }

          const content = await fs.readFile(configPath, 'utf-8');
          
          // Try to extract theme object (simple regex-based)
          // This is a simplified extraction - full parsing would be better
          const themeMatch = content.match(/theme\s*[:=]\s*\{/);
          
          return {
            exists: true,
            file: configFile,
            theme: themeMatch ? {} : null // Would need proper parsing for full theme
          };
        } catch (error) {
          return {
            exists: true,
            file: configFile,
            theme: null,
            error: error.message
          };
        }
      }
    }

    // Check PostCSS config files for Tailwind plugin
    const postcssConfigFiles = [
      'postcss.config.js',
      'postcss.config.mjs',
      'postcss.config.ts',
      'postcss.config.cjs',
      '.postcssrc.js',
      '.postcssrc.json'
    ];

    for (const postcssFile of postcssConfigFiles) {
      const postcssPath = path.join(projectPath, postcssFile);
      if (await fs.exists(postcssPath)) {
        try {
          const content = await fs.readFile(postcssPath, 'utf-8');
          
          // Check if Tailwind is mentioned in PostCSS config
          if (content.includes('tailwindcss') || content.includes('tailwind')) {
            return {
              exists: true,
              file: `postcss.config (with Tailwind)`,
              theme: null,
              viaPostCSS: true
            };
          }
        } catch (error) {
          // Continue checking other files
        }
      }
    }

    // If Tailwind is in package.json but no config found, it might be using defaults
    const deps = { ...packageJson?.dependencies || {}, ...packageJson?.devDependencies || {} };
    if (deps.tailwindcss || deps['@tailwindcss/forms'] || deps['@tailwindcss/typography']) {
      return {
        exists: true,
        file: 'default config (via package.json)',
        theme: null,
        viaPackageJson: true
      };
    }

    return {
      exists: false,
      theme: null
    };
  }

  /**
   * Detect routing patterns
   */
  async detectRoutingPatterns(structure, projectPath) {
    const routing = {
      type: 'none',
      pagesRouter: {
        totalRoutes: 0,
        dynamicRoutes: 0,
        catchAllRoutes: 0,
        routes: []
      },
      appRouter: {
        totalRoutes: 0,
        routeGroups: [],
        layouts: 0,
        loadingFiles: 0,
        errorFiles: 0,
        routes: []
      }
    };

    // Check for Pages Router
    const pagesDir = path.join(projectPath, 'pages');
    const srcPagesDir = path.join(projectPath, 'src', 'pages');
    const hasPagesRouter = await fs.exists(pagesDir) || await fs.exists(srcPagesDir);

    // Check for App Router
    const appDir = path.join(projectPath, 'app');
    const srcAppDir = path.join(projectPath, 'src', 'app');
    const hasAppRouter = await fs.exists(appDir) || await fs.exists(srcAppDir);

    if (hasPagesRouter && hasAppRouter) {
      routing.type = 'both';
    } else if (hasPagesRouter) {
      routing.type = 'pages';
    } else if (hasAppRouter) {
      routing.type = 'app';
    }

    // Analyze Pages Router
    if (hasPagesRouter) {
      const pagesBase = await fs.exists(pagesDir) ? pagesDir : srcPagesDir;
      const pageFiles = await glob('**/*.{tsx,jsx,ts,js}', {
        cwd: pagesBase,
        ignore: ['**/api/**', '**/_app.*', '**/_document.*']
      });

      routing.pagesRouter.totalRoutes = pageFiles.length;
      routing.pagesRouter.routes = pageFiles;

      pageFiles.forEach(file => {
        // Dynamic routes: [param] or [...slug]
        if (file.includes('[') && file.includes(']')) {
          if (file.includes('[...')) {
            routing.pagesRouter.catchAllRoutes++;
          } else {
            routing.pagesRouter.dynamicRoutes++;
          }
        }
      });
    }

    // Analyze App Router
    if (hasAppRouter) {
      const appBase = await fs.exists(appDir) ? appDir : srcAppDir;
      
      // Find route groups (directories starting with parentheses)
      const routeGroups = await glob('**/(*)/**', { cwd: appBase });
      routing.appRouter.routeGroups = [...new Set(
        routeGroups.map(rg => {
          const match = rg.match(/\(([^)]+)\)/);
          return match ? match[1] : null;
        }).filter(Boolean)
      )];

      // Find page files
      const pageFiles = await glob('**/page.{tsx,jsx,ts,js}', { cwd: appBase });
      routing.appRouter.totalRoutes = pageFiles.length;
      routing.appRouter.routes = pageFiles;

      // Find layout files
      const layoutFiles = await glob('**/layout.{tsx,jsx,ts,js}', { cwd: appBase });
      routing.appRouter.layouts = layoutFiles.length;

      // Find loading files
      const loadingFiles = await glob('**/loading.{tsx,jsx,ts,js}', { cwd: appBase });
      routing.appRouter.loadingFiles = loadingFiles.length;

      // Find error files
      const errorFiles = await glob('**/error.{tsx,jsx,ts,js}', { cwd: appBase });
      routing.appRouter.errorFiles = errorFiles.length;
    }

    return routing;
  }

  /**
   * Identify API routes
   */
  async identifyAPIRoutes(projectPath) {
    const apiRoutes = [];

    // Pages Router API routes: pages/api/**/*.ts or pages/api/**/*.js
    const pagesApiPatterns = [
      'pages/api/**/*.{ts,js,tsx,jsx}',
      'src/pages/api/**/*.{ts,js,tsx,jsx}'
    ];

    for (const pattern of pagesApiPatterns) {
      const files = await glob(pattern, {
        cwd: projectPath,
        ignore: ['node_modules/**']
      });

      for (const file of files) {
        const fullPath = path.join(projectPath, file);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // Extract route path (remove pages/api/ prefix and file extension)
          let routePath = file.replace(/^.*\/pages\/api\//, '/api/');
          routePath = routePath.replace(/\.(ts|js|tsx|jsx)$/, '');
          
          // Check if dynamic route
          const isDynamic = routePath.includes('[') && routePath.includes(']');
          const parameters = [];
          if (isDynamic) {
            const paramMatches = routePath.matchAll(/\[([^\]]+)\]/g);
            for (const match of paramMatches) {
              parameters.push(match[1]);
            }
          }

          // Extract HTTP methods
          const methods = [];
          if (content.includes('export async function GET') || content.match(/export\s+(const|function)\s+GET/)) {
            methods.push('GET');
          }
          if (content.includes('export async function POST') || content.match(/export\s+(const|function)\s+POST/)) {
            methods.push('POST');
          }
          if (content.includes('export async function PUT') || content.match(/export\s+(const|function)\s+PUT/)) {
            methods.push('PUT');
          }
          if (content.includes('export async function DELETE') || content.match(/export\s+(const|function)\s+DELETE/)) {
            methods.push('DELETE');
          }
          if (content.includes('export async function PATCH') || content.match(/export\s+(const|function)\s+PATCH/)) {
            methods.push('PATCH');
          }

          // If no methods found, check for default export with req.method
          if (methods.length === 0 && (content.includes('req.method') || content.includes('request.method'))) {
            methods.push('*'); // All methods
          }

          apiRoutes.push({
            path: routePath,
            method: methods.length > 0 ? methods.join(', ') : 'GET',
            isDynamic,
            parameters,
            file: file
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    // App Router API routes: app/**/route.ts or app/**/route.js
    const appRoutePatterns = [
      'app/**/route.{ts,js,tsx,jsx}',
      'src/app/**/route.{ts,js,tsx,jsx}'
    ];

    for (const pattern of appRoutePatterns) {
      const files = await glob(pattern, {
        cwd: projectPath,
        ignore: ['node_modules/**']
      });

      for (const file of files) {
        const fullPath = path.join(projectPath, file);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          
          // Extract route path (remove app/ prefix, /route suffix, and file extension)
          let routePath = file.replace(/^.*\/app\//, '/');
          routePath = routePath.replace(/\/route\.(ts|js|tsx|jsx)$/, '');
          if (!routePath.startsWith('/')) {
            routePath = '/' + routePath;
          }
          
          // Check if dynamic route
          const isDynamic = routePath.includes('[') && routePath.includes(']');
          const parameters = [];
          if (isDynamic) {
            const paramMatches = routePath.matchAll(/\[([^\]]+)\]/g);
            for (const match of paramMatches) {
              parameters.push(match[1]);
            }
          }

          // Extract HTTP methods (same as Pages Router)
          const methods = [];
          if (content.includes('export async function GET') || content.match(/export\s+(const|function)\s+GET/)) {
            methods.push('GET');
          }
          if (content.includes('export async function POST') || content.match(/export\s+(const|function)\s+POST/)) {
            methods.push('POST');
          }
          if (content.includes('export async function PUT') || content.match(/export\s+(const|function)\s+PUT/)) {
            methods.push('PUT');
          }
          if (content.includes('export async function DELETE') || content.match(/export\s+(const|function)\s+DELETE/)) {
            methods.push('DELETE');
          }
          if (content.includes('export async function PATCH') || content.match(/export\s+(const|function)\s+PATCH/)) {
            methods.push('PATCH');
          }

          apiRoutes.push({
            path: routePath,
            method: methods.length > 0 ? methods.join(', ') : 'GET',
            isDynamic,
            parameters,
            file: file
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return apiRoutes;
  }

  /**
   * Analyze environment files
   */
  async analyzeEnvironmentFiles(projectPath) {
    const envFiles = [];
    const patterns = [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.test'
    ];

    for (const pattern of patterns) {
      const envPath = path.join(projectPath, pattern);
      if (await fs.exists(envPath)) {
        try {
          const content = await fs.readFile(envPath, 'utf-8');
          const variables = [];
          
          // Extract variable names (simple regex)
          const varRegex = /^([A-Z_][A-Z0-9_]*)\s*=/gm;
          let match;
          while ((match = varRegex.exec(content)) !== null) {
            variables.push(match[1]);
          }

          envFiles.push({
            file: pattern,
            variables: variables
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return envFiles;
  }

  /**
   * Main analysis method
   */
  async analyze(structure, projectPath, packageJson) {
    const nextConfig = await this.analyzeNextConfig(projectPath);
    const typescriptConfig = await this.analyzeTypeScriptConfig(projectPath);
    const tailwindConfig = await this.analyzeTailwindConfig(projectPath, packageJson);
    const routing = await this.detectRoutingPatterns(structure, projectPath);
    const apiRoutes = await this.identifyAPIRoutes(projectPath);
    const environmentFiles = await this.analyzeEnvironmentFiles(projectPath);

    return {
      nextConfig,
      typescriptConfig,
      tailwindConfig,
      routing,
      apiRoutes,
      environmentFiles
    };
  }
}

