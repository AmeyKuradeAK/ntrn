import traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverseDefault = traverse.default || traverse;

export class StateAnalyzer {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze React hooks in detail
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @returns {Object} - Hook analysis results
   */
  analyzeHooks(ast, filePath) {
    const self = this;
    const hooks = {
      useState: [],
      useEffect: [],
      useContext: [],
      useRef: [],
      useMemo: [],
      useCallback: [],
      useReducer: [],
      customHooks: []
    };

    const customHookDefinitions = new Map();
    const customHookUsages = [];

    traverseDefault(ast, {
      // Detect custom hook definitions (functions starting with 'use')
      FunctionDeclaration(path) {
        if (path.node.id && path.node.id.name.startsWith('use') && path.node.id.name !== 'use') {
          customHookDefinitions.set(path.node.id.name, {
            name: path.node.id.name,
            definition: {
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0
            }
          });
        }
      },

      VariableDeclarator(path) {
        if (path.node.id && t.isIdentifier(path.node.id)) {
          const varName = path.node.id.name;
          if (varName.startsWith('use') && varName !== 'use' && 
              (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))) {
            customHookDefinitions.set(varName, {
              name: varName,
              definition: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }
        }
      },

      // Analyze useState
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          const hookName = path.node.callee.name;

          if (hookName === 'useState') {
            const args = path.node.arguments;
            const initialValue = args[0] ? self.extractValue(args[0]) : null;
            
            // Find the variable declaration that contains this useState
            let variableName = null;
            let setterName = null;
            let parent = path.parent;
            
            if (t.isVariableDeclarator(parent)) {
              if (t.isArrayPattern(parent.id)) {
                const elements = parent.id.elements;
                if (elements[0] && t.isIdentifier(elements[0])) {
                  variableName = elements[0].name;
                }
                if (elements[1] && t.isIdentifier(elements[1])) {
                  setterName = elements[1].name;
                } else {
                  setterName = `set${variableName ? variableName.charAt(0).toUpperCase() + variableName.slice(1) : 'State'}`;
                }
              } else if (t.isIdentifier(parent.id)) {
                variableName = parent.id.name;
                setterName = `set${variableName.charAt(0).toUpperCase() + variableName.slice(1)}`;
              }
            }

            hooks.useState.push({
              variableName: variableName || 'state',
              setterName: setterName || 'setState',
              initialValue: initialValue,
              type: self.inferType(initialValue),
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useEffect
          else if (hookName === 'useEffect' || hookName === 'useLayoutEffect') {
            const args = path.node.arguments;
            const effectFunction = args[0];
            const dependencies = args[1] ? self.extractDependencies(args[1]) : [];
            let hasCleanup = false;
            let cleanupFunction = null;

            // Check if effect function returns a cleanup function
            if (effectFunction && (t.isArrowFunctionExpression(effectFunction) || t.isFunctionExpression(effectFunction))) {
              const body = effectFunction.body;
              if (t.isBlockStatement(body)) {
                body.body.forEach(stmt => {
                  if (t.isReturnStatement(stmt) && stmt.argument) {
                    hasCleanup = true;
                    if (t.isFunctionExpression(stmt.argument) || t.isArrowFunctionExpression(stmt.argument)) {
                      cleanupFunction = 'cleanup function';
                    }
                  }
                });
              } else if (t.isArrowFunctionExpression(effectFunction) && !t.isBlockStatement(body)) {
                // Arrow function with implicit return - check if it's a function
                if (t.isFunctionExpression(body) || t.isArrowFunctionExpression(body)) {
                  hasCleanup = true;
                  cleanupFunction = 'cleanup function';
                }
              }
            }

            hooks.useEffect.push({
              hookType: hookName,
              dependencies: dependencies,
              hasCleanup: hasCleanup,
              cleanupFunction: cleanupFunction,
              sideEffects: self.detectSideEffects(effectFunction),
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useContext
          else if (hookName === 'useContext') {
            const args = path.node.arguments;
            const contextName = args[0] && t.isIdentifier(args[0]) ? args[0].name : 
                              args[0] && t.isMemberExpression(args[0]) ? 
                              `${args[0].object.name}.${args[0].property.name}` : 'Unknown';

            hooks.useContext.push({
              contextName: contextName,
              consumedValues: [], // Would need deeper analysis to determine
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useRef
          else if (hookName === 'useRef') {
            const args = path.node.arguments;
            const initialValue = args[0] ? self.extractValue(args[0]) : null;
            
            let refName = null;
            let parent = path.parent;
            if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
              refName = parent.id.name;
            }

            hooks.useRef.push({
              refName: refName || 'ref',
              initialValue: initialValue,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useMemo
          else if (hookName === 'useMemo') {
            const args = path.node.arguments;
            const dependencies = args[1] ? self.extractDependencies(args[1]) : [];

            hooks.useMemo.push({
              dependencies: dependencies,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useCallback
          else if (hookName === 'useCallback') {
            const args = path.node.arguments;
            const dependencies = args[1] ? self.extractDependencies(args[1]) : [];

            hooks.useCallback.push({
              dependencies: dependencies,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Analyze useReducer
          else if (hookName === 'useReducer') {
            const args = path.node.arguments;
            const reducer = args[0] ? (t.isIdentifier(args[0]) ? args[0].name : 'reducer') : null;
            const initialState = args[1] ? self.extractValue(args[1]) : null;

            hooks.useReducer.push({
              reducer: reducer,
              initialState: initialState,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }

          // Detect custom hook usage
          else if (hookName.startsWith('use') && hookName !== 'use' && 
                   !['useState', 'useEffect', 'useContext', 'useRef', 'useMemo', 'useCallback', 'useReducer'].includes(hookName)) {
            customHookUsages.push({
              name: hookName,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }
        }
      }
    });

    // Match custom hook usages with definitions
    customHookUsages.forEach(usage => {
      if (customHookDefinitions.has(usage.name)) {
        const def = customHookDefinitions.get(usage.name);
        if (!hooks.customHooks.find(h => h.name === usage.name)) {
          hooks.customHooks.push({
            name: usage.name,
            definition: def.definition,
            usage: [usage.location]
          });
        } else {
          const existing = hooks.customHooks.find(h => h.name === usage.name);
          existing.usage.push(usage.location);
        }
      }
    });

    return hooks;
  }

  /**
   * Analyze component props in detail
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @returns {Object} - Props analysis results
   */
  analyzeProps(ast, filePath) {
    const self = this;
    const props = [];
    const propTypes = new Map();
    const defaultProps = new Map();
    const requiredProps = [];
    let componentFunction = null;

    traverseDefault(ast, {
      // Find component function
      FunctionDeclaration(path) {
        if (self.isComponent(path)) {
          componentFunction = path;
        }
      },

      VariableDeclarator(path) {
        if (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init)) {
          if (self.isComponent(path)) {
            componentFunction = path.node.init;
          }
        }
      },

      // Extract props from function parameters
      Function(path) {
        if (path === componentFunction || (componentFunction && path.node === componentFunction)) {
          const params = path.node.params;
          if (params.length > 0) {
            const firstParam = params[0];
            
            // Handle destructured props: ({ prop1, prop2 }) => {}
            if (t.isObjectPattern(firstParam)) {
              firstParam.properties.forEach(prop => {
                if (t.isObjectProperty(prop)) {
                  const propName = t.isIdentifier(prop.key) ? prop.key.name : 
                                 t.isStringLiteral(prop.key) ? prop.key.value : null;
                  const defaultValue = prop.value && t.isAssignmentPattern(prop.value) ? 
                                     self.extractValue(prop.value.right) : null;
                  
                  if (propName) {
                    const existingProp = props.find(p => p.name === propName);
                    if (!existingProp) {
                      props.push({
                        name: propName,
                        type: 'unknown',
                        required: defaultValue === null,
                        defaultValue: defaultValue,
                        usageLocations: []
                      });

                      if (defaultValue !== null) {
                        defaultProps.set(propName, defaultValue);
                      } else {
                        requiredProps.push(propName);
                      }
                    } else {
                      // Update existing prop
                      if (defaultValue !== null) {
                        existingProp.defaultValue = defaultValue;
                        defaultProps.set(propName, defaultValue);
                      }
                    }
                  }
                } else if (t.isRestElement(prop)) {
                  // Handle rest props: { ...rest }
                  props.push({
                    name: '...rest',
                    type: 'object',
                    required: false,
                    defaultValue: null,
                    usageLocations: []
                  });
                }
              });
            }
            // Handle single prop parameter: (props) => {}
            else if (t.isIdentifier(firstParam)) {
              const existingProp = props.find(p => p.name === firstParam.name);
              if (!existingProp) {
                props.push({
                  name: firstParam.name,
                  type: 'object',
                  required: true,
                  defaultValue: null,
                  usageLocations: []
                });
              }
            }
          }
        }
      },

      // Extract TypeScript prop types from interfaces
      TSInterfaceDeclaration(path) {
        if (path.node.id.name.includes('Props') || path.node.id.name.includes('ComponentProps')) {
          path.node.body.body.forEach(member => {
            if (t.isTSPropertySignature(member)) {
              const propName = t.isIdentifier(member.key) ? member.key.name : null;
              const optional = member.optional || false;
              const typeAnnotation = member.typeAnnotation ? 
                                   self.extractTypeScriptType(member.typeAnnotation.typeAnnotation) : 'unknown';

              if (propName) {
                const existingProp = props.find(p => p.name === propName);
                if (existingProp) {
                  existingProp.type = typeAnnotation;
                  existingProp.required = !optional && existingProp.required;
                } else {
                  props.push({
                    name: propName,
                    type: typeAnnotation,
                    required: !optional,
                    defaultValue: null,
                    usageLocations: []
                  });
                }

                propTypes.set(propName, typeAnnotation);
                if (!optional && !requiredProps.includes(propName)) {
                  requiredProps.push(propName);
                }
              }
            }
          });
        }
      },

      // Extract PropTypes
      MemberExpression(path) {
        if (t.isIdentifier(path.node.object) && 
            (path.node.object.name === 'Component' || path.node.object.name.includes('Component')) &&
            t.isIdentifier(path.node.property) && 
            path.node.property.name === 'propTypes') {
          // PropTypes definition found - would need deeper analysis
        }
      }
    });

    return {
      props: props,
      propTypes: Object.fromEntries(propTypes),
      defaultProps: Object.fromEntries(defaultProps),
      requiredProps: requiredProps
    };
  }

  /**
   * Analyze state variables and their usage
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @param {Object} hooks - Hook analysis results
   * @returns {Object} - State variable analysis
   */
  analyzeStateVariables(ast, filePath, hooks) {
    const self = this;
    const stateVars = [];
    const readLocations = new Map();
    const updateLocations = new Map();
    const passedAsProps = [];

    // Build state variable map from useState hooks
    hooks.useState.forEach(useStateHook => {
      const varName = useStateHook.variableName;
      const setterName = useStateHook.setterName;

      stateVars.push({
        name: varName,
        initialValue: useStateHook.initialValue,
        type: useStateHook.type,
        setterName: setterName,
        readLocations: [],
        updateLocations: [],
        passedAsProps: []
      });

      readLocations.set(varName, []);
      updateLocations.set(setterName, []);
    });

    // Track state variable usage
    traverseDefault(ast, {
      Identifier(path) {
        const name = path.node.name;
        
        // Track reads
        if (readLocations.has(name)) {
          const reads = readLocations.get(name);
          reads.push({
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            context: self.getContext(path)
          });
        }

        // Track updates (setState calls)
        if (updateLocations.has(name)) {
          const updates = updateLocations.get(name);
          if (t.isCallExpression(path.parent) && path.parent.callee === path.node) {
            updates.push({
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              context: self.getContext(path)
            });
          }
        }
      },

      // Track state passed as props
      JSXAttribute(path) {
        if (t.isJSXIdentifier(path.node.name)) {
          const propName = path.node.name.name;
          if (path.node.value && t.isJSXExpressionContainer(path.node.value)) {
            const expr = path.node.value.expression;
            if (t.isIdentifier(expr)) {
              const stateVar = stateVars.find(sv => sv.name === expr.name);
              if (stateVar) {
                const parentPath = path.findParent(p => t.isJSXElement(p.node));
                const parentElement = parentPath ? self.getJSXElementName(parentPath.node.openingElement.name) : 'unknown';
                passedAsProps.push({
                  stateVar: stateVar.name,
                  component: parentElement,
                  propName: propName
                });
              }
            }
          }
        }
      }
    });

    // Update stateVars with tracked locations
    stateVars.forEach(stateVar => {
      stateVar.readLocations = readLocations.get(stateVar.name) || [];
      stateVar.updateLocations = updateLocations.get(stateVar.setterName) || [];
      stateVar.passedAsProps = passedAsProps.filter(pp => pp.stateVar === stateVar.name);
    });

    return {
      stateVars: stateVars,
      readLocations: Object.fromEntries(readLocations),
      updateLocations: Object.fromEntries(updateLocations),
      passedAsProps: passedAsProps
    };
  }

  /**
   * Analyze event handlers
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @param {Object} stateVars - State variable analysis
   * @returns {Object} - Event handler analysis
   */
  analyzeEventHandlers(ast, filePath, stateVars) {
    const self = this;
    const handlers = [];
    const handlerChains = [];
    const actions = [];

    const stateVarNames = new Set(stateVars.stateVars.map(sv => sv.name));
    const setterNames = new Set(stateVars.stateVars.map(sv => sv.setterName));

    traverseDefault(ast, {
      // Find event handler attributes in JSX
      JSXAttribute(path) {
        if (t.isJSXIdentifier(path.node.name) && path.node.name.name.startsWith('on') && 
            path.node.name.name.length > 2) {
          const eventType = path.node.name.name;
          let handlerName = null;
          let handlerFunction = null;

          if (path.node.value) {
            if (t.isJSXExpressionContainer(path.node.value)) {
              const expr = path.node.value.expression;
              if (t.isIdentifier(expr)) {
                handlerName = expr.name;
              } else if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
                handlerFunction = expr;
                handlerName = 'inline';
              }
            }
          }

          if (handlerName || handlerFunction) {
            const usesState = [];
            const usesHooks = [];
            const handlerActions = [];

            // Analyze handler function if we have it
            if (handlerFunction) {
              self.analyzeHandlerFunction(handlerFunction, stateVarNames, setterNames, usesState, usesHooks, handlerActions);
            } else if (handlerName) {
              // Find handler function definition
              const handlerDef = self.findFunctionDefinition(ast, handlerName);
              if (handlerDef) {
                self.analyzeHandlerFunction(handlerDef, stateVarNames, setterNames, usesState, usesHooks, handlerActions);
              }
            }

            handlers.push({
              name: handlerName || eventType,
              eventType: eventType,
              usesState: usesState,
              usesHooks: usesHooks,
              actions: handlerActions,
              location: {
                line: path.node.loc?.start.line || 0,
                column: path.node.loc?.start.column || 0
              }
            });
          }
        }
      }
    });

    return {
      handlers: handlers,
      handlerChains: handlerChains,
      actions: actions
    };
  }

  /**
   * Analyze component composition
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @param {Object} graph - Dependency graph
   * @returns {Object} - Component composition analysis
   */
  analyzeComponentComposition(ast, filePath, graph) {
    const self = this;
    const renderedComponents = [];
    const propsFlow = [];
    const callbacks = [];

    traverseDefault(ast, {
      JSXElement(path) {
        const elementName = self.getJSXElementName(path.node.openingElement.name);
        
        // Check if it's a custom component (PascalCase)
        if (/^[A-Z]/.test(elementName) || elementName.includes('.')) {
          const componentProps = new Map();
          const componentCallbacks = [];

          path.node.openingElement.attributes.forEach(attr => {
            if (t.isJSXAttribute(attr)) {
              const propName = attr.name.name;
              let propValue = null;

              if (attr.value) {
                if (t.isStringLiteral(attr.value)) {
                  propValue = attr.value.value;
                } else if (t.isJSXExpressionContainer(attr.value)) {
                  const expr = attr.value.expression;
                  if (t.isStringLiteral(expr)) {
                    propValue = expr.value;
                  } else if (t.isIdentifier(expr)) {
                    propValue = expr.name;
                  } else if (t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) {
                    propValue = '[function]';
                    componentCallbacks.push(propName);
                  }
                } else if (t.isBooleanLiteral(attr.value)) {
                  propValue = attr.value.value;
                }
              } else {
                propValue = true; // Boolean attribute
              }

              componentProps.set(propName, propValue);
            }
          });

          renderedComponents.push({
            componentName: elementName,
            props: Object.fromEntries(componentProps),
            callbacks: componentCallbacks
          });

          propsFlow.push({
            toComponent: elementName,
            props: Object.fromEntries(componentProps)
          });

          if (componentCallbacks.length > 0) {
            callbacks.push({
              toComponent: elementName,
              callbacks: componentCallbacks
            });
          }
        }
      }
    });

    return {
      renderedComponents: renderedComponents,
      propsFlow: propsFlow,
      callbacks: callbacks
    };
  }

  /**
   * Analyze lifecycle methods in class components
   * @param {Object} ast - AST from Babel parser
   * @param {string} filePath - File path
   * @returns {Object} - Lifecycle method analysis
   */
  analyzeLifecycleMethods(ast, filePath) {
    const self = this;
    const lifecycleMethods = [];
    let constructor = null;

    const LIFECYCLE_METHODS = [
      'componentDidMount',
      'componentDidUpdate',
      'componentWillUnmount',
      'componentWillMount',
      'componentWillUpdate',
      'componentWillReceiveProps',
      'shouldComponentUpdate',
      'getSnapshotBeforeUpdate'
    ];

    traverseDefault(ast, {
      ClassMethod(path) {
        const methodName = t.isIdentifier(path.node.key) ? path.node.key.name : null;
        
        if (methodName === 'constructor') {
          constructor = {
            hasStateInit: false,
            stateInit: null,
            location: {
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0
            }
          };

          // Check for state initialization
          if (t.isBlockStatement(path.node.body)) {
            path.node.body.body.forEach(stmt => {
              if (t.isExpressionStatement(stmt) && t.isAssignmentExpression(stmt.expression)) {
                if (t.isMemberExpression(stmt.expression.left) &&
                    t.isThisExpression(stmt.expression.left.object) &&
                    t.isIdentifier(stmt.expression.left.property) &&
                    stmt.expression.left.property.name === 'state') {
                  constructor.hasStateInit = true;
                  constructor.stateInit = self.extractValue(stmt.expression.right);
                }
              }
            });
          }
        } else if (methodName && LIFECYCLE_METHODS.includes(methodName)) {
          lifecycleMethods.push({
            name: methodName,
            location: {
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0
            }
          });
        }
      }
    });

    return {
      lifecycleMethods: lifecycleMethods,
      constructor: constructor
    };
  }

  // Helper methods

  extractValue(node) {
    if (t.isStringLiteral(node)) return node.value;
    if (t.isNumericLiteral(node)) return node.value;
    if (t.isBooleanLiteral(node)) return node.value;
    if (t.isNullLiteral(node)) return null;
    if (t.isArrayExpression(node)) return '[]';
    if (t.isObjectExpression(node)) return '{}';
    if (t.isIdentifier(node)) return node.name;
    if (t.isCallExpression(node) && t.isIdentifier(node.callee)) {
      return `${node.callee.name}()`;
    }
    return '[expression]';
  }

  extractDependencies(node) {
    if (t.isArrayExpression(node)) {
      return node.elements
        .filter(el => el !== null)
        .map(el => {
          if (t.isIdentifier(el)) return el.name;
          if (t.isStringLiteral(el)) return el.value;
          return '[dependency]';
        });
    }
    return [];
  }

  extractTypeScriptType(typeAnnotation) {
    if (t.isTSTypeReference(typeAnnotation) && t.isIdentifier(typeAnnotation.typeName)) {
      return typeAnnotation.typeName.name;
    }
    if (t.isTSStringKeyword(typeAnnotation)) return 'string';
    if (t.isTSNumberKeyword(typeAnnotation)) return 'number';
    if (t.isTSBooleanKeyword(typeAnnotation)) return 'boolean';
    if (t.isTSArrayType(typeAnnotation)) return 'array';
    if (t.isTSFunctionType(typeAnnotation)) return 'function';
    return 'unknown';
  }

  inferType(value) {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value === '[]') return 'array';
    if (value === '{}') return 'object';
    return 'unknown';
  }

  detectSideEffects(effectFunction) {
    const sideEffects = [];
    if (!effectFunction) return sideEffects;

    const checkNode = (node) => {
      if (t.isCallExpression(node)) {
        if (t.isIdentifier(node.callee)) {
          const calleeName = node.callee.name.toLowerCase();
          if (calleeName.includes('fetch') || calleeName.includes('api') || calleeName.includes('axios')) {
            sideEffects.push('api-call');
          }
          if (calleeName.includes('router') || calleeName.includes('navigate')) {
            sideEffects.push('navigation');
          }
          if (calleeName.includes('set') && calleeName.includes('state')) {
            sideEffects.push('state-update');
          }
        }
      }
    };

    if (t.isArrowFunctionExpression(effectFunction) || t.isFunctionExpression(effectFunction)) {
      const body = effectFunction.body;
      if (t.isBlockStatement(body)) {
        body.body.forEach(stmt => {
          if (t.isExpressionStatement(stmt)) {
            checkNode(stmt.expression);
          }
        });
      } else {
        checkNode(body);
      }
    }

    return sideEffects;
  }

  isComponent(path) {
    const body = path.node.body || path.node.init?.body;
    if (!body) return false;

    let hasJSX = false;
    if (t.isBlockStatement(body)) {
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

  getContext(path) {
    // Try to determine context (JSX, function call, etc.)
    let parent = path.parent;
    let depth = 0;
    while (parent && depth < 5) {
      if (t.isJSXElement(parent.node) || t.isJSXExpressionContainer(parent.node)) {
        return 'JSX';
      }
      if (t.isCallExpression(parent.node)) {
        return 'function call';
      }
      if (t.isConditionalExpression(parent.node)) {
        return 'conditional';
      }
      parent = parent.parent;
      depth++;
    }
    return 'unknown';
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

  analyzeHandlerFunction(handlerFunction, stateVarNames, setterNames, usesState, usesHooks, handlerActions) {
    if (!handlerFunction) return;

    const body = handlerFunction.body;
    if (!body) return;

    const checkNode = (node) => {
      if (t.isIdentifier(node)) {
        if (stateVarNames.has(node.name)) {
          usesState.push(node.name);
        }
        if (setterNames.has(node.name)) {
          handlerActions.push('setState');
        }
      }
      if (t.isCallExpression(node)) {
        if (t.isIdentifier(node.callee)) {
          const calleeName = node.callee.name.toLowerCase();
          if (calleeName.includes('fetch') || calleeName.includes('api')) {
            handlerActions.push('apiCall');
          }
          if (calleeName.includes('router') || calleeName.includes('navigate')) {
            handlerActions.push('navigation');
          }
        }
      }
    };

    if (t.isBlockStatement(body)) {
      body.body.forEach(stmt => {
        if (t.isExpressionStatement(stmt)) {
          checkNode(stmt.expression);
        } else if (t.isVariableDeclaration(stmt)) {
          stmt.declarations.forEach(decl => {
            if (decl.init) checkNode(decl.init);
          });
        }
      });
    } else {
      checkNode(body);
    }
  }

  findFunctionDefinition(ast, functionName) {
    let found = null;
    traverseDefault(ast, {
      FunctionDeclaration(path) {
        if (t.isIdentifier(path.node.id) && path.node.id.name === functionName) {
          found = path.node;
        }
      },
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && path.node.id.name === functionName &&
            (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))) {
          found = path.node.init;
        }
      }
    });
    return found;
  }
}

