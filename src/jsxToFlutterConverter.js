import traverse from '@babel/traverse';
import * as t from '@babel/types';

const traverseDefault = traverse.default || traverse;

// Element mappings: HTML elements to Flutter widgets
const ELEMENT_MAPPINGS = {
  // Containers
  'div': { widget: 'Container', defaultChild: true },
  'section': { widget: 'Container', defaultChild: true },
  'main': { widget: 'Scaffold', defaultChild: false },
  'article': { widget: 'Container', defaultChild: true },
  'header': { widget: 'Container', defaultChild: true },
  'footer': { widget: 'Container', defaultChild: true },
  'nav': { widget: 'Container', defaultChild: true },
  
  // Buttons
  'button': { widget: 'ElevatedButton', defaultChild: false },
  
  // Inputs
  'input': { widget: 'TextField', defaultChild: false },
  'textarea': { widget: 'TextField', defaultChild: false, multiline: true },
  
  // Images
  'img': { widget: 'Image', defaultChild: false },
  
  // Links
  'a': { widget: 'GestureDetector', defaultChild: true, navigation: true },
  
  // Text
  'p': { widget: 'Text', defaultChild: false },
  'h1': { widget: 'Text', defaultChild: false, style: 'headlineLarge' },
  'h2': { widget: 'Text', defaultChild: false, style: 'headlineMedium' },
  'h3': { widget: 'Text', defaultChild: false, style: 'headlineSmall' },
  'h4': { widget: 'Text', defaultChild: false, style: 'titleLarge' },
  'h5': { widget: 'Text', defaultChild: false, style: 'titleMedium' },
  'h6': { widget: 'Text', defaultChild: false, style: 'titleSmall' },
  'span': { widget: 'Text', defaultChild: false },
  'strong': { widget: 'Text', defaultChild: false, style: 'bold' },
  'em': { widget: 'Text', defaultChild: false, style: 'italic' },
  
  // Lists
  'ul': { widget: 'ListView', defaultChild: false },
  'ol': { widget: 'ListView', defaultChild: false },
  'li': { widget: 'ListTile', defaultChild: true },
  
  // Forms
  'form': { widget: 'Form', defaultChild: true },
  'label': { widget: 'Text', defaultChild: false },
  
  // Layout (basic - advanced in v0.9)
  'br': { widget: 'SizedBox', defaultChild: false, height: 10 },
  'hr': { widget: 'Divider', defaultChild: false },
};

/**
 * Create a widget tree node
 */
function createWidgetNode(name, properties = [], comments = [], children = null) {
  return {
    type: 'widget',
    name: name,
    properties: properties, // Array of { key, value, isComment }
    comments: comments, // Array of comment strings
    children: children // For arrays like children: [...]
  };
}

/**
 * Create a property node
 */
function createPropertyNode(key, value, isComment = false) {
  return {
    key: key,
    value: value, // Can be widget node, string, or array
    isComment: isComment
  };
}

export class JSXToFlutterConverter {
  constructor() {
    this.indentLevel = 0;
    this.indentSize = 2;
    this.customComponents = new Set();
    this.imports = new Set(['package:flutter/material.dart']);
  }

