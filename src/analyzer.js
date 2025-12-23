import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { CodeParser } from './codeParser.js';
import { StructureAnalyzer } from './structureAnalyzer.js';
import { getLibraryMapping, extractRootPackage, categorizeLibrary } from './libraryMapper.js';

export class ProjectAnalyzer {
  constructor(projectPath, verbose = false) {
    this.projectPath = path.resolve(projectPath);
    this.verbose = verbose;
    this.codeParser = new CodeParser();
    this.structureAnalyzer = new StructureAnalyzer(this.projectPath);
  }

  async analyze() {
    try {
      // Verify project exists
      if (!await fs.exists(this.projectPath)) {
        throw new Error(`Project path does not exist: ${this.projectPath}`);
      }

      // Read package.json to detect framework
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      let packageJson = null;
      let framework = 'unknown';

      if (await fs.exists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.next) {
          framework = 'nextjs';
        } else if (deps.react) {
          framework = 'react';
        }
      }

      // Analyze project structure
      const structure = {
        framework,
        pages: [],
        components: [],
        utils: [],
        lib: []
      };

      // Find pages - search all possible locations
      if (this.verbose) console.log(chalk.gray('   Searching for pages...'));
      structure.pages = await this.searchAllLocations([
        { base: 'pages', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'], exclude: ['**/api/**'] },
        { base: 'app', patterns: ['**/page.tsx', '**/page.jsx', '**/page.ts', '**/page.js'], exclude: ['**/api/**'] },
        { base: 'src/pages', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'], exclude: ['**/api/**'] },
        { base: 'src/app', patterns: ['**/page.tsx', '**/page.jsx', '**/page.ts', '**/page.js'], exclude: ['**/api/**'] }
      ], 'pages');

      // Find components - search all possible locations
      if (this.verbose) console.log(chalk.gray('   Searching for components...'));
      structure.components = await this.searchAllLocations([
        { base: 'components', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'] },
        { base: 'src/components', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'] },
        { base: 'src/Components', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'] },
        { base: 'src/ui', patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'] }
      ], 'components');

      // Find utils/lib - search all possible locations
      if (this.verbose) console.log(chalk.gray('   Searching for utils/lib...'));
      structure.utils = await this.searchAllLocations([
        { base: 'utils', patterns: ['**/*.ts', '**/*.js'], exclude: ['**/*.test.*', '**/*.spec.*'] },
        { base: 'src/utils', patterns: ['**/*.ts', '**/*.js'], exclude: ['**/*.test.*', '**/*.spec.*'] }
      ], 'utils');

      structure.lib = await this.searchAllLocations([
        { base: 'lib', patterns: ['**/*.ts', '**/*.js'], exclude: ['**/*.test.*', '**/*.spec.*'] },
        { base: 'src/lib', patterns: ['**/*.ts', '**/*.js'], exclude: ['**/*.test.*', '**/*.spec.*'] }
      ], 'lib');

      // Calculate statistics
      const stats = {
        totalPages: structure.pages.length,
        totalComponents: structure.components.length,
        totalUtils: structure.utils.length,
        totalLib: structure.lib.length,
        totalFiles: structure.pages.length + structure.components.length + structure.utils.length + structure.lib.length
      };

      // Aggregate libraries from all analyzed files
      const libraries = this.aggregateLibraries(structure);

      return {
        success: true,
        framework,
        structure,
        stats,
        packageJson,
        libraries
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Aggregate all external libraries from analyzed files
   */
  aggregateLibraries(structure) {
    const libraryMap = new Map();

    // Collect all files with structure analysis
    const allFiles = [
      ...structure.pages,
      ...structure.components,
      ...structure.utils,
      ...structure.lib
    ];

    // Process each file's imports
    allFiles.forEach(file => {
      if (!file.structure || !file.structure.importDetails) {
        return;
      }

      file.structure.importDetails.forEach(importInfo => {
        // Only process external libraries (not relative, not Next.js built-ins)
        if (!importInfo.isExternal || importInfo.isNextJS) {
          return;
        }

        // Extract root package name
        const rootPackage = extractRootPackage(importInfo.source);
        if (!rootPackage) {
          return;
        }

        // Exclude core framework libraries (React, React-DOM)
        // These are the foundation being replaced by Flutter, not libraries to convert
        const CORE_FRAMEWORKS = ['react', 'react-dom'];
        if (CORE_FRAMEWORKS.includes(rootPackage)) {
          return;
        }

        // Get or create library entry
        if (!libraryMap.has(rootPackage)) {
          const mapping = getLibraryMapping(rootPackage);
          libraryMap.set(rootPackage, {
            name: rootPackage,
            category: categorizeLibrary(rootPackage),
            mapping: mapping,
            files: [],
            importCount: 0,
            imports: [] // Store all import variations
          });
        }

        const libEntry = libraryMap.get(rootPackage);
        
        // Add file if not already added
        if (!libEntry.files.some(f => f.relativePath === file.relativePath)) {
          libEntry.files.push({
            relativePath: file.relativePath,
            fullPath: file.fullPath
          });
        }

        // Track import details
        libEntry.importCount++;
        libEntry.imports.push({
          source: importInfo.source,
          default: importInfo.default,
          named: importInfo.named,
          namespace: importInfo.namespace
        });
      });
    });

    // Convert map to array and sort by name
    const libraries = Array.from(libraryMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return libraries;
  }

  // Search multiple locations and combine results
  async searchAllLocations(locations, type) {
    const allFiles = [];
    const foundLocations = [];

    for (const location of locations) {
      const fullPath = path.join(this.projectPath, location.base);
      
      if (await fs.exists(fullPath)) {
        if (this.verbose) {
          console.log(chalk.gray(`     Found ${location.base}/`));
        }
        foundLocations.push(location.base);
        
        // Try glob first
        let files = await this.findFiles(fullPath, location.patterns, location.exclude || []);
        
        // If glob found nothing, try recursive scan as fallback
        if (files.length === 0) {
          if (this.verbose) {
            console.log(chalk.gray(`     Glob found nothing, trying recursive scan...`));
          }
          files = await this.findFilesRecursive(fullPath, location.patterns, location.exclude || []);
        }
        
        // Add files to results (avoid duplicates)
        for (const file of files) {
          const exists = allFiles.some(f => f.fullPath === file.fullPath);
          if (!exists) {
            allFiles.push(file);
          }
        }
      } else if (this.verbose) {
        console.log(chalk.gray(`     ${location.base}/ not found`));
      }
    }

    if (this.verbose && foundLocations.length > 0) {
      console.log(chalk.gray(`     Found ${allFiles.length} ${type} in: ${foundLocations.join(', ')}`));
    }

    return allFiles;
  }

  async findFiles(directory, includePatterns, excludePatterns = []) {
    const files = [];
    
    if (!await fs.exists(directory)) {
      return files;
    }

    try {
      for (const pattern of includePatterns) {
        try {
          // Use glob with proper path handling
          const found = await glob(pattern, {
            cwd: directory,
            absolute: false,
            ignore: excludePatterns,
            nodir: true
          });
          
          for (const filePath of found) {
            const absolutePath = path.join(directory, filePath);
            
            // Normalize path for Windows/Unix compatibility
            const normalizedPath = path.normalize(absolutePath);
            
            if (await fs.exists(normalizedPath)) {
              const stats = await fs.stat(normalizedPath);
              
              if (stats.isFile()) {
                const relativePath = path.relative(this.projectPath, normalizedPath);
                
                const fileInfo = {
                  fullPath: normalizedPath,
                  relativePath: relativePath.replace(/\\/g, '/'), // Use forward slashes for consistency
                  name: path.basename(normalizedPath),
                  extension: path.extname(normalizedPath),
                  size: stats.size,
                  isFile: true,
                  structure: null // Will be populated by code analysis
                };

                // Parse and analyze code structure if it's a parseable file
                if (this.codeParser.canParse(normalizedPath)) {
                  try {
                    const parseResult = await this.codeParser.parseFile(normalizedPath);
                    if (parseResult.success) {
                      fileInfo.structure = this.structureAnalyzer.analyze(parseResult.ast, normalizedPath);
                    } else if (this.verbose) {
                      console.log(chalk.yellow(`     Warning: Could not parse ${relativePath}: ${parseResult.error}`));
                    }
                  } catch (error) {
                    if (this.verbose) {
                      console.log(chalk.yellow(`     Warning: Error analyzing ${relativePath}: ${error.message}`));
                    }
                  }
                }
                
                files.push(fileInfo);
              }
            }
          }
        } catch (error) {
          // If glob fails for this pattern, continue with next pattern
          if (this.verbose) {
            console.log(chalk.yellow(`     Warning: Glob pattern ${pattern} failed: ${error.message}`));
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
      if (this.verbose) {
        console.log(chalk.yellow(`     Warning: Could not scan ${directory}: ${error.message}`));
      }
    }

    return files;
  }

  // Recursive file scanning as fallback
  async findFilesRecursive(directory, includePatterns, excludePatterns = []) {
    const files = [];
    
    if (!await fs.exists(directory)) {
      return files;
    }

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);
        
        // Check if path should be excluded
        const shouldExclude = excludePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(relativePath.replace(/\\/g, '/'));
        });
        
        if (shouldExclude) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.findFilesRecursive(fullPath, includePatterns, excludePatterns);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file matches any include pattern
          const matches = includePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\./g, '\\.'));
            return regex.test(entry.name);
          });
          
          if (matches) {
            const stats = await fs.stat(fullPath);
            const fileInfo = {
              fullPath: fullPath,
              relativePath: relativePath.replace(/\\/g, '/'),
              name: entry.name,
              extension: path.extname(entry.name),
              size: stats.size,
              isFile: true,
              structure: null // Will be populated by code analysis
            };

            // Parse and analyze code structure if it's a parseable file
            if (this.codeParser.canParse(fullPath)) {
              try {
                const parseResult = await this.codeParser.parseFile(fullPath);
                if (parseResult.success) {
                  fileInfo.structure = this.structureAnalyzer.analyze(parseResult.ast, fullPath);
                }
              } catch (error) {
                // Silently continue - parsing errors are expected for some files
              }
            }

            files.push(fileInfo);
          }
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.log(chalk.yellow(`     Warning: Recursive scan failed for ${directory}: ${error.message}`));
      }
    }

