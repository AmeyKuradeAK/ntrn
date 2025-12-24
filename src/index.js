#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import prompts from 'prompts';
import { ProjectAnalyzer } from './analyzer.js';
import { FlutterGenerator } from './flutterGenerator.js';

// Get package version
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = await fs.readJson(packageJsonPath);

program
  .name('ntrn')
  .description('🚀 Next.js/React to Flutter Converter')
  .version(packageJson.version)
  .option('-v, --verbose', 'Show detailed analysis logs');

// Default command
program
  .action(async (options) => {
    await runConversion(options.verbose || false);
  });

// Convert command
program
  .command('convert')
  .description('Convert Next.js/React project to Flutter')
  .option('-v, --verbose', 'Show detailed analysis logs')
  .action(async (options) => {
    await runConversion(options.verbose);
  });

// Main conversion function
async function runConversion(verbose = false) {
  try {
    console.clear();
    
    console.log(chalk.cyan(figlet.textSync('NTRN', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    })));
    
    console.log(chalk.cyan('🚀 Next.js/React to Flutter Converter'));
    console.log(chalk.gray('v0.1 - Project structure conversion'));
    console.log(chalk.yellow('━'.repeat(60)));
    console.log('');

    // Step 1: Get Next.js project path
    const { nextjsPath } = await prompts({
      type: 'text',
      name: 'nextjsPath',
      message: 'Enter the path to your Next.js/React project:',
      initial: process.cwd(),
      validate: async (input) => {
        if (!input) return 'Path is required';
        
        const fullPath = path.resolve(input);
        if (!await fs.exists(fullPath)) {
          return 'Path does not exist';
        }
        
        // Check if it's a Next.js or React project
        const packageJsonPath = path.join(fullPath, 'package.json');
        if (await fs.exists(packageJsonPath)) {
          try {
            const pkg = await fs.readJson(packageJsonPath);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            if (!deps.next && !deps.react) {
              return 'This does not appear to be a Next.js or React project';
            }
          } catch (error) {
            return 'Could not read package.json';
          }
        } else {
          return 'No package.json found - is this a valid project?';
        }
        
        return true;
      }
    });

    if (!nextjsPath) {
      console.log(chalk.yellow('❌ Conversion cancelled.'));
      process.exit(0);
    }

    const resolvedNextjsPath = path.resolve(nextjsPath);
    console.log(chalk.blue(`\n📁 Analyzing project: ${resolvedNextjsPath}\n`));

    // Step 2: Analyze project
    const analyzer = new ProjectAnalyzer(resolvedNextjsPath, verbose);
    const analysis = await analyzer.analyze();

    if (!analysis.success) {
      console.error(chalk.red(`❌ Analysis failed: ${analysis.error}`));
      process.exit(1);
    }

    // Display analysis results with file lists
    console.log(chalk.green('✅ Project analyzed:'));
    console.log(chalk.gray(`   Framework: ${analysis.framework === 'nextjs' ? 'Next.js' : analysis.framework === 'react' ? 'React' : 'Unknown'}\n`));

    // Display Pages
    if (analysis.structure.pages.length > 0) {
      console.log(chalk.cyan(`📄 Pages (${analysis.stats.totalPages} found):`));
      analysis.structure.pages.slice(0, 10).forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        let line = chalk.white(`   - ${file.relativePath} ${chalk.gray(`(${sizeKB} KB)`)}`);
        
        if (file.structure) {
          const s = file.structure;
          const componentInfo = [];
          if (s.componentName) componentInfo.push(s.componentName);
          if (s.componentType) componentInfo.push(s.componentType);
          if (s.isDefaultExport) componentInfo.push('default export');
          
          if (componentInfo.length > 0) {
            line += `\n     ${chalk.gray('Component: ' + componentInfo.join(', '))}`;
          }
          
          // Show elements
          const elementCounts = Object.entries(s.jsxElements || {})
            .slice(0, 5)
            .map(([name, count]) => `${name}(${count})`)
            .join(', ');
          if (elementCounts) {
            line += `\n     ${chalk.gray('Elements: ' + elementCounts)}`;
          }
          
          // Show props
          const propCounts = Object.entries(s.props || {})
            .slice(0, 5)
            .map(([name, count]) => `${name}(${count})`)
            .join(', ');
          if (propCounts) {
            line += `\n     ${chalk.gray('Props: ' + propCounts)}`;
          }
          
          // Show className values (important for styling)
          if (s.classNameValues && s.classNameValues.length > 0) {
            const classSamples = s.classNameValues.slice(0, 8).join(', ');
            const moreClasses = s.classNameValues.length > 8 ? ` (+${s.classNameValues.length - 8} more)` : '';
            line += `\n     ${chalk.gray('Classes: ')}${chalk.cyan(classSamples)}${chalk.gray(moreClasses)}`;
          }
          
          // Show imports summary
          if (s.importDetails && s.importDetails.length > 0) {
            const externalLibs = s.importDetails
              .filter(imp => imp.isExternal && !imp.isNextJS)
              .map(imp => imp.source)
              .slice(0, 3);
            const nextJSImports = s.importDetails
              .filter(imp => imp.isNextJS)
              .map(imp => imp.source)
              .slice(0, 3);
            const imports = [];
            if (nextJSImports.length > 0) {
              imports.push(`next: ${nextJSImports.join(', ')}`);
            }
            if (externalLibs.length > 0) {
              imports.push(`libs: ${externalLibs.join(', ')}`);
            }
            if (imports.length > 0) {
              line += `\n     ${chalk.gray('Imports: ' + imports.join('; '))}`;
            }
          }
          
          // Show text content samples
          if (s.textContent && s.textContent.length > 0) {
            const textSamples = s.textContent.slice(0, 3).map(t => `"${t}"`).join(', ');
            const moreText = s.textContent.length > 3 ? ` (+${s.textContent.length - 3} more)` : '';
            line += `\n     ${chalk.gray('Text: ')}${chalk.white(textSamples)}${chalk.gray(moreText)}`;
          }
          
          // Show custom components vs HTML elements
          if (s.customComponents && s.customComponents.length > 0) {
            const customComps = s.customComponents.slice(0, 3).join(', ');
            const moreComps = s.customComponents.length > 3 ? ` (+${s.customComponents.length - 3})` : '';
            line += `\n     ${chalk.gray('Custom components: ')}${chalk.yellow(customComps)}${chalk.gray(moreComps)}`;
          }
          
          // Show complexity
          if (s.complexity) {
            const complexityColor = s.complexity === 'complex' ? chalk.red : 
                                   s.complexity === 'moderate' ? chalk.yellow : chalk.green;
            line += `\n     ${chalk.gray('Complexity: ')}${complexityColor(s.complexity)}`;
          }
          
          // Show hooks/features
          const features = [];
          if (s.hasState) features.push('useState');
          if (s.hasEffects) features.push('useEffect');
          if (s.hooks && s.hooks.length > 0) {
            const otherHooks = s.hooks.filter(h => h !== 'useState' && h !== 'useEffect').slice(0, 2);
            if (otherHooks.length > 0) {
              features.push(...otherHooks);
            }
          }
          if (s.eventHandlers.length > 0) features.push(`${s.eventHandlers.length} event handlers`);
          if (features.length > 0) {
            line += `\n     ${chalk.gray('Has: ' + features.join(', '))}`;
          }
        }
        
        console.log(line);
      });
      if (analysis.structure.pages.length > 10) {
        console.log(chalk.gray(`   ... and ${analysis.structure.pages.length - 10} more`));
      }
      console.log('');
    } else {
      console.log(chalk.gray(`📄 Pages: 0 (none found)`));
    }

    // Display Components
    if (analysis.structure.components.length > 0) {
      console.log(chalk.cyan(`🧩 Components (${analysis.stats.totalComponents} found):`));
      analysis.structure.components.slice(0, 10).forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        let line = chalk.white(`   - ${file.relativePath} ${chalk.gray(`(${sizeKB} KB)`)}`);
        
        if (file.structure) {
          const s = file.structure;
          if (s.componentName) {
            line += `\n     ${chalk.gray('Component: ' + s.componentName + (s.componentType ? ` (${s.componentType})` : ''))}`;
          }
          
          // Show elements (top 3)
          const elementCounts = Object.entries(s.jsxElements || {})
            .slice(0, 3)
            .map(([name, count]) => `${name}(${count})`)
            .join(', ');
          if (elementCounts) {
            line += `\n     ${chalk.gray('Elements: ' + elementCounts)}`;
          }
          
          // Show className values if available
          if (s.classNameValues && s.classNameValues.length > 0) {
            const classSamples = s.classNameValues.slice(0, 5).join(', ');
            const moreClasses = s.classNameValues.length > 5 ? ` (+${s.classNameValues.length - 5})` : '';
            line += `\n     ${chalk.gray('Classes: ')}${chalk.cyan(classSamples)}${chalk.gray(moreClasses)}`;
          }
          
          // Show imports if available
          if (s.importDetails && s.importDetails.length > 0) {
            const importSources = [...new Set(s.importDetails.map(imp => imp.source))].slice(0, 3);
            if (importSources.length > 0) {
              line += `\n     ${chalk.gray('Imports: ' + importSources.join(', '))}`;
            }
          }
        }
        
        console.log(line);
      });
      if (analysis.structure.components.length > 10) {
        console.log(chalk.gray(`   ... and ${analysis.structure.components.length - 10} more`));
      }
      console.log('');
    } else {
      console.log(chalk.gray(`🧩 Components: 0 (none found)`));
    }

    // Display Utils/Lib
    const totalUtils = analysis.stats.totalUtils + analysis.stats.totalLib;
    const allUtils = [...analysis.structure.utils, ...analysis.structure.lib];
    if (allUtils.length > 0) {
      console.log(chalk.cyan(`🛠️  Utils/Lib (${totalUtils} found):`));
      allUtils.slice(0, 10).forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(1);
        console.log(chalk.white(`   - ${file.relativePath} ${chalk.gray(`(${sizeKB} KB)`)}`));
      });
      if (allUtils.length > 10) {
        console.log(chalk.gray(`   ... and ${allUtils.length - 10} more`));
      }
      console.log('');
    } else {
      console.log(chalk.gray(`🛠️  Utils/Lib: 0 (none found)`));
    }

    // Display Libraries
    if (analysis.libraries && analysis.libraries.length > 0) {
      console.log(chalk.cyan(`📦 External Libraries (${analysis.libraries.length} found):`));
      
      // Group libraries by category
      const librariesByCategory = new Map();
      const unmappedLibraries = [];
      
      analysis.libraries.forEach(lib => {
        if (lib.mapping) {
          const category = lib.category || 'other';
          if (!librariesByCategory.has(category)) {
            librariesByCategory.set(category, []);
          }
          librariesByCategory.get(category).push(lib);
        } else {
          unmappedLibraries.push(lib);
        }
      });

      // Display mapped libraries by category
      const categoryOrder = ['animation', 'icons', 'routing', 'media', 'state', 'forms', 'http', 'ui', 'styling', 'utils', 'other'];
      categoryOrder.forEach(category => {
        const libs = librariesByCategory.get(category);
        if (libs && libs.length > 0) {
          const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
          console.log(chalk.yellow(`   ${categoryName}:`));
          
          libs.forEach(lib => {
            const mapping = lib.mapping;
            const statusIcon = mapping.conversion === 'automatic' ? chalk.green('✅') : chalk.yellow('⚠️ ');
            const complexityColor = mapping.complexity === 'high' ? chalk.red : 
                                   mapping.complexity === 'medium' ? chalk.yellow : chalk.green;
            
            let line = `     ${statusIcon} ${chalk.white(lib.name)}`;
            
            if (mapping.flutter) {
              line += ` ${chalk.gray('→')} ${chalk.cyan(mapping.flutter)}`;
            }
            
            line += ` ${chalk.gray(`(${mapping.conversion}, ${complexityColor(mapping.complexity)})`)}`;
            console.log(line);
            
            // Show files using this library
            if (lib.files.length > 0) {
              const fileList = lib.files.slice(0, 3).map(f => f.relativePath).join(', ');
              const moreFiles = lib.files.length > 3 ? ` (+${lib.files.length - 3} more)` : '';
              console.log(chalk.gray(`        Used in: ${fileList}${moreFiles}`));
            }
            
            // Show conversion notes if available
            if (mapping.notes) {
              console.log(chalk.gray(`        Note: ${mapping.notes}`));
            }
          });
          console.log('');
        }
      });

      // Display unmapped libraries
      if (unmappedLibraries.length > 0) {
        console.log(chalk.yellow(`   Unmapped:`));
        unmappedLibraries.forEach(lib => {
          console.log(`     ${chalk.red('⚠️')}  ${chalk.white(lib.name)}`);
          if (lib.files.length > 0) {
            const fileList = lib.files.slice(0, 3).map(f => f.relativePath).join(', ');
            const moreFiles = lib.files.length > 3 ? ` (+${lib.files.length - 3} more)` : '';
            console.log(chalk.gray(`        Used in: ${fileList}${moreFiles}`));
          }
        });
        console.log('');
      }
    } else {
      console.log(chalk.gray(`📦 External Libraries: 0 (none found)`));
      console.log('');
    }

    // Display Dependency Analysis
    if (analysis.dependencies) {
      const deps = analysis.dependencies;
      const stats = deps.importStats;
      const totalDeps = stats.relative + stats.external + stats.nextjs + stats.absolute + stats.unresolved;
      
      console.log(chalk.cyan(`📊 Dependency Analysis:`));
      console.log(chalk.white(`   Total dependencies: ${totalDeps}`));
      console.log(chalk.white(`   Internal: ${stats.relative + stats.absolute}, External: ${stats.external}, Next.js: ${stats.nextjs}`));
      if (stats.unresolved > 0) {
        console.log(chalk.yellow(`   Unresolved: ${stats.unresolved}`));
      }
    console.log('');

      // Display entry points
      if (deps.entryPoints && deps.entryPoints.size > 0) {
        console.log(chalk.cyan(`🚪 Entry Points (${deps.entryPoints.size} found):`));
        Array.from(deps.entryPoints).forEach(filePath => {
          const node = deps.graph?.nodes?.get(filePath);
          const relativePath = node ? node.relativePath : path.basename(filePath);
          console.log(chalk.white(`   - ${relativePath}`));
        });
        console.log('');
      }

      // Display circular dependencies if found
      if (deps.circularDependencies && deps.circularDependencies.length > 0) {
        console.log(chalk.red(`⚠️  Circular Dependencies (${deps.circularDependencies.length} found):`));
        deps.circularDependencies.forEach((cycle, index) => {
          const cyclePaths = cycle.map(filePath => {
            // Find relative path from nodes
            let relativePath = filePath;
            if (deps.graph && deps.graph.nodes) {
              const node = deps.graph.nodes.get(filePath);
              if (node) {
                relativePath = node.relativePath;
              } else {
                // Fallback: try to get relative path
                try {
                  relativePath = path.relative(analysis.structure?.framework === 'nextjs' ? 
                    path.dirname(process.cwd()) : process.cwd(), filePath);
                } catch (e) {
                  relativePath = path.basename(filePath);
                }
              }
            }
            return relativePath;
          });
          console.log(chalk.red(`   ${index + 1}. ${cyclePaths.join(' → ')} → ${cyclePaths[0]}`));
        });
        console.log('');
      }

      // Display dependency tree in verbose mode
      if (verbose && deps.dependencyTree && deps.dependencyTree.length > 0) {
        console.log(chalk.cyan(`🌳 Dependency Tree:`));
        const printTree = (node, prefix = '', isLast = true) => {
          const connector = isLast ? '└─' : '├─';
          console.log(chalk.white(`${prefix}${connector} ${node.relativePath}`));
          
          const childPrefix = prefix + (isLast ? '   ' : '│  ');
          node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            printTree(child, childPrefix, isLastChild);
          });
        };

        deps.dependencyTree.forEach((rootNode, index) => {
          if (index > 0) console.log('');
          printTree(rootNode, '', true);
        });
    console.log('');
      }

      // Display per-file dependencies in verbose mode
      if (verbose && deps.fileDependencies && deps.fileDependencies.size > 0) {
        console.log(chalk.cyan(`📁 File Dependencies:`));
        const sortedFiles = Array.from(deps.fileDependencies.entries())
          .sort((a, b) => {
            const nodeA = deps.graph?.nodes?.get(a[0]);
            const nodeB = deps.graph?.nodes?.get(b[0]);
            return (nodeA?.relativePath || '').localeCompare(nodeB?.relativePath || '');
          });

        sortedFiles.forEach(([filePath, fileDeps]) => {
          const node = deps.graph?.nodes?.get(filePath);
          const relativePath = node ? node.relativePath : path.basename(filePath);
          const depth = deps.dependencyDepths?.get(filePath);
          const isEntryPoint = deps.entryPoints?.has(filePath);

          console.log(chalk.white(`   ${relativePath}`));
          
          // Show internal imports
          if (fileDeps.imports.length > 0) {
            const importList = fileDeps.imports.slice(0, 5).map(imp => {
              return `${imp.imports.map(i => i.name).join(', ')} (from ${imp.relativePath})`;
            }).join(', ');
            const moreImports = fileDeps.imports.length > 5 ? ` (+${fileDeps.imports.length - 5} more)` : '';
            console.log(chalk.gray(`     Imports: ${importList}${moreImports}`));
    } else {
            console.log(chalk.gray(`     Imports: (none)`));
          }

          // Show external imports
          if (fileDeps.externalImports && fileDeps.externalImports.length > 0) {
            const externalList = fileDeps.externalImports
              .slice(0, 5)
              .map(ext => {
                // Extract package name from source
                const packageName = ext.source.split('/')[0].replace('@', '');
                return packageName;
              })
              .filter((value, index, self) => self.indexOf(value) === index) // Unique
              .join(', ');
            const moreExternal = fileDeps.externalImports.length > 5 ? ` (+${fileDeps.externalImports.length - 5} more)` : '';
            console.log(chalk.gray(`     External: ${chalk.cyan(externalList)}${moreExternal}`));
          }

          // Show exports
          if (fileDeps.exports.length > 0) {
            const exportList = fileDeps.exports.map(exp => 
              `${exp.name} (${exp.isDefault ? 'default' : 'named'})`
            ).join(', ');
            console.log(chalk.gray(`     Exports: ${exportList}`));
          } else {
            console.log(chalk.gray(`     Exports: (none)`));
          }

          // Show dependents
          if (fileDeps.dependents.length > 0) {
            const dependentList = fileDeps.dependents.slice(0, 3).map(dep => dep.relativePath).join(', ');
            const moreDeps = fileDeps.dependents.length > 3 ? ` (+${fileDeps.dependents.length - 3} more)` : '';
            console.log(chalk.gray(`     Dependents: ${dependentList}${moreDeps}`));
          } else {
            const dependentText = isEntryPoint ? '(none - entry point)' : '(none)';
            console.log(chalk.gray(`     Dependents: ${dependentText}`));
          }

          // Show depth
          if (depth !== undefined && depth >= 0) {
            console.log(chalk.gray(`     Depth: ${depth}`));
          } else if (depth === -1) {
            console.log(chalk.gray(`     Depth: unreachable from entry points`));
          }
        });
    console.log('');
      }

      // Enhanced component usage display
      if (deps.componentUsage && deps.componentUsage.size > 0) {
        console.log(chalk.cyan(`🔗 Component Usage:`));
        const sortedComponents = Array.from(deps.componentUsage.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedComponents.slice(0, 20).forEach(([componentName, files]) => {
          // Find export type and file from graph
          let exportType = 'unknown';
          let exportFile = null;
          
          // Find which file exports this component
          if (deps.graph && deps.graph.nodes) {
            for (const [filePath, node] of deps.graph.nodes.entries()) {
              const exportInfo = node.exports.find(e => e.name === componentName);
              if (exportInfo) {
                exportType = exportInfo.isDefault ? 'default export' : 'named export';
                exportFile = node.relativePath;
                break;
              }
            }
          }

          // Build usage list with import types
          const usageDetails = [];
          files.slice(0, 5).forEach(filePath => {
            const node = deps.graph?.nodes?.get(filePath);
            if (!node) return;

            // Find import type from edges
            let importType = '';
            if (deps.graph.edges) {
              for (const edge of deps.graph.edges) {
                if (edge.from === filePath && edge.to) {
                  const targetNode = deps.graph.nodes.get(edge.to);
                  if (targetNode) {
                    // Check if this edge imports our component
                    const matchingImport = edge.imports.find(imp => {
                      if (imp.type === 'default') {
                        const defaultExport = targetNode.exports.find(e => e.isDefault);
                        return defaultExport && defaultExport.name === componentName;
                      } else if (imp.type === 'named') {
                        return imp.name === componentName;
                      }
                      return false;
                    });

                    if (matchingImport) {
                      importType = ` (${matchingImport.type} import)`;
                      break;
                    }
                  }
                }
              }
            }
            usageDetails.push(`${node.relativePath}${importType}`);
          });

          const fileList = usageDetails.join(', ');
          const moreFiles = files.length > 5 ? ` (+${files.length - 5} more)` : '';
          const exportInfo = exportFile ? ` (${exportType} from ${exportFile})` : '';
          console.log(chalk.white(`   ${componentName}${exportInfo}`));
          console.log(chalk.gray(`     Used in: ${fileList}${moreFiles}`));
        });
        if (sortedComponents.length > 20) {
          console.log(chalk.gray(`   ... and ${sortedComponents.length - 20} more components`));
        }
    console.log('');
      }

      // Display unused exports
      if (deps.unusedExports && deps.unusedExports.length > 0) {
        console.log(chalk.yellow(`⚠️  Unused Exports (${deps.unusedExports.length} found):`));
        deps.unusedExports.slice(0, 20).forEach(exp => {
          console.log(chalk.yellow(`   ${exp.relativePath} exports: ${exp.exportName} (${exp.exportType}, never imported)`));
        });
        if (deps.unusedExports.length > 20) {
          console.log(chalk.gray(`   ... and ${deps.unusedExports.length - 20} more`));
        }
    console.log('');
      }

      // Display import/export mismatches
      if (deps.importMismatches && deps.importMismatches.length > 0) {
        console.log(chalk.yellow(`⚠️  Import/Export Mismatches (${deps.importMismatches.length} found):`));
        deps.importMismatches.slice(0, 20).forEach(mismatch => {
          console.log(chalk.yellow(`   ${mismatch.fromRelativePath} imports: ${mismatch.importedName} (${mismatch.importType}) from ${mismatch.toRelativePath} - ${mismatch.issue}`));
        });
        if (deps.importMismatches.length > 20) {
          console.log(chalk.gray(`   ... and ${deps.importMismatches.length - 20} more`));
        }
        console.log('');
      }

      // Enhanced unresolved imports display
      if (deps.unresolvedImports && deps.unresolvedImports.length > 0) {
        console.log(chalk.yellow(`⚠️  Unresolved Imports (${deps.unresolvedImports.length} found):`));
        deps.unresolvedImports.slice(0, 20).forEach(unresolved => {
          console.log(chalk.yellow(`   ${unresolved.relativePath}: ${unresolved.importSource} (${unresolved.reason})`));
        });
        if (deps.unresolvedImports.length > 20) {
          console.log(chalk.gray(`   ... and ${deps.unresolvedImports.length - 20} more`));
        }
    console.log('');
      }
    }

    // Display Component & State Analysis
    if (analysis.stateAnalysis && analysis.stateAnalysis.files && analysis.stateAnalysis.files.size > 0) {
      console.log(chalk.cyan(`🔍 Component & State Analysis:`));
    console.log('');

      const stateAnalysis = analysis.stateAnalysis;
      const sortedFiles = Array.from(stateAnalysis.files.entries())
        .sort((a, b) => {
          // Sort by file type: pages first, then components
          const aIsPage = analysis.structure.pages.some(p => p.fullPath === a[0]);
          const bIsPage = analysis.structure.pages.some(p => p.fullPath === b[0]);
          if (aIsPage && !bIsPage) return -1;
          if (!aIsPage && bIsPage) return 1;
          return a[1].relativePath.localeCompare(b[1].relativePath);
        });

      // Display per-component analysis
      sortedFiles.forEach(([filePath, fileAnalysis]) => {
        const componentName = analysis.structure.pages.find(p => p.fullPath === filePath)?.structure?.componentName ||
                             analysis.structure.components.find(c => c.fullPath === filePath)?.structure?.componentName ||
                             fileAnalysis.relativePath.split('/').pop().replace(/\.(tsx|jsx|ts|js)$/, '');
        
        console.log(chalk.white(`📦 ${fileAnalysis.relativePath} ${componentName ? `(${componentName} component)` : ''}`));

        // Display Props
        if (fileAnalysis.props && fileAnalysis.props.props && fileAnalysis.props.props.length > 0) {
          // Remove duplicates by name
          const uniqueProps = [];
          const seenProps = new Set();
          fileAnalysis.props.props.forEach(p => {
            if (!seenProps.has(p.name)) {
              seenProps.add(p.name);
              uniqueProps.push(p);
            }
          });
          
          const propsList = uniqueProps
            .map(p => `${p.name}${p.type !== 'unknown' ? `: ${p.type}` : ''}${p.required ? '' : '?'}`)
            .join(', ');
          console.log(chalk.gray(`   Props: ${propsList}`));
    } else {
          const isPage = analysis.structure.pages.some(p => p.fullPath === filePath);
          console.log(chalk.gray(`   Props: ${isPage ? 'None (page component)' : 'None'}`));
        }

        // Display State
        if (fileAnalysis.stateVars && fileAnalysis.stateVars.stateVars.length > 0) {
          console.log(chalk.gray(`   State:`));
          fileAnalysis.stateVars.stateVars.forEach(stateVar => {
            const initialValue = stateVar.initialValue !== null && stateVar.initialValue !== undefined 
              ? ` (initial: ${JSON.stringify(stateVar.initialValue)})` 
              : '';
            let line = `     - ${stateVar.name}: ${stateVar.type}${initialValue}`;
            
            if (stateVar.readLocations.length > 0) {
              line += `\n       Used in: ${stateVar.readLocations.length} location(s)`;
            }
            if (stateVar.updateLocations.length > 0) {
              line += `\n       Updated by: ${stateVar.updateLocations.length} setter call(s)`;
            }
            if (stateVar.passedAsProps.length > 0) {
              const passedTo = stateVar.passedAsProps.map(pp => `${pp.component}(${pp.propName})`).join(', ');
              line += `\n       Passed as props to: ${passedTo}`;
            }
            console.log(chalk.gray(line));
          });
        } else {
          console.log(chalk.gray(`   State: (none)`));
        }

        // Display Hooks
        const hooksList = [];
        if (fileAnalysis.hooks.useState.length > 0) {
          hooksList.push(`useState: ${fileAnalysis.hooks.useState.map(h => h.variableName).join(', ')}`);
        }
        if (fileAnalysis.hooks.useEffect.length > 0) {
          hooksList.push(`useEffect: ${fileAnalysis.hooks.useEffect.length} effect(s)`);
        }
        if (fileAnalysis.hooks.useContext.length > 0) {
          hooksList.push(`useContext: ${fileAnalysis.hooks.useContext.map(h => h.contextName).join(', ')}`);
        }
        if (fileAnalysis.hooks.useRef.length > 0) {
          hooksList.push(`useRef: ${fileAnalysis.hooks.useRef.map(h => h.refName).join(', ')}`);
        }
        if (fileAnalysis.hooks.useMemo.length > 0) {
          hooksList.push(`useMemo: ${fileAnalysis.hooks.useMemo.length} memo(s)`);
        }
        if (fileAnalysis.hooks.useCallback.length > 0) {
          hooksList.push(`useCallback: ${fileAnalysis.hooks.useCallback.length} callback(s)`);
        }
        if (fileAnalysis.hooks.useReducer.length > 0) {
          hooksList.push(`useReducer: ${fileAnalysis.hooks.useReducer.map(h => h.reducer || 'reducer').join(', ')}`);
        }
        
        if (hooksList.length > 0) {
          console.log(chalk.gray(`   Hooks: ${hooksList.join(', ')}`));
        } else {
          console.log(chalk.gray(`   Hooks: None`));
        }

        // Display Event Handlers
        if (fileAnalysis.eventHandlers && fileAnalysis.eventHandlers.handlers.length > 0) {
          console.log(chalk.gray(`   Event Handlers:`));
          fileAnalysis.eventHandlers.handlers.slice(0, 5).forEach(handler => {
            let line = `     - ${handler.name} (${handler.eventType})`;
            if (handler.usesState.length > 0) {
              line += `\n       Uses state: ${handler.usesState.join(', ')}`;
            }
            if (handler.actions.length > 0) {
              line += `\n       Actions: ${handler.actions.join(', ')}`;
            }
            console.log(chalk.gray(line));
          });
          if (fileAnalysis.eventHandlers.handlers.length > 5) {
            console.log(chalk.gray(`     ... and ${fileAnalysis.eventHandlers.handlers.length - 5} more`));
          }
        } else {
          console.log(chalk.gray(`   Event Handlers: (none)`));
        }

        // Display Composition
        if (fileAnalysis.composition && fileAnalysis.composition.renderedComponents.length > 0) {
          console.log(chalk.gray(`   Composition:`));
          fileAnalysis.composition.renderedComponents.slice(0, 5).forEach(rendered => {
            const propsList = Object.keys(rendered.props).slice(0, 3).join(', ');
            const moreProps = Object.keys(rendered.props).length > 3 ? ` (+${Object.keys(rendered.props).length - 3} more)` : '';
            const callbacksList = rendered.callbacks.length > 0 ? `, callbacks: ${rendered.callbacks.join(', ')}` : '';
            console.log(chalk.gray(`     - Renders: ${rendered.componentName} (props: ${propsList}${moreProps}${callbacksList})`));
          });
          if (fileAnalysis.composition.renderedComponents.length > 5) {
            console.log(chalk.gray(`     ... and ${fileAnalysis.composition.renderedComponents.length - 5} more`));
          }
        } else {
          console.log(chalk.gray(`   Composition: (none)`));
        }

  console.log('');
});

      // Display Custom Hooks
      const allCustomHooks = new Map();
      stateAnalysis.files.forEach((fileAnalysis, filePath) => {
        fileAnalysis.hooks.customHooks.forEach(customHook => {
          if (!allCustomHooks.has(customHook.name)) {
            allCustomHooks.set(customHook.name, {
              name: customHook.name,
              definition: fileAnalysis.relativePath,
              usage: []
            });
          }
          const hook = allCustomHooks.get(customHook.name);
          hook.usage.push(fileAnalysis.relativePath);
        });
      });

      if (allCustomHooks.size > 0) {
        console.log(chalk.cyan(`🎣 Custom Hooks:`));
        Array.from(allCustomHooks.entries()).forEach(([hookName, hookInfo]) => {
          const usageList = hookInfo.usage.slice(0, 3).join(', ');
          const moreUsage = hookInfo.usage.length > 3 ? ` (+${hookInfo.usage.length - 3} more)` : '';
          console.log(chalk.white(`   ${hookName} (defined in ${hookInfo.definition})`));
          console.log(chalk.gray(`     Used in: ${usageList}${moreUsage}`));
        });
        console.log('');
    } else {
        console.log(chalk.cyan(`🎣 Custom Hooks:`));
        console.log(chalk.gray(`   (none found)`));
        console.log('');
      }

      // Display Component Composition Tree (verbose mode)
      if (verbose && stateAnalysis.compositionTree && stateAnalysis.compositionTree.length > 0) {
        console.log(chalk.cyan(`🌲 Component Composition:`));
        const printCompositionTree = (node, prefix = '', isLast = true) => {
          const componentName = node.componentName || node.relativePath.split('/').pop().replace(/\.(tsx|jsx|ts|js)$/, '');
          const propsList = node.props && node.props.length > 0 
            ? ` (${node.props.slice(0, 2).map(p => p.propName).join(', ')}${node.props.length > 2 ? '...' : ''})`
            : '';
          const connector = isLast ? '└─' : '├─';
          console.log(chalk.white(`${prefix}${connector} ${componentName}${propsList}`));
          
          const childPrefix = prefix + (isLast ? '   ' : '│  ');
          if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
              const isLastChild = index === node.children.length - 1;
              printCompositionTree(child, childPrefix, isLastChild);
            });
          }
        };

        stateAnalysis.compositionTree.forEach((rootNode, index) => {
          if (index > 0) console.log('');
          printCompositionTree(rootNode, '', true);
        });
        console.log('');
      }

      // Display State Management Summary
      if (stateAnalysis.summary) {
        console.log(chalk.cyan(`📊 State Management Summary:`));
        console.log(chalk.white(`   - Total state variables: ${stateAnalysis.summary.totalStateVars}`));
        console.log(chalk.white(`   - Components with state: ${stateAnalysis.summary.componentsWithState}`));
        console.log(chalk.white(`   - Total hooks: ${stateAnalysis.summary.totalHooks}`));
        console.log(chalk.white(`   - Total event handlers: ${stateAnalysis.summary.totalEventHandlers}`));
        console.log(chalk.white(`   - Custom hooks: ${stateAnalysis.summary.customHooks}`));
        
        // Find most complex component
        let mostComplex = null;
        let maxComplexity = 0;
        stateAnalysis.files.forEach((fileAnalysis, filePath) => {
          const complexity = fileAnalysis.stateVars.stateVars.length + 
                           fileAnalysis.hooks.useEffect.length;
          if (complexity > maxComplexity) {
            maxComplexity = complexity;
            mostComplex = {
              file: fileAnalysis.relativePath,
              stateVars: fileAnalysis.stateVars.stateVars.length,
              effects: fileAnalysis.hooks.useEffect.length
            };
          }
        });
        
        if (mostComplex) {
          console.log(chalk.white(`   - Most complex state: ${mostComplex.file} (${mostComplex.stateVars} variable(s), ${mostComplex.effects} effect(s))`));
        }
        console.log('');
      }
    }

    // Display Styling Analysis
    if (analysis.stylingAnalysis) {
      const styling = analysis.stylingAnalysis;
      console.log(chalk.cyan(`🎨 Styling Analysis:`));
      
      // Styling Methods
      const methods = [];
      if (styling.stylingMethods?.tailwind) methods.push('Tailwind CSS');
      if (styling.stylingMethods?.cssModules) methods.push('CSS Modules');
      if (styling.stylingMethods?.styledComponents) methods.push('styled-components');
      if (styling.stylingMethods?.emotion) methods.push('Emotion');
      if (styling.stylingMethods?.inlineStyles) methods.push('Inline Styles');
      if (styling.stylingMethods?.globalCSS) methods.push('Global CSS');
      
      if (methods.length > 0) {
        console.log(chalk.white(`   Methods: ${methods.join(', ')}`));
      } else {
        console.log(chalk.gray(`   Methods: (none detected)`));
      }

      // Tailwind Analysis
      if (styling.stylingMethods?.tailwind && styling.tailwindAnalysis) {
        const tw = styling.tailwindAnalysis;
        console.log(chalk.white(`   Tailwind Classes: ${tw.totalClasses} total`));
        
        const colorCount = Object.keys(tw.colorClasses || {}).length;
        const spacingCount = Object.keys(tw.spacingClasses || {}).length;
        const typographyCount = Object.keys(tw.typographyClasses || {}).length;
        const layoutCount = Object.keys(tw.layoutClasses || {}).length;
        
        if (colorCount > 0 || spacingCount > 0 || typographyCount > 0 || layoutCount > 0) {
          const categories = [];
          if (colorCount > 0) categories.push(`Colors: ${colorCount}`);
          if (spacingCount > 0) categories.push(`Spacing: ${spacingCount}`);
          if (typographyCount > 0) categories.push(`Typography: ${typographyCount}`);
          if (layoutCount > 0) categories.push(`Layout: ${layoutCount}`);
          console.log(chalk.gray(`     ${categories.join(', ')}`));
        }

        if (tw.responsiveBreakpoints && tw.responsiveBreakpoints.length > 0) {
          console.log(chalk.gray(`     Breakpoints: ${tw.responsiveBreakpoints.join(', ')}`));
        }

        if (tw.mostUsedClasses && tw.mostUsedClasses.length > 0) {
          const topClasses = tw.mostUsedClasses.slice(0, 5).map(c => c.class).join(', ');
          console.log(chalk.gray(`     Most used: ${topClasses}`));
        }
      }

      // Design Tokens
      if (styling.designTokens) {
        const dt = styling.designTokens;
        if (dt.colors && dt.colors.length > 0) {
          console.log(chalk.white(`   Colors: ${dt.colors.slice(0, 10).join(', ')}${dt.colors.length > 10 ? ` (+${dt.colors.length - 10} more)` : ''}`));
        }
        if (dt.arbitraryColors && dt.arbitraryColors.length > 0) {
          console.log(chalk.white(`   Custom Colors: ${dt.arbitraryColors.slice(0, 5).join(', ')}${dt.arbitraryColors.length > 5 ? ` (+${dt.arbitraryColors.length - 5} more)` : ''}`));
        }
        if (dt.fonts && dt.fonts.length > 0) {
          console.log(chalk.white(`   Fonts: ${dt.fonts.join(', ')}`));
        }
        if (dt.spacing && dt.spacing.length > 0) {
          console.log(chalk.white(`   Spacing scale: ${dt.spacing.slice(0, 10).join(', ')}${dt.spacing.length > 10 ? ` (+${dt.spacing.length - 10} more)` : ''}`));
        }
      }

      // CSS Files
      if (styling.cssFiles && styling.cssFiles.length > 0) {
        const moduleFiles = styling.cssFiles.filter(f => f.type === 'module');
        const globalFiles = styling.cssFiles.filter(f => f.type === 'global');
        console.log(chalk.white(`   CSS Files: ${styling.cssFiles.length} (${moduleFiles.length} module(s), ${globalFiles.length} global)`));
        if (verbose && styling.cssFiles.length <= 5) {
          styling.cssFiles.forEach(file => {
            console.log(chalk.gray(`     - ${file.path}`));
          });
        }
      }

      // Inline Styles
      if (styling.inlineStyles && styling.inlineStyles.usageCount > 0) {
        console.log(chalk.white(`   Inline Styles: ${styling.inlineStyles.usageCount} usage(s) in ${styling.inlineStyles.files.length} file(s)`));
      }

      console.log('');
    }

    // Display Configuration Analysis
    if (analysis.configurationAnalysis) {
      const config = analysis.configurationAnalysis;
      console.log(chalk.cyan(`⚙️  Configuration Analysis:`));
      
      // Next.js Config
      if (config.nextConfig) {
        const nc = config.nextConfig;
        if (nc.exists) {
          console.log(chalk.white(`   Next.js Config: ${nc.file || 'found'}`));
          if (nc.redirects > 0) console.log(chalk.gray(`     Redirects: ${nc.redirects}`));
          if (nc.rewrites > 0) console.log(chalk.gray(`     Rewrites: ${nc.rewrites}`));
          if (nc.headers > 0) console.log(chalk.gray(`     Headers: ${nc.headers}`));
          console.log(chalk.gray(`     Image Optimization: ${nc.imageOptimization ? 'enabled' : 'disabled'}`));
    } else {
          console.log(chalk.gray(`   Next.js Config: (not found)`));
        }
      }

      // Routing
      if (config.routing) {
        const routing = config.routing;
        if (routing.type !== 'none') {
          console.log(chalk.white(`   Routing: ${routing.type === 'both' ? 'Pages + App Router' : routing.type === 'pages' ? 'Pages Router' : 'App Router'}`));
          
          if (routing.pagesRouter && routing.pagesRouter.totalRoutes > 0) {
            console.log(chalk.gray(`     Pages Router: ${routing.pagesRouter.totalRoutes} route(s)`));
            if (routing.pagesRouter.dynamicRoutes > 0) {
              console.log(chalk.gray(`       Dynamic: ${routing.pagesRouter.dynamicRoutes}`));
            }
            if (routing.pagesRouter.catchAllRoutes > 0) {
              console.log(chalk.gray(`       Catch-all: ${routing.pagesRouter.catchAllRoutes}`));
            }
          }

          if (routing.appRouter && routing.appRouter.totalRoutes > 0) {
            console.log(chalk.gray(`     App Router: ${routing.appRouter.totalRoutes} route(s)`));
            if (routing.appRouter.layouts > 0) {
              console.log(chalk.gray(`       Layouts: ${routing.appRouter.layouts}`));
            }
            if (routing.appRouter.loadingFiles > 0) {
              console.log(chalk.gray(`       Loading files: ${routing.appRouter.loadingFiles}`));
            }
            if (routing.appRouter.routeGroups && routing.appRouter.routeGroups.length > 0) {
              console.log(chalk.gray(`       Route groups: ${routing.appRouter.routeGroups.join(', ')}`));
            }
          }
        } else {
          console.log(chalk.gray(`   Routing: (none detected)`));
        }
      }

      // API Routes
      if (config.apiRoutes && config.apiRoutes.length > 0) {
        console.log(chalk.white(`   API Routes: ${config.apiRoutes.length} route(s)`));
        config.apiRoutes.slice(0, 5).forEach(route => {
          const dynamic = route.isDynamic ? ' [dynamic]' : '';
          const params = route.parameters && route.parameters.length > 0 ? ` (${route.parameters.join(', ')})` : '';
          console.log(chalk.gray(`     ${route.path} (${route.method})${dynamic}${params}`));
        });
        if (config.apiRoutes.length > 5) {
          console.log(chalk.gray(`     ... and ${config.apiRoutes.length - 5} more`));
        }
      } else {
        console.log(chalk.gray(`   API Routes: (none found)`));
      }

      // TypeScript Config
      if (config.typescriptConfig) {
        const ts = config.typescriptConfig;
        if (ts.exists) {
          console.log(chalk.white(`   TypeScript Config: found`));
          if (ts.pathAliases && Object.keys(ts.pathAliases).length > 0) {
            const aliases = Object.keys(ts.pathAliases).slice(0, 3).join(', ');
            const more = Object.keys(ts.pathAliases).length > 3 ? ` (+${Object.keys(ts.pathAliases).length - 3} more)` : '';
            console.log(chalk.gray(`     Path aliases: ${aliases}${more}`));
          }
        } else {
          console.log(chalk.gray(`   TypeScript Config: (not found)`));
        }
      }

      // Tailwind Config
      if (config.tailwindConfig) {
        const tw = config.tailwindConfig;
        if (tw.exists) {
          let configText = tw.file || 'found';
          if (tw.viaPostCSS) {
            configText = configText.replace(' (via PostCSS)', ''); // Remove if already in file name
          } else if (tw.viaPackageJson) {
            configText += ' (default)';
          }
          console.log(chalk.white(`   Tailwind Config: ${configText}`));
        } else {
          console.log(chalk.gray(`   Tailwind Config: (not found)`));
        }
      }

      // Environment Files
      if (config.environmentFiles && config.environmentFiles.length > 0) {
        console.log(chalk.white(`   Environment Files: ${config.environmentFiles.length} file(s)`));
        config.environmentFiles.forEach(env => {
          console.log(chalk.gray(`     ${env.file}: ${env.variables.length} variable(s)`));
        });
      }

  console.log('');
    }

    // Summary
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.white(`   Total files: ${analysis.stats.totalFiles}\n`));

    if (analysis.stats.totalFiles === 0) {
      console.log(chalk.yellow('⚠️  No files found to convert.'));
      console.log(chalk.gray('   This might mean:'));
      console.log(chalk.gray('   - Files are in a different location than expected'));
      console.log(chalk.gray('   - Project uses a non-standard structure'));
      console.log(chalk.gray('   - Project is empty or just initialized'));
      console.log(chalk.gray('   Creating basic Flutter project structure anyway.\n'));
    }

    // Step 3: Map to Flutter structure
    const mapping = analyzer.mapToFlutterStructure(analysis);
    if (!mapping) {
      console.error(chalk.red('❌ Failed to map project structure'));
    process.exit(1);
  }

    // Step 4: Get Flutter project name
    const { flutterProjectName } = await prompts({
      type: 'text',
      name: 'flutterProjectName',
      message: 'Enter name for your Flutter project:',
      initial: path.basename(resolvedNextjsPath) + '-flutter',
      validate: (name) => {
        if (!name) return 'Project name is required';
        if (!/^[a-z][a-z0-9_]*$/.test(name.toLowerCase())) {
          return 'Project name must be lowercase, start with a letter, and contain only letters, numbers, and underscores';
        }
        return true;
      }
    });

    if (!flutterProjectName) {
      console.log(chalk.yellow('❌ Conversion cancelled.'));
      process.exit(0);
    }

    // Step 5: Get output path
    const { outputPath } = await prompts({
      type: 'text',
      name: 'outputPath',
      message: 'Enter output directory path:',
      initial: path.join(process.cwd(), flutterProjectName),
      validate: (input) => {
        if (!input) return 'Output path is required';
        return true;
      }
    });

    if (!outputPath) {
      console.log(chalk.yellow('❌ Conversion cancelled.'));
      process.exit(0);
    }

    // Check if directory exists and prompt for overwrite
    const resolvedOutputPath = path.resolve(outputPath);
    if (await fs.exists(resolvedOutputPath)) {
      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Directory "${outputPath}" already exists. Overwrite?`,
        initial: false
      });
      
      if (!overwrite) {
        console.log(chalk.yellow('❌ Conversion cancelled.'));
        process.exit(0);
      }
      
      await fs.remove(resolvedOutputPath);
    }

    console.log(chalk.blue(`\n📱 Creating Flutter project: ${resolvedOutputPath}\n`));

    // Step 6: Generate Flutter project
    const generator = new FlutterGenerator(resolvedOutputPath, flutterProjectName);
    const result = await generator.generate(analysis, mapping);

    if (!result.success) {
      console.error(chalk.red(`❌ Generation failed: ${result.error}`));
      process.exit(1);
    }

    // Step 7: Show summary
    console.log(chalk.green('\n✅ Flutter project created successfully!\n'));
    console.log(chalk.cyan('📊 Conversion Summary:'));
    console.log(chalk.white(`   Screens created: ${mapping.screens.length}`));
    console.log(chalk.white(`   Widgets created: ${mapping.widgets.length}`));
    console.log(chalk.white(`   Utils created: ${mapping.utils.length}`));
    console.log(chalk.white(`   Total files: ${mapping.screens.length + mapping.widgets.length + mapping.utils.length}`));
    
    // Show conversion stats (v0.7)
    if (result.conversionStats) {
      console.log(chalk.cyan('\n🔄 Code Conversion (v0.7):'));
      console.log(chalk.white(`   Screens converted: ${result.conversionStats.screensConverted}/${mapping.screens.length}`));
      console.log(chalk.white(`   Widgets converted: ${result.conversionStats.widgetsConverted}/${mapping.widgets.length}`));
      if (result.conversionStats.errors > 0) {
        console.log(chalk.yellow(`   Errors: ${result.conversionStats.errors} (fallback to placeholders)`));
      }
    }
    
    console.log(chalk.cyan('\n📋 Next Steps:'));
    console.log(chalk.white(`   1. cd ${path.relative(process.cwd(), resolvedOutputPath)}`));
    console.log(chalk.white('   2. flutter pub get'));
    console.log(chalk.white('   3. flutter run'));
    
    console.log(chalk.yellow('\n⚠️  Note: This is v0.7 - basic JSX to Flutter widget conversion.'));
    console.log(chalk.yellow('   State management and styling conversion coming in v0.8 and v0.9.'));

  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
  process.exit(1);
  }
}

// Show help information
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ ntrn                    # Convert Next.js/React project to Flutter');
  console.log('  $ ntrn convert             # Same as above');
  console.log('  $ ntrn --help              # Show this help');
  console.log('  $ ntrn --version           # Show version');
  console.log('');
  console.log(chalk.cyan('Features:'));
  console.log('  ✨ Analyzes Next.js/React project structure');
  console.log('  📱 Creates Flutter project with mapped structure');
  console.log('  🗂️  Maps pages → screens, components → widgets');
  console.log('  📝 Generates placeholder Dart files');
  console.log('');
});

// Parse command line arguments
program.parse();