  /**
   * Main entry point: Convert a React component to Flutter widget
   */
  convertComponent(ast, filePath, structureAnalysis) {
    this.customComponents.clear();
    this.imports.clear();
    this.imports.add('package:flutter/material.dart');
    
    const componentName = structureAnalysis?.componentName || 'Component';
    const componentType = structureAnalysis?.componentType || 'functional';
    
    // Find the component's return statement (JSX)
    let jsxNode = null;
    const self = this;
    
    // First, try to find by component name
    if (componentName) {
      traverseDefault(ast, {
        FunctionDeclaration(path) {
          if (path.node.id?.name === componentName) {
            const body = path.node.body;
            if (t.isBlockStatement(body)) {
              // Find return statement
              for (const stmt of body.body) {
                if (t.isReturnStatement(stmt) && stmt.argument) {
                  jsxNode = stmt.argument;
                  path.stop();
                  break;
                }
              }
            }
          }
        },
        VariableDeclarator(path) {
          if (path.node.id?.name === componentName && path.node.init) {
            const init = path.node.init;
            if (t.isArrowFunctionExpression(init)) {
              if (t.isJSXElement(init.body) || t.isJSXFragment(init.body)) {
                jsxNode = init.body;
                path.stop();
              } else if (t.isBlockStatement(init.body)) {
                for (const stmt of init.body.body) {
                  if (t.isReturnStatement(stmt) && stmt.argument) {
                    jsxNode = stmt.argument;
                    path.stop();
                    break;
                  }
                }
              }
            }
          }
        }
      });
    }

    // If no JSX found, try to find default export
    if (!jsxNode) {
      traverseDefault(ast, {
        ExportDefaultDeclaration(path) {
          const decl = path.node.declaration;
          if (t.isFunctionDeclaration(decl)) {
            const body = decl.body;
            if (t.isBlockStatement(body)) {
              for (const stmt of body.body) {
                if (t.isReturnStatement(stmt) && stmt.argument) {
                  jsxNode = stmt.argument;
                  path.stop();
                  break;
                }
              }
            }
          } else if (t.isArrowFunctionExpression(decl)) {
            if (t.isJSXElement(decl.body) || t.isJSXFragment(decl.body)) {
              jsxNode = decl.body;
              path.stop();
            } else if (t.isBlockStatement(decl.body)) {
              for (const stmt of decl.body.body) {
                if (t.isReturnStatement(stmt) && stmt.argument) {
                  jsxNode = stmt.argument;
                  path.stop();
                  break;
                }
              }
            }
          } else if (t.isIdentifier(decl)) {
            // Default export of a variable/function name
            const varName = decl.name;
            traverseDefault(ast, {
              FunctionDeclaration(p) {
                if (p.node.id?.name === varName) {
                  const body = p.node.body;
                  if (t.isBlockStatement(body)) {
                    for (const stmt of body.body) {
                      if (t.isReturnStatement(stmt) && stmt.argument) {
                        jsxNode = stmt.argument;
                        p.stop();
                        break;
                      }
                    }
                  }
                }
              },
              VariableDeclarator(p) {
                if (p.node.id?.name === varName && p.node.init) {
                  const init = p.node.init;
                  if (t.isArrowFunctionExpression(init)) {
                    if (t.isJSXElement(init.body) || t.isJSXFragment(init.body)) {
                      jsxNode = init.body;
                      p.stop();
                    }
                  }
                }
              }
            });
          }
        }
      });
    }

    // Last resort: find any JSX element in the file
    if (!jsxNode) {
      traverseDefault(ast, {
        JSXElement(path) {
          jsxNode = path.node;
          path.stop();
        },
        JSXFragment(path) {
          jsxNode = path.node;
          path.stop();
        }
      });
    }

    // Convert JSX to Flutter widget tree
    let widgetTree = createWidgetNode('Scaffold', [
      createPropertyNode('body', createWidgetNode('Center', [
        createPropertyNode('child', createWidgetNode('Text', [], [], ['"No content found"']))
      ]))
    ]);
    
    if (jsxNode) {
      if (t.isJSXElement(jsxNode) || t.isJSXFragment(jsxNode)) {
        widgetTree = this.convertJSXNodeToTree(jsxNode);
      }
    }

    // Extract props from component
    const props = this.extractProps(ast, componentName);
    const propsCode = this.generatePropsCode(props);

    // Generate full widget class
    const className = this.toPascalCase(componentName);
    const importsCode = Array.from(this.imports).sort()
      .map(imp => imp.startsWith('import ') ? imp : `import '${imp}';`)
      .join('\n');
    
    // Format widget tree to Dart code
    const formattedWidgetCode = this.formatWidgetTree(widgetTree, 4);
    
    // Format constructor properly
    let constructorLine = '';
    if (propsCode) {
      if (propsCode.includes('\n')) {
        // Multi-line props
        constructorLine = `const ${className}({\n    ${propsCode}super.key,\n  });`;
      } else {
        // Single-line props
        constructorLine = `const ${className}({${propsCode}super.key});`;
      }
    } else {
      constructorLine = `const ${className}({super.key});`;
    }
    
    return `${importsCode}

class ${className} extends StatelessWidget {
  ${constructorLine}

  @override
  Widget build(BuildContext context) {
    return ${formattedWidgetCode};
  }
}
`;
  }

  /**
   * Convert JSX node (element or fragment) to Flutter widget tree
   */
  convertJSXNodeToTree(node) {
    if (t.isJSXElement(node)) {
      return this.convertJSXElementToTree(node);
    } else if (t.isJSXFragment(node)) {
      return this.convertJSXFragmentToTree(node);
    } else if (t.isStringLiteral(node)) {
      return createWidgetNode('Text', [], [], [node.value]);
    }
    return createWidgetNode('Container', [], ['// TODO: Convert expression']);
  }