    return files;
  }

  // Map Next.js/React structure to Flutter structure
  mapToFlutterStructure(analysis) {
    if (!analysis.success) {
      return null;
    }

    const mapping = {
      screens: [],      // from pages
      widgets: [],      // from components
      utils: [],        // from utils/lib
      models: []        // for future use
    };

    // Map pages to screens
    for (const page of analysis.structure.pages) {
      const screenName = this.toDartFileName(page.name.replace(/\.(tsx|jsx|ts|js)$/, ''));
      mapping.screens.push({
        source: page,
        dartName: screenName,
        dartPath: `lib/screens/${screenName}.dart`
      });
    }

    // Map components to widgets
    for (const component of analysis.structure.components) {
      const widgetName = this.toDartFileName(component.name.replace(/\.(tsx|jsx|ts|js)$/, ''));
      mapping.widgets.push({
        source: component,
        dartName: widgetName,
        dartPath: `lib/widgets/${widgetName}.dart`
      });
    }

    // Map utils/lib to utils
    const allUtils = [...analysis.structure.utils, ...analysis.structure.lib];
    for (const util of allUtils) {
      const utilName = this.toDartFileName(util.name.replace(/\.(ts|js)$/, ''));
      mapping.utils.push({
        source: util,
        dartName: utilName,
        dartPath: `lib/utils/${utilName}.dart`
      });
    }

    return mapping;
  }

  // Convert file name to Dart naming convention (snake_case)
  toDartFileName(name) {
    // Convert camelCase/PascalCase to snake_case
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }
}
