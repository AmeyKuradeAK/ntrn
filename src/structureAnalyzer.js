import traverse from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';

// Handle default export for traverse
const traverseDefault = traverse.default || traverse;

export class StructureAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  analyze(ast, filePath) {
    const self = this; // Store reference to this for use in callbacks
    const analysis = {
      componentName: null,
      componentType: null, // 'functional', 'class', 'arrow', 'unknown'
      isPage: false,
      isDefaultExport: false,
      imports: [],
      exports: [],
      jsxElements: {},
      props: {},
      textNodes: 0,
      nestingDepth: 0,
      complexity: 'simple',
      hasState: false,
      hasEffects: false,
      eventHandlers: [],
      hooks: [],
      // Enhanced fields
      propDetails: [],
      classNameValues: [],
      textContent: [],
      customComponents: [],
      htmlElements: {},
      importDetails: [],
      exportDetails: []
    };

    // Check if it's a Next.js page
    const fileName = path.basename(filePath);
    analysis.isPage = fileName === 'page.tsx' || fileName === 'page.jsx' || 
                      fileName === 'page.ts' || fileName === 'page.js' ||
                      filePath.includes('/pages/') || filePath.includes('\\pages\\');

    let maxDepth = 0;
    let currentDepth = 0;
    const elementCount = new Map();
    const propCount = new Map();
    const htmlElementCount = new Map();
    const customComponentSet = new Set();
    const classNameSet = new Set();
    const textSamples = [];

    traverseDefault(ast, {
      // Extract imports
      ImportDeclaration(path) {
        const source = path.node.source.value;
        const importInfo = {
          source: source,
          default: null,
          named: [],
          namespace: null,
          isRelative: source.startsWith('.'),
          isNextJS: source.startsWith('next/'),
          isExternal: !source.startsWith('.') && !source.startsWith('/')
        };

        path.node.specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            importInfo.default = spec.local.name;
          } else if (t.isImportNamespaceSpecifier(spec)) {
            importInfo.namespace = spec.local.name;
          } else if (t.isImportSpecifier(spec)) {
            importInfo.named.push(spec.imported.name || spec.local.name);
          }
        });