  /**
   * Convert JSX element to Flutter widget tree
   */
  convertJSXElementToTree(jsxNode) {
    const openingElement = jsxNode.openingElement;
    const elementName = openingElement.name.name;
    const mapping = ELEMENT_MAPPINGS[elementName];
    
    // Parse attributes to separate comments and properties
    const { properties: attrProperties, comments: attrComments } = this.parseJSXAttributes(openingElement.attributes, elementName);
    
    // Convert children to widget trees
    const childrenTrees = this.convertChildrenToTree(jsxNode.children, false);
    
    // Check if it's a custom component (PascalCase)
    if (!mapping && /^[A-Z]/.test(elementName)) {
      this.customComponents.add(elementName);
      const widgetName = this.toPascalCase(elementName);
      const properties = [...attrProperties];
      const comments = [...attrComments];
      
      // Add children as property
      if (childrenTrees.length > 0) {
        if (childrenTrees.length === 1) {
          properties.push(createPropertyNode('child', childrenTrees[0]));
        } else {
          const columnNode = createWidgetNode('Column', [
            createPropertyNode('mainAxisSize', 'MainAxisSize.min')
          ], [], childrenTrees);
          properties.push(createPropertyNode('child', columnNode));
        }
      }
      
      return createWidgetNode(widgetName, properties, comments);
    }

    // HTML element mapping
    if (!mapping) {
      // Unknown element, use Container as fallback
      const properties = [...attrProperties];
      const comments = [...attrComments];
      
      if (childrenTrees.length > 0) {
        if (childrenTrees.length === 1) {
          properties.push(createPropertyNode('child', childrenTrees[0]));
        } else {
          const columnNode = createWidgetNode('Column', [], [], childrenTrees);
          properties.push(createPropertyNode('child', columnNode));
        }
      }
      
      return createWidgetNode('Container', properties, comments);
    }

    const { widget, defaultChild, style, multiline, navigation, height } = mapping;
    const properties = [...attrProperties];
    const comments = [...attrComments];

    // Add style for text elements
    if (style && widget === 'Text') {
      properties.push(createPropertyNode('style', `Theme.of(context).textTheme.${style}`));
    }

    // Add multiline for textarea
    if (multiline) {
      properties.push(createPropertyNode('maxLines', 'null'));
    }

    // Add height for br
    if (height !== undefined) {
      properties.push(createPropertyNode('height', height.toString()));
    }

    // Handle children (skip for Text widget - handled above)
    if (childrenTrees.length > 0 && widget !== 'Text') {
      if (defaultChild) {
        if (childrenTrees.length === 1) {
          properties.push(createPropertyNode('child', childrenTrees[0]));
        } else {
          const layoutType = this.detectLayoutType(jsxNode);
          const layoutWidget = layoutType === 'row' ? 'Row' : 'Column';
          const layoutNode = createWidgetNode(layoutWidget, [
            createPropertyNode('mainAxisSize', 'MainAxisSize.min')
          ], [], childrenTrees);
          properties.push(createPropertyNode('child', layoutNode));
        }
      } else if (widget === 'Text') {
        // Text widget uses data parameter, not child
        // Convert children to text strings
        const textChildren = this.convertChildrenToTree(jsxNode.children, true);
        let textContent = '';
        if (textChildren.length > 0) {
          textContent = textChildren.map(c => typeof c === 'string' ? c : '').join(' ').trim();
        }
        if (!textContent) {
          textContent = "''";
        }
        properties.unshift(createPropertyNode('data', textContent));
      } else if (widget === 'ElevatedButton' || widget === 'TextButton' || widget === 'IconButton') {
        // Buttons use child
        if (childrenTrees.length === 1) {
          properties.push(createPropertyNode('child', childrenTrees[0]));
        } else {
          const rowNode = createWidgetNode('Row', [
            createPropertyNode('mainAxisSize', 'MainAxisSize.min')
          ], [], childrenTrees);
          properties.push(createPropertyNode('child', rowNode));
        }
      } else if (widget === 'ListView') {
        properties.push(createPropertyNode('children', childrenTrees));
      } else if (widget === 'GestureDetector' && navigation) {
        // Links need navigation
        if (childrenTrees.length > 0) {
          if (childrenTrees.length === 1) {
            properties.push(createPropertyNode('child', childrenTrees[0]));
          } else {
            const columnNode = createWidgetNode('Column', [], [], childrenTrees);
            properties.push(createPropertyNode('child', columnNode));
          }
          properties.push(createPropertyNode('onTap', '() { /* TODO: Navigate */ }'));
        }
      }
    }

    return createWidgetNode(widget, properties, comments);
  }

