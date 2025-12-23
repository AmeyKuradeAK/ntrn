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
    
    console.log(chalk.cyan('\n📋 Next Steps:'));
    console.log(chalk.white(`   1. cd ${path.relative(process.cwd(), resolvedOutputPath)}`));
    console.log(chalk.white('   2. flutter pub get'));
    console.log(chalk.white('   3. flutter run'));
    
    console.log(chalk.yellow('\n⚠️  Note: This is v0.1 - structure only. Code conversion coming in future versions.'));

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
