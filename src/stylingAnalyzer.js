import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverseDefault = traverse.default || traverse;

export class StylingAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Detect which styling methods are used in the project
   */
  async detectStylingMethods(projectPath, packageJson) {
    const methods = {
      tailwind: false,
      cssModules: false,
      styledComponents: false,
      emotion: false,
      inlineStyles: false,
      globalCSS: false
    };

    const deps = { ...packageJson?.dependencies || {}, ...packageJson?.devDependencies || {} };

    // Check package.json dependencies
    if (deps.tailwindcss || deps['@tailwindcss/forms'] || deps['@tailwindcss/typography']) {
      methods.tailwind = true;
    }

    if (deps['styled-components'] || deps['@emotion/styled'] || deps['@emotion/react']) {
      if (deps['styled-components']) {
        methods.styledComponents = true;
      }
      if (deps['@emotion/styled'] || deps['@emotion/react']) {
        methods.emotion = true;
      }
    }

    // Check for CSS module files
    const cssModulePatterns = [
      '**/*.module.css',
      '**/*.module.scss',
      '**/*.module.sass',
      '**/*.module.less'
    ];
    for (const pattern of cssModulePatterns) {
      const files = await glob(pattern, { cwd: projectPath, ignore: ['node_modules/**'] });
      if (files.length > 0) {
        methods.cssModules = true;
        break;
      }
    }

    // Check for global CSS files
    const globalCssFiles = [
      'globals.css',
      'styles.css',
      'global.css',
      'app.css',
      'index.css'
    ];
    for (const cssFile of globalCssFiles) {
      const possiblePaths = [
        path.join(projectPath, cssFile),
        path.join(projectPath, 'app', cssFile),
        path.join(projectPath, 'src', cssFile),
        path.join(projectPath, 'src', 'app', cssFile),
        path.join(projectPath, 'styles', cssFile)
      ];
      for (const cssPath of possiblePaths) {
        if (await fs.exists(cssPath)) {
          methods.globalCSS = true;
          break;
        }
      }
      if (methods.globalCSS) break;
    }

    return methods;
  }

  /**
   * Analyze Tailwind CSS classes
   */
  analyzeTailwindClasses(classNameValues) {
    if (!classNameValues || classNameValues.length === 0) {
      return {
        totalClasses: 0,
        colorClasses: new Map(),
        spacingClasses: new Map(),
        typographyClasses: new Map(),
        layoutClasses: new Map(),
        responsiveBreakpoints: [],
        mostUsedClasses: []
      };
    }

    const colorClasses = new Map();
    const spacingClasses = new Map();
    const typographyClasses = new Map();
    const layoutClasses = new Map();
    const breakpointSet = new Set();
    const classCounts = new Map();

    // Tailwind class patterns
    const colorPatterns = [
      /^(bg|text|border|ring|outline|divide|from|via|to|placeholder|accent|caret)-/,
      /^(fill|stroke)-/
    ];
    const spacingPatterns = [
      /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|inset|top|right|bottom|left)-/,
      /^(w|h|min-w|min-h|max-w|max-h)-/
    ];
    const typographyPatterns = [
      /^(text|font|leading|tracking|antialiased|subpixel-antialiased|italic|not-italic|uppercase|lowercase|capitalize|normal-case|underline|line-through|no-underline|decoration|underline-offset)-/
    ];
    const layoutPatterns = [
      /^(flex|grid|inline-flex|inline-grid|block|inline-block|inline|hidden|table|table-row|table-cell|contents|list-item|flow-root|container|float|clear|object|overflow|overscroll|static|fixed|absolute|relative|sticky|z-|order|col-|row-|auto-cols|auto-rows|grid-cols|grid-rows|gap|justify|items|content|self|place-|columns|break-|box-|display|position)-/
    ];
    const breakpointPattern = /^(sm|md|lg|xl|2xl):/;

    classNameValues.forEach(className => {
      // Handle template literals or expressions (skip for now)
      if (typeof className !== 'string') return;

      // Count all classes
      const currentCount = classCounts.get(className) || 0;
      classCounts.set(className, currentCount + 1);

      // Check for responsive breakpoints
      if (breakpointPattern.test(className)) {
        const match = className.match(breakpointPattern);
        if (match) {
          breakpointSet.add(match[1]);
        }
      }

      // Categorize classes
      let categorized = false;

      for (const pattern of colorPatterns) {
        if (pattern.test(className)) {
          const count = colorClasses.get(className) || 0;
          colorClasses.set(className, count + 1);
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        for (const pattern of spacingPatterns) {
          if (pattern.test(className)) {
            const count = spacingClasses.get(className) || 0;
            spacingClasses.set(className, count + 1);
            categorized = true;
            break;
          }
        }
      }

      if (!categorized) {
        for (const pattern of typographyPatterns) {
          if (pattern.test(className)) {
            const count = typographyClasses.get(className) || 0;
            typographyClasses.set(className, count + 1);
            categorized = true;
            break;
          }
        }
      }

      if (!categorized) {
        for (const pattern of layoutPatterns) {
          if (pattern.test(className)) {
            const count = layoutClasses.get(className) || 0;
            layoutClasses.set(className, count + 1);
            categorized = true;
            break;
          }
        }
      }
    });

    // Get most used classes (filter out [expression] and non-string values)
    const mostUsedClasses = Array.from(classCounts.entries())
      .filter(([className]) => typeof className === 'string' && className !== '[expression]')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([className, count]) => ({ class: className, count }));

    return {
      totalClasses: classNameValues.length,
      colorClasses,
      spacingClasses,
      typographyClasses,
      layoutClasses,
      responsiveBreakpoints: Array.from(breakpointSet).sort(),
      mostUsedClasses
    };
  }

  /**
   * Extract design tokens from Tailwind classes and config
   */
  async extractDesignTokens(classNameValues, tailwindConfig) {
    const tokens = {
      colors: [],
      fonts: [],
      spacing: [],
      breakpoints: {},
      arbitraryColors: [] // NEW: for bracket notation colors
    };

    // Extract colors from classes (named colors)
    const colorSet = new Set();
    const arbitraryColorSet = new Set(); // NEW: for bracket notation colors
    
    if (classNameValues) {
      classNameValues.forEach(className => {
        if (typeof className !== 'string') return;
        
        // Match named color classes like bg-blue-500, text-red-600
        const colorMatch = className.match(/^(bg|text|border|ring)-([a-z]+)-(\d+)$/);
        if (colorMatch) {
          colorSet.add(colorMatch[2]);
        }
        
        // Extract arbitrary color values like bg-[#EDEBE7], text-[rgb(255,0,0)]
        const arbitraryColorMatch = className.match(/^(bg|text|border|ring)-\[([^\]]+)\]/);
        if (arbitraryColorMatch) {
          arbitraryColorSet.add(arbitraryColorMatch[2]);
        }
      });
    }
    
    tokens.colors = Array.from(colorSet).sort();
    tokens.arbitraryColors = Array.from(arbitraryColorSet).slice(0, 10); // Limit to 10

    // Extract fonts from classes
    const fontSet = new Set();
    if (classNameValues) {
      classNameValues.forEach(className => {
        if (typeof className !== 'string') return;
        const fontMatch = className.match(/^font-([a-z-]+)$/);
        if (fontMatch) {
          fontSet.add(fontMatch[1]);
        }
      });
    }
    tokens.fonts = Array.from(fontSet).sort();

    // Extract spacing from classes
    const spacingSet = new Set();
    if (classNameValues) {
      classNameValues.forEach(className => {
        if (typeof className !== 'string') return;
        // Match spacing like p-4, m-2, gap-8, w-10, h-20
        const spacingMatch = className.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|w|h|min-w|min-h|max-w|max-h)-(\d+)$/);
        if (spacingMatch) {
          spacingSet.add(spacingMatch[2]);
        }
      });
    }
    tokens.spacing = Array.from(spacingSet).sort((a, b) => parseInt(a) - parseInt(b));

    // Extract breakpoints from Tailwind config or use defaults
    if (tailwindConfig?.theme?.screens) {
      tokens.breakpoints = tailwindConfig.theme.screens;
    } else {
      tokens.breakpoints = {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      };
    }

    return tokens;
  }

  /**
   * Analyze inline style usage in AST
   */
  analyzeInlineStyles(ast, filePath) {
    const self = this;
    let usageCount = 0;
    const styleProperties = new Set();

    if (!ast) return { usageCount: 0, files: [], properties: [] };

    traverseDefault(ast, {
      JSXAttribute(path) {
        if (t.isJSXIdentifier(path.node.name) && path.node.name.name === 'style') {
          usageCount++;
          
          // Try to extract style properties
          if (t.isJSXExpressionContainer(path.node.value)) {
            const expression = path.node.value.expression;
            if (t.isObjectExpression(expression)) {
              expression.properties.forEach(prop => {
                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                  styleProperties.add(prop.key.name);
                }
              });
            }
          }
        }
      }
    });

    return {
      usageCount,
      files: usageCount > 0 ? [filePath] : [],
      properties: Array.from(styleProperties)
    };
  }

  /**
   * Analyze CSS files in the project
   */
  async analyzeCSSFiles(projectPath) {
    const cssFiles = [];
    const patterns = [
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less'
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: projectPath,
        ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**']
      });

      for (const file of files) {
        const fullPath = path.join(projectPath, file);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const isModule = file.includes('.module.');
          
          // Extract class selectors
          const classSelectors = [];
          const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g;
          let match;
          while ((match = classRegex.exec(content)) !== null) {
            classSelectors.push(match[1]);
          }

          // Extract CSS custom properties
          const customProperties = [];
          const varRegex = /--([a-zA-Z-]+):\s*([^;]+);/g;
          while ((match = varRegex.exec(content)) !== null) {
            customProperties.push(match[1]);
          }

          cssFiles.push({
            path: file,
            type: isModule ? 'module' : 'global',
            classes: classSelectors,
            customProperties: customProperties
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return cssFiles;
  }

  /**
   * Main analysis method
   */
  async analyze(structure, packageJson) {
    const allFiles = [
      ...structure.pages,
      ...structure.components,
      ...structure.utils,
      ...structure.lib
    ];

    // Collect all className values
    const allClassNameValues = [];
    const inlineStyleFiles = [];
    let totalInlineStyles = 0;
    const inlineStyleProperties = new Set();

    allFiles.forEach(file => {
      if (file.structure?.classNameValues) {
        allClassNameValues.push(...file.structure.classNameValues);
      }
    });

    // Detect styling methods
    const stylingMethods = await this.detectStylingMethods(this.projectPath, packageJson);

    // Analyze Tailwind classes
    const tailwindAnalysis = this.analyzeTailwindClasses(allClassNameValues);

    // Analyze CSS files
    const cssFiles = await this.analyzeCSSFiles(this.projectPath);

    // Extract design tokens (will be enhanced with Tailwind config later)
    const designTokens = await this.extractDesignTokens(allClassNameValues, null);

    // Aggregate inline styles (simplified - would need AST parsing for full analysis)
    // For now, we'll check if any files have style prop in their structure
    allFiles.forEach(file => {
      if (file.structure?.propDetails) {
        const hasStyleProp = file.structure.propDetails.some(p => p.name === 'style');
        if (hasStyleProp) {
          inlineStyleFiles.push(file.relativePath);
          totalInlineStyles++;
        }
      }
    });

    return {
      stylingMethods,
      tailwindAnalysis: {
        totalClasses: tailwindAnalysis.totalClasses,
        colorClasses: Object.fromEntries(tailwindAnalysis.colorClasses),
        spacingClasses: Object.fromEntries(tailwindAnalysis.spacingClasses),
        typographyClasses: Object.fromEntries(tailwindAnalysis.typographyClasses),
        layoutClasses: Object.fromEntries(tailwindAnalysis.layoutClasses),
        responsiveBreakpoints: tailwindAnalysis.responsiveBreakpoints,
        mostUsedClasses: tailwindAnalysis.mostUsedClasses
      },
      designTokens,
      cssFiles,
      inlineStyles: {
        usageCount: totalInlineStyles,
        files: inlineStyleFiles
      }
    };
  }
}