  /**
   * Convert JSX element to Flutter widget (legacy - kept for compatibility)
   * @deprecated Use convertJSXElementToTree instead
   */
  convertJSXElement(jsxNode) {
    const openingElement = jsxNode.openingElement;
    const elementName = openingElement.name.name;
    const mapping = ELEMENT_MAPPINGS[elementName];
    
    // Check if it's a custom component (PascalCase)
    if (!mapping && /^[A-Z]/.test(elementName)) {
      this.customComponents.add(elementName);
      const widgetName = this.toPascalCase(elementName);
      const children = this.convertChildren(jsxNode.children, false);
      const props = this.convertJSXAttributes(openingElement.attributes, elementName);
      
      // Build custom component call
      const properties = [];
      if (props && props.trim()) {
        properties.push(props);
      }
      if (children.length > 0) {
        if (children.length === 1) {
          properties.push(`child: ${children[0]}`);
        } else {
          const childrenList = children.join(', ');
          properties.push(`child: Column(children: [${childrenList}])`);
        }
      }
      
      if (properties.length > 0) {
        // Join properties with commas - ensure proper comma placement
        const propsString = properties.join(', ');
        return `${widgetName}(${propsString})`;
      }
      return `${widgetName}()`;
    }

    // HTML element mapping
    if (!mapping) {
      // Unknown element, use Container as fallback
      const children = this.convertChildren(jsxNode.children);
      const props = this.convertJSXAttributes(openingElement.attributes);
      
      const properties = [];
      if (props && props.trim()) {
        properties.push(props);
      }
      
      if (children.length > 0) {
        if (children.length === 1) {
          properties.push(`child: ${children[0]}`);
        } else {
          const childrenList = children.join(', ');
          properties.push(`child: Column(children: [${childrenList}])`);
        }
      }
      
      if (properties.length > 0) {
        return `Container(${properties.join(', ')})`;
      }
      return `Container()`;
    }

    const { widget, defaultChild, style, multiline, navigation, height } = mapping;
    const attributes = this.convertJSXAttributes(openingElement.attributes, elementName);
    const isTextWidget = widget === 'Text';
    const children = this.convertChildren(jsxNode.children, isTextWidget);

    // Build widget code
    let widgetCode = widget;
    const properties = [];

    // Add style for text elements
    if (style) {
      if (widget === 'Text') {
        properties.push(`style: Theme.of(context).textTheme.${style}`);
      }
    }

    // Add multiline for textarea
    if (multiline) {
      properties.push('maxLines: null');
    }

    // Add height for br
    if (height !== undefined) {
      properties.push(`height: ${height}`);
    }

    // Add attributes
    if (attributes && attributes.trim()) {
      properties.push(attributes);
    }

    // Handle children
    if (children.length > 0) {
      if (defaultChild && widget !== 'Text') {
        if (children.length === 1) {
          properties.push(`child: ${children[0]}`);
        } else {
          // Multiple children need Column or Row
          const layoutType = this.detectLayoutType(jsxNode);
          const layoutWidget = layoutType === 'row' ? 'Row' : 'Column';
          const childrenList = children.join(', ');
          properties.push(`child: ${layoutWidget}(mainAxisSize: MainAxisSize.min, children: [${childrenList}])`);
        }
      } else if (widget === 'Text') {
        // Text widget uses data parameter, not child
        if (children.length > 0) {
          // Children are already strings (from convertChildren with isTextParent=true)
          const textContent = children.join(' ');
          properties.unshift(textContent);
        } else {
          properties.unshift("''");
        }
      } else if (widget === 'ElevatedButton' || widget === 'TextButton' || widget === 'IconButton') {
        // Buttons use child
        if (children.length === 1) {
          properties.push(`child: ${children[0]}`);
        } else {
          const childrenList = children.join(', ');
          properties.push(`child: Row(mainAxisSize: MainAxisSize.min, children: [${childrenList}])`);
        }
      } else if (widget === 'ListView') {
        const childrenList = children.join(', ');
        properties.push(`children: [${childrenList}]`);
      } else if (widget === 'GestureDetector' && navigation) {
        // Links need navigation
        if (children.length > 0) {
          if (children.length === 1) {
            properties.push(`child: ${children[0]}`);
          } else {
            const childrenList = children.join(', ');
            properties.push(`child: Column(children: [${childrenList}])`);
          }
          properties.push(`onTap: () { /* TODO: Navigate */ }`);
        }
      }
    }

    // Build final widget code
    if (properties.length > 0) {
      // Join properties with commas - ensure proper comma placement
      const propsString = properties.join(', ');
      widgetCode += `(${propsString})`;
    }

    return widgetCode;
  }