        analysis.imports.push(importInfo);
        analysis.importDetails.push(importInfo);
      },

      // Extract exports
      ExportDefaultDeclaration(path) {
        analysis.isDefaultExport = true;
        let exportName = 'Anonymous';
        if (t.isIdentifier(path.node.declaration)) {
          exportName = path.node.declaration.name;
          analysis.componentName = exportName;
        } else if (t.isFunctionDeclaration(path.node.declaration)) {
          exportName = path.node.declaration.id?.name || 'Anonymous';
          analysis.componentName = exportName;
        } else if (t.isClassDeclaration(path.node.declaration)) {
          exportName = path.node.declaration.id?.name || 'Anonymous';
          analysis.componentName = exportName;
        }
        analysis.exportDetails.push({
          name: exportName,
          type: 'default',
          isDefault: true
        });
      },

      ExportNamedDeclaration(path) {
        path.node.specifiers.forEach(spec => {
          if (t.isExportSpecifier(spec)) {
            const exportName = spec.exported.name || spec.local.name;
            analysis.exports.push(exportName);
            analysis.exportDetails.push({
              name: exportName,
              type: 'named',
              isDefault: false
            });
          }
        });
        if (path.node.declaration) {
          if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
            analysis.exportDetails.push({
              name: path.node.declaration.id.name,
              type: 'named',
              isDefault: false
            });
          } else if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach(decl => {
              if (t.isIdentifier(decl.id)) {
                analysis.exportDetails.push({
                  name: decl.id.name,
                  type: 'named',
                  isDefault: false
                });
              }
            });
          }
        }
      },

      // Detect component type
      FunctionDeclaration(path) {
        // Check if function returns JSX
        if (path.node.body && t.isBlockStatement(path.node.body)) {
          let hasJSX = false;
          path.node.body.body.forEach(stmt => {
            if (t.isReturnStatement(stmt) && 
                (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument))) {
              hasJSX = true;
            }
          });
          
          if (hasJSX) {
            analysis.componentName = path.node.id?.name || 'Anonymous';
            analysis.componentType = 'functional';
          }
        }
      },

      VariableDeclarator(path) {
        if (t.isArrowFunctionExpression(path.node.init) || 
            t.isFunctionExpression(path.node.init)) {
          // Check if the function returns JSX
          const funcBody = path.node.init.body;
          let hasJSX = false;
          
          if (t.isBlockStatement(funcBody)) {
            funcBody.body.forEach(stmt => {
              if (t.isReturnStatement(stmt) && 
                  (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument))) {
                hasJSX = true;
              }
            });
          } else if (t.isJSXElement(funcBody) || t.isJSXFragment(funcBody)) {
            hasJSX = true;
          }
          
          if (hasJSX) {
            analysis.componentName = path.node.id?.name || 'Anonymous';
            analysis.componentType = t.isArrowFunctionExpression(path.node.init) 
              ? 'arrow' 
              : 'functional';
          }
        }
      },

      ClassDeclaration(path) {
        if (self.isReactComponent(path)) {
          analysis.componentName = path.node.id?.name || 'Anonymous';
          analysis.componentType = 'class';
        }
      },

      // Detect React hooks
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          const hookName = path.node.callee.name;
          if (hookName.startsWith('use') && hookName !== 'use') {
            analysis.hooks.push(hookName);
            if (hookName === 'useState') {
              analysis.hasState = true;
            }
            if (hookName === 'useEffect' || hookName === 'useLayoutEffect') {
              analysis.hasEffects = true;
            }
          }
        }
      },

      // Analyze JSX elements
      JSXElement(path) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);

        const elementName = self.getJSXElementName(path.node.openingElement.name);
        elementCount.set(elementName, (elementCount.get(elementName) || 0) + 1);

        // Determine if it's a custom component (PascalCase) or HTML element (lowercase)
        const isCustomComponent = /^[A-Z]/.test(elementName) || elementName.includes('.');
        if (isCustomComponent) {
          customComponentSet.add(elementName);
        } else {
          htmlElementCount.set(elementName, (htmlElementCount.get(elementName) || 0) + 1);
        }

        // Extract props/attributes
        path.node.openingElement.attributes.forEach(attr => {
          if (t.isJSXAttribute(attr)) {
            const propName = attr.name.name;
            propCount.set(propName, (propCount.get(propName) || 0) + 1);

            // Extract prop value
            let propValue = null;
            let propType = 'unknown';
            
            if (attr.value) {
              if (t.isStringLiteral(attr.value)) {
                propValue = attr.value.value;
                propType = 'string';
              } else if (t.isJSXExpressionContainer(attr.value)) {
                const expr = attr.value.expression;
                if (t.isStringLiteral(expr)) {
                  propValue = expr.value;
                  propType = 'string';
                } else if (t.isBooleanLiteral(expr)) {
                  propValue = expr.value;
                  propType = 'boolean';
                } else if (t.isNumericLiteral(expr)) {
                  propValue = expr.value;
                  propType = 'number';
                } else if (t.isObjectExpression(expr)) {
                  propType = 'object';
                  propValue = '[object]';
                } else if (t.isArrayExpression(expr)) {
                  propType = 'array';
                  propValue = '[array]';
                } else if (t.isIdentifier(expr)) {
                  propType = 'identifier';
                  propValue = expr.name;
                } else if (t.isFunctionExpression(expr) || t.isArrowFunctionExpression(expr)) {
                  propType = 'function';
                  propValue = '[function]';
                } else {
                  propType = 'expression';
                  propValue = '[expression]';
                }
              } else if (t.isBooleanLiteral(attr.value)) {
                propValue = attr.value.value;
                propType = 'boolean';
              }
            } else {
              // Boolean attribute (e.g., <input disabled />)
              propValue = true;
              propType = 'boolean';
            }

            // Track className values
            if (propName === 'className' && propValue && typeof propValue === 'string') {
              // Split className string by spaces to get individual classes
              const classes = propValue.trim().split(/\s+/).filter(c => c.length > 0);
              classes.forEach(cls => classNameSet.add(cls));
            }

            // Store prop details
            analysis.propDetails.push({
              name: propName,
              type: propType,
              value: propValue,
              element: elementName
            });

            // Track event handlers
            if (propName.startsWith('on') && propName.length > 2) {
              const eventName = propName.charAt(2).toLowerCase() + propName.slice(3);
              if (!analysis.eventHandlers.includes(propName)) {
                analysis.eventHandlers.push(propName);
              }
            }
          }
        });

        path.traverse();
        currentDepth--;
      },

      JSXFragment(path) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
        path.traverse();
        currentDepth--;
      },

      // Count text nodes and extract text content
      JSXText(path) {
        const text = path.node.value.trim();
        if (text.length > 0) {
          analysis.textNodes++;
          // Store text samples (limit to 20 samples, max 50 chars each)
          if (textSamples.length < 20 && text.length > 0) {
            const sample = text.length > 50 ? text.substring(0, 50) + '...' : text;
            textSamples.push(sample);
          }
        }
      },

      JSXExpressionContainer(path) {
        // Count expressions that might contain text
        if (t.isStringLiteral(path.node.expression)) {
          analysis.textNodes++;
          const text = path.node.expression.value.trim();
          if (text.length > 0 && textSamples.length < 20) {
            const sample = text.length > 50 ? text.substring(0, 50) + '...' : text;
            textSamples.push(sample);
          }
        }
      }
    });

    // Convert maps to objects
    analysis.jsxElements = Object.fromEntries(elementCount);
    analysis.props = Object.fromEntries(propCount);
    analysis.htmlElements = Object.fromEntries(htmlElementCount);
    analysis.customComponents = Array.from(customComponentSet);
    analysis.classNameValues = Array.from(classNameSet).sort();
    analysis.textContent = textSamples;
    analysis.nestingDepth = maxDepth;

    // Calculate complexity
    const totalElements = Array.from(elementCount.values()).reduce((a, b) => a + b, 0);
    const totalProps = Array.from(propCount.values()).reduce((a, b) => a + b, 0);
    
    if (totalElements > 20 || maxDepth > 5 || totalProps > 15 || analysis.hooks.length > 3) {
      analysis.complexity = 'complex';
    } else if (totalElements > 10 || maxDepth > 3 || totalProps > 8 || analysis.hooks.length > 1) {
      analysis.complexity = 'moderate';
    } else {
      analysis.complexity = 'simple';
    }

    return analysis;
  }

  isComponent(path) {
    // Check if function returns JSX
    const body = path.node.body || path.node.init?.body;
    if (!body) return false;

    let hasJSX = false;
    if (t.isBlockStatement(body)) {
      // Check for return statement with JSX
      body.body.forEach(stmt => {
        if (t.isReturnStatement(stmt) && 
            (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument))) {
          hasJSX = true;
        }
      });
    } else if (t.isJSXElement(body) || t.isJSXFragment(body)) {
      hasJSX = true;
    }

    return hasJSX;
  }

  isReactComponent(path) {
    // Check if class extends React.Component or Component
    if (!t.isClassDeclaration(path.node)) return false;
    
    if (path.node.superClass) {
      if (t.isMemberExpression(path.node.superClass)) {
        return t.isIdentifier(path.node.superClass.object, { name: 'React' }) &&
               t.isIdentifier(path.node.superClass.property, { name: 'Component' });
      }
      if (t.isIdentifier(path.node.superClass, { name: 'Component' })) {
        return true;
      }
    }
    return false;
  }

  getJSXElementName(name) {
    if (t.isJSXIdentifier(name)) {
      return name.name;
    } else if (t.isJSXMemberExpression(name)) {
      return `${name.object.name}.${name.property.name}`;
    } else if (t.isJSXNamespacedName(name)) {
      return `${name.namespace.name}:${name.name.name}`;
    }
    return 'Unknown';
  }
}