  /**
   * Convert JSX attributes to Flutter properties
   */
  convertJSXAttributes(attributes, elementName = '') {
    const props = [];
    
    for (const attr of attributes) {
      if (!t.isJSXAttribute(attr)) continue;
      
      const attrName = attr.name.name;
      const rawAttrValue = attr.value;
      const attrValue = this.getJSXAttributeValue(rawAttrValue);

      // onClick → onPressed / onTap
      if (attrName === 'onClick') {
        if (elementName === 'button') {
          props.push('onPressed: () { /* TODO: Implement handler */ }');
        } else {
          props.push('onTap: () { /* TODO: Implement handler */ }');
        }
        continue;
      }

      // onChange → onChanged
      if (attrName === 'onChange') {
        props.push('onChanged: (value) { /* TODO: Implement handler */ }');
        continue;
      }

      // onSubmit → onSubmitted
      if (attrName === 'onSubmit') {
        props.push('onSubmitted: (value) { /* TODO: Implement handler */ }');
        continue;
      }

      // value → controller or property
      if (attrName === 'value') {
        if (elementName === 'input' || elementName === 'textarea') {
          props.push('// TODO: Use TextEditingController for value');
        } else {
          const valueStr = this.expressionToString(attrValue);
          props.push(`value: /* TODO: Convert ${valueStr} */`);
        }
        continue;
      }

      // disabled → enabled
      if (attrName === 'disabled') {
        props.push('enabled: false');
        continue;
      }

      // className → comment (for v0.9)
      if (attrName === 'className') {
        let classNameValue = '';
        
        // Helper to extract string from expression
        const extractString = (expr) => {
          if (t.isStringLiteral(expr)) return expr.value;
          if (t.isTemplateLiteral(expr)) {
            const parts = expr.quasis.map(q => q.value.raw).filter(Boolean);
            return parts.join(' ');
          }
          if (t.isBinaryExpression(expr) && expr.operator === '+') {
            const left = extractString(expr.left);
            const right = extractString(expr.right);
            return (left + ' ' + right).trim();
          }
          return '';
        };
        
        if (t.isStringLiteral(attrValue)) {
          classNameValue = attrValue.value;
        } else if (t.isTemplateLiteral(attrValue)) {
          // Try to extract string parts from template literal
          const parts = attrValue.quasis.map(q => q.value.raw).filter(Boolean);
          classNameValue = parts.join(' ') || this.expressionToString(attrValue);
        } else if (t.isBinaryExpression(attrValue) && attrValue.operator === '+') {
          // Handle string concatenation - recursively extract
          classNameValue = extractString(attrValue);
          if (!classNameValue) {
            classNameValue = this.expressionToString(attrValue);
          }
        } else {
          classNameValue = this.expressionToString(attrValue);
        }
        
        // Limit length to avoid extremely long comments
        if (classNameValue.length > 100) {
          classNameValue = classNameValue.substring(0, 97) + '...';
        }
        
        props.push(`// TODO: Apply className: ${classNameValue} (v0.9 styling)`);
        continue;
      }

      // id → key (optional)
      if (attrName === 'id') {
        if (t.isStringLiteral(attrValue)) {
          props.push(`key: ValueKey('${attrValue.value}')`);
        } else {
          const idValue = this.expressionToString(attrValue);
          props.push(`// TODO: Convert id: ${idValue}`);
        }
        continue;
      }

      // type (for input)
      if (attrName === 'type' && elementName === 'input') {
        if (t.isStringLiteral(attrValue)) {
          const typeValue = attrValue.value;
          if (typeValue === 'password') {
            props.push('obscureText: true');
          } else if (typeValue === 'email') {
            props.push('keyboardType: TextInputType.emailAddress');
          } else if (typeValue === 'number') {
            props.push('keyboardType: TextInputType.number');
          }
        }
        continue;
      }

      // src (for img)
      if (attrName === 'src' && elementName === 'img') {
        if (t.isStringLiteral(attrValue)) {
          const srcValue = attrValue.value;
          if (srcValue.startsWith('http://') || srcValue.startsWith('https://')) {
            props.push(`image: NetworkImage('${srcValue}')`);
          } else {
            props.push(`image: AssetImage('${srcValue}')`);
          }
        } else {
          const srcValue = this.expressionToString(attrValue);
          props.push(`image: /* TODO: Convert ${srcValue} */`);
        }
        continue;
      }

      // alt (for img)
      if (attrName === 'alt' && elementName === 'img') {
        if (t.isStringLiteral(attrValue)) {
          props.push(`semanticLabel: '${attrValue.value}'`);
        } else {
          const altValue = this.expressionToString(attrValue);
          props.push(`semanticLabel: /* TODO: ${altValue} */`);
        }
        continue;
      }

      // href (for a)
      if (attrName === 'href' && elementName === 'a') {
        props.push('// TODO: Navigate to href');
        continue;
      }

      // Other attributes as comments
      const valueStr = this.expressionToString(attrValue);
      props.push(`// TODO: Convert ${attrName}: ${valueStr}`);
    }

    // Separate comments from properties - comments don't need commas
    const comments = [];
    const properties = [];
    
    for (const prop of props) {
      if (prop.trim().startsWith('//')) {
        comments.push(prop);
      } else {
        properties.push(prop);
      }
    }
    
    // Combine: comments first (each on new line), then properties (comma-separated)
    const result = [];
    if (comments.length > 0) {
      result.push(comments.join('\n'));
    }
    if (properties.length > 0) {
      if (comments.length > 0) {
        // If there are comments, add properties on new line
        result.push(properties.join(', '));
      } else {
        result.push(properties.join(', '));
      }
    }
    
    return result.join(comments.length > 0 && properties.length > 0 ? '\n' : '');
  }

  /**
   * Convert JSX children to Flutter widget tree children
   * @param {boolean} isTextParent - If true, return raw strings for text nodes
   */
  convertChildrenToTree(children, isTextParent = false) {
    const result = [];
    
    for (const child of children) {
      if (t.isJSXText(child)) {
        const text = child.value.trim();
        if (text) {
          if (isTextParent) {
            // For Text widget parent, return raw string
            result.push(`'${text.replace(/'/g, "\\'")}'`);
          } else {
            // For other parents, wrap in Text widget
            result.push(createWidgetNode('Text', [], [], [`'${text.replace(/'/g, "\\'")}'`]));
          }
        }
      } else if (t.isJSXElement(child)) {
        result.push(this.convertJSXElementToTree(child));
      } else if (t.isJSXFragment(child)) {
        result.push(this.convertJSXFragmentToTree(child));
      } else if (t.isJSXExpressionContainer(child)) {
        // Expression in JSX
        const expr = child.expression;
        if (t.isConditionalExpression(expr)) {
          // Conditional rendering: {condition && <Component />}
          result.push(createWidgetNode('Container', [], ['// TODO: Conditional rendering']));
        } else if (t.isCallExpression(expr) && 
                   t.isMemberExpression(expr.callee) && 
                   expr.callee.property.name === 'map') {
          // Array.map: {array.map(...)}
          result.push(createWidgetNode('Container', [], ['// TODO: Array.map (v0.8)']));
        } else {
          const exprStr = this.expressionToString(expr);
          result.push(createWidgetNode('Container', [], [`// TODO: Convert expression ${exprStr}`]));
        }
      }
    }

    return result;
  }

  /**
   * Convert JSX children to Flutter widget children (legacy method)
   * @deprecated Use convertChildrenToTree instead
   */
  convertChildren(children, isTextParent = false) {
    const result = [];
    
    for (const child of children) {
      if (t.isJSXText(child)) {
        const text = child.value.trim();
        if (text) {
          if (isTextParent) {
            // For Text widget parent, return raw string
            result.push(`'${text.replace(/'/g, "\\'")}'`);
          } else {
            // For other parents, wrap in Text widget
            result.push(this.convertTextNode(text));
          }
        }
      } else if (t.isJSXElement(child)) {
        result.push(this.convertJSXElement(child));
      } else if (t.isJSXFragment(child)) {
        result.push(this.convertJSXFragment(child));
      } else if (t.isJSXExpressionContainer(child)) {
        // Expression in JSX
        const expr = child.expression;
        if (t.isConditionalExpression(expr)) {
          // Conditional rendering: {condition && <Component />}
          result.push('/* TODO: Conditional rendering */');
        } else if (t.isCallExpression(expr) && 
                   t.isMemberExpression(expr.callee) && 
                   expr.callee.property.name === 'map') {
          // Array.map: {array.map(...)}
          result.push('/* TODO: Array.map (v0.8) */');
        } else {
          result.push(`/* TODO: Convert expression ${this.expressionToString(expr)} */`);
        }
      }
    }

    return result;
  }

  /**
   * Convert JSX fragment to Column or Row widget tree
   */
  convertJSXFragmentToTree(fragment) {
    const childrenTrees = this.convertChildrenToTree(fragment.children, false);
    if (childrenTrees.length === 0) {
      return createWidgetNode('SizedBox', [createPropertyNode('shrink', '')]);
    }
    if (childrenTrees.length === 1) {
      return childrenTrees[0];
    }
    
    const layoutType = this.detectLayoutType(fragment);
    const layoutWidget = layoutType === 'row' ? 'Row' : 'Column';
    return createWidgetNode(layoutWidget, [
      createPropertyNode('mainAxisSize', 'MainAxisSize.min')
    ], [], childrenTrees);
  }

  /**
   * Convert JSX fragment to Column or Row (legacy method)
   * @deprecated Use convertJSXFragmentToTree instead
   */
  convertJSXFragment(fragment) {
    const children = this.convertChildren(fragment.children, false);
    if (children.length === 0) {
      return 'SizedBox.shrink()';
    }
    if (children.length === 1) {
      return children[0];
    }
    
    const layoutType = this.detectLayoutType(fragment);
    const layoutWidget = layoutType === 'row' ? 'Row' : 'Column';
    return `${layoutWidget}(mainAxisSize: MainAxisSize.min, children: [${children.join(', ')}])`;
  }

  /**
   * Detect if fragment should be Column or Row
   */
  detectLayoutType(jsxNode) {
    // Simple heuristic: if all children are inline elements, use Row
    // Otherwise use Column (default)
    // For v0.7, default to Column
    return 'column';
  }

  /**
   * Convert text node to Text widget
   */
  convertTextNode(text) {
    if (typeof text === 'string') {
      // Escape quotes and newlines
      const escaped = text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
      return `Text('${escaped}')`;
    }
    return `Text('${String(text)}')`;
  }

  /**
   * Extract props from component definition
   */
  extractProps(ast, componentName) {
    const props = [];
    const self = this;
    
    traverseDefault(ast, {
      FunctionDeclaration(path) {
        if (path.node.id?.name === componentName || !componentName) {
          const params = path.node.params;
          if (params.length > 0 && t.isIdentifier(params[0])) {
            // Simple props: function Component(props)
            props.push({ name: 'props', type: 'object' });
          } else if (params.length > 0 && t.isObjectPattern(params[0])) {
            // Destructured props: function Component({ prop1, prop2 })
            for (const prop of params[0].properties) {
              if (t.isObjectProperty(prop)) {
                props.push({
                  name: prop.key.name,
                  required: !prop.optional,
                  defaultValue: prop.value
                });
              }
            }
          }
          path.stop();
        }
      },
      ArrowFunctionExpression(path) {
        const params = path.node.params;
        if (params.length > 0 && t.isObjectPattern(params[0])) {
          for (const prop of params[0].properties) {
            if (t.isObjectProperty(prop)) {
              props.push({
                name: prop.key.name,
                required: !prop.optional,
                defaultValue: prop.value
              });
            }
          }
        }
      }
    });

    return props;
  }

  /**
   * Generate props code for widget constructor
   */
  generatePropsCode(props) {
    if (props.length === 0) return '';
    
    const propStrings = props.map(prop => {
      if (prop.required) {
        return `required this.${prop.name}`;
      } else {
        // Optional props (named parameters in Dart are optional by default)
        return `this.${prop.name}`;
      }
    });
    
    // Format props with line breaks if there are many
    if (propStrings.length > 3) {
      return propStrings.map((prop, idx) => 
        idx === 0 ? prop : '\n    ' + prop
      ).join(', ') + ',\n  ';
    }
    
    return propStrings.join(', ') + ', ';
  }

  /**
   * Format widget tree to Dart code with proper indentation
   */
  formatWidgetTree(node, indent = 0) {
    if (!node || node.type !== 'widget') {
      return 'Container()';
    }

    const indentStr = ' '.repeat(indent);
    const nextIndent = indent + 2;
    const nextIndentStr = ' '.repeat(nextIndent);
    
    let result = node.name;
    
    // Handle special cases like SizedBox.shrink()
    if (node.name === 'SizedBox' && node.properties.length === 1 && node.properties[0].key === 'shrink') {
      return 'SizedBox.shrink()';
    }
    
    // Check if we have properties, comments, or children
    const hasProperties = node.properties && node.properties.length > 0;
    const hasComments = node.comments && node.comments.length > 0;
    const hasChildren = node.children && node.children.length > 0;
    
    if (!hasProperties && !hasComments && !hasChildren) {
      return `${node.name}()`;
    }
    
    // Start widget with opening paren
    result += '(\n';
    
    // Add comments first
    if (hasComments) {
      for (const comment of node.comments) {
        result += `${nextIndentStr}${comment}\n`;
      }
    }
    
    // Add properties
    if (hasProperties) {
      for (let i = 0; i < node.properties.length; i++) {
        const prop = node.properties[i];
        const isLast = i === node.properties.length - 1 && !hasChildren;
        
        result += `${nextIndentStr}${prop.key}: `;
        
        // Format property value
        if (typeof prop.value === 'object' && prop.value !== null && prop.value.type === 'widget') {
          // Nested widget
          result += this.formatWidgetTree(prop.value, nextIndent);
        } else if (Array.isArray(prop.value)) {
          // Array of widgets (like children: [...])
          result += '[\n';
          const arrayIndent = ' '.repeat(nextIndent + 2);
          for (let j = 0; j < prop.value.length; j++) {
            const child = prop.value[j];
            const isLastChild = j === prop.value.length - 1;
            
            if (typeof child === 'string') {
              // String literal
              result += `${arrayIndent}${child}`;
            } else if (typeof child === 'object' && child !== null && child.type === 'widget') {
              // Widget node
              result += this.formatWidgetTree(child, nextIndent + 2);
            } else {
              // Fallback
              result += `${arrayIndent}${String(child)}`;
            }
            
            if (!isLastChild) {
              result += ',';
            }
            result += '\n';
          }
          result += `${nextIndentStr}]`;
        } else {
          // Simple value (string, number, etc.)
          result += String(prop.value);
        }
        
        if (!isLast) {
          result += ',';
        }
        result += '\n';
      }
    }
    
    // Add children array if present (for widgets like Column, Row, ListView)
    if (hasChildren) {
      result += `${nextIndentStr}children: [\n`;
      const arrayIndent = ' '.repeat(nextIndent + 2);
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const isLastChild = i === node.children.length - 1;
        
        if (typeof child === 'string') {
          // String literal
          result += `${arrayIndent}${child}`;
        } else if (typeof child === 'object' && child !== null && child.type === 'widget') {
          // Widget node
          result += this.formatWidgetTree(child, nextIndent + 2);
        } else {
          // Fallback
          result += `${arrayIndent}${String(child)}`;
        }
        
        if (!isLastChild) {
          result += ',';
        }
        result += '\n';
      }
      result += `${nextIndentStr}],\n`;
    }
    
    // Close widget
    result += `${indentStr})`;
    
    return result;
  }

  /**
   * Convert expression to string representation
   */
  expressionToString(expr) {
    if (!expr) return '';
    
    if (t.isStringLiteral(expr)) {
      return `"${expr.value}"`;
    }
    if (t.isNumericLiteral(expr)) {
      return expr.value.toString();
    }
    if (t.isBooleanLiteral(expr)) {
      return expr.value.toString();
    }
    if (t.isIdentifier(expr)) {
      return expr.name;
    }
    if (t.isMemberExpression(expr)) {
      const obj = this.expressionToString(expr.object);
      const prop = t.isIdentifier(expr.property) 
        ? expr.property.name 
        : this.expressionToString(expr.property);
      return `${obj}.${prop}`;
    }
    if (t.isCallExpression(expr)) {
      const callee = this.expressionToString(expr.callee);
      return `${callee}(...)`;
    }
    if (t.isObjectExpression(expr)) {
      return '{...}';
    }
    if (t.isArrayExpression(expr)) {
      return '[...]';
    }
    if (t.isConditionalExpression(expr)) {
      return 'condition ? ... : ...';
    }
    if (t.isTemplateLiteral(expr)) {
      return '`template string`';
    }
    if (t.isBinaryExpression(expr)) {
      return `${this.expressionToString(expr.left)} ${expr.operator} ${this.expressionToString(expr.right)}`;
    }
    
    // Try to get a better description from the node type
    if (expr.type) {
      const typeName = expr.type.toLowerCase().replace('expression', '').replace('statement', '');
      if (typeName && typeName !== '') {
        return typeName;
      }
    }
    
    return '...';
  }

  /**
   * Format widget code with proper indentation and line breaks
   * This method is more conservative - it only formats when safe to do so
   */
  formatWidgetCode(code, baseIndent = 0) {
    if (!code || code.length < 50) {
      // Short code doesn't need formatting
      return code;
    }
    
    // Count commas to determine complexity
    const commaCount = (code.match(/,/g) || []).length;
    if (commaCount < 2) {
      // Simple code, no formatting needed
      return code;
    }
    
    // More conservative formatting - only break on top-level commas
    // Don't break nested widget structures
    let formatted = '';
    let indent = baseIndent;
    const indentSize = 2;
    let i = 0;
    let inString = false;
    let stringChar = '';
    let parenDepth = 0;
    let bracketDepth = 0;
    let lastChar = '';
    
    while (i < code.length) {
      const char = code[i];
      const nextChar = code[i + 1] || '';
      
      // Handle strings
      if ((char === '"' || char === "'") && (i === 0 || code[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        formatted += char;
        i++;
        lastChar = char;
        continue;
      }
      
      if (inString) {
        formatted += char;
        i++;
        lastChar = char;
        continue;
      }
      
      // Track parentheses and brackets
      if (char === '(') {
        parenDepth++;
        formatted += char;
        // Only add newline after opening paren if it's a top-level widget call
        // and there's content after (not immediately closing)
        if (parenDepth === 1 && i < code.length - 1 && code[i + 1] !== ')') {
          // Check if this looks like a widget call (PascalCase before paren)
          let j = formatted.length - 2; // Go back before the '('
          let widgetName = '';
          while (j >= 0 && /[A-Za-z0-9_]/.test(formatted[j])) {
            widgetName = formatted[j] + widgetName;
            j--;
          }
          // Only format if it's a widget (starts with capital) and has multiple properties
          if (widgetName && /^[A-Z]/.test(widgetName) && commaCount > 2) {
            let nextNonSpace = i + 1;
            while (nextNonSpace < code.length && code[nextNonSpace] === ' ') nextNonSpace++;
            if (nextNonSpace < code.length) {
              formatted += '\n' + ' '.repeat(indent + indentSize);
              indent += indentSize;
            }
          }
        }
        i++;
        lastChar = char;
        continue;
      }
      
      if (char === ')') {
        parenDepth--;
        if (parenDepth === 0 && indent > baseIndent) {
          indent -= indentSize;
          // Only add newline if we're not in the middle of a nested structure
          if (lastChar !== '\n') {
            formatted += '\n' + ' '.repeat(indent) + char;
          } else {
            formatted += char;
          }
        } else {
          formatted += char;
        }
        i++;
        lastChar = char;
        continue;
      }
      
      if (char === '[') {
        bracketDepth++;
        formatted += char;
        i++;
        lastChar = char;
        continue;
      }
      
      if (char === ']') {
        bracketDepth--;
        formatted += char;
        i++;
        lastChar = char;
        continue;
      }
      
      // Handle commas - only break on top-level commas (parenDepth === 1)
      if (char === ',') {
        formatted += char;
        // Only add newline for top-level property commas, not nested ones
        if (parenDepth === 1 && bracketDepth === 0) {
          let nextNonSpace = i + 1;
          while (nextNonSpace < code.length && code[nextNonSpace] === ' ') nextNonSpace++;
          if (nextNonSpace < code.length && code[nextNonSpace] !== ')') {
            formatted += '\n' + ' '.repeat(indent);
          } else {
            formatted += ' ';
          }
        } else {
          formatted += ' ';
        }
        i++;
        lastChar = char;
        continue;
      }
      
      formatted += char;
      lastChar = char;
      i++;
    }
    
    // Clean up extra newlines
    formatted = formatted.replace(/\n\s*\n+/g, '\n');
    // Clean up trailing spaces
    formatted = formatted.replace(/ +\n/g, '\n');
    // Clean up spaces before closing parens/brackets
    formatted = formatted.replace(/\s+\)/g, ')');
    formatted = formatted.replace(/\s+\]/g, ']');
    
    return formatted;
  }

  /**
   * Get JSX attribute value, handling JSXExpressionContainer
   */
  getJSXAttributeValue(attrValue) {
    if (!attrValue) return null;
    
    if (t.isStringLiteral(attrValue)) {
      return attrValue.value;
    }
    
    if (t.isJSXExpressionContainer(attrValue)) {
      return attrValue.expression;
    }
    
    return attrValue;
  }

  /**
   * Convert name to PascalCase
   */
  toPascalCase(name) {
    if (!name) return 'Component';
    return name
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }
}

