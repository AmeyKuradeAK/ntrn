export class ComponentCompositionMapper {
  constructor() {
    this.compositionGraph = new Map(); // filePath -> { renders: [], receives: [] }
  }

  /**
   * Build composition graph from structure and state analysis
   * @param {Object} structure - Project structure
   * @param {Object} stateAnalysis - State analysis results
   * @returns {Object} - Composition graph
   */
  buildCompositionGraph(structure, stateAnalysis) {
    const graph = new Map();

    // Initialize graph nodes
    const allFiles = [
      ...structure.pages,
      ...structure.components,
      ...structure.utils,
      ...structure.lib
    ];

    allFiles.forEach(file => {
      graph.set(file.fullPath, {
        filePath: file.fullPath,
        relativePath: file.relativePath,
        renders: [], // Components this file renders
        receives: [], // Props this file receives
        passesProps: [] // Props this file passes to children
      });
    });

    // Build composition relationships from state analysis
    if (stateAnalysis && stateAnalysis.files) {
      stateAnalysis.files.forEach((fileAnalysis, filePath) => {
        const node = graph.get(filePath);
        if (!node) return;

        // Add rendered components
        if (fileAnalysis.composition && fileAnalysis.composition.renderedComponents) {
          fileAnalysis.composition.renderedComponents.forEach(rendered => {
            node.renders.push({
              componentName: rendered.componentName,
              props: rendered.props,
              callbacks: rendered.callbacks
            });
          });
        }

        // Add props received (from props analysis)
        if (fileAnalysis.props && fileAnalysis.props.props) {
          fileAnalysis.props.props.forEach(prop => {
            node.receives.push({
              propName: prop.name,
              type: prop.type,
              required: prop.required,
              defaultValue: prop.defaultValue
            });
          });
        }
      });
    }

    return {
      nodes: graph,
      edges: this.buildCompositionEdges(graph)
    };
  }

  /**
   * Build composition edges (which components render which)
   * @param {Map} graph - Composition graph nodes
   * @returns {Array} - Composition edges
   */
  buildCompositionEdges(graph) {
    const edges = [];

    graph.forEach((node, filePath) => {
      node.renders.forEach(rendered => {
        // Try to find the file that defines this component
        // This is a simplified approach - in reality, we'd need to resolve component names to files
        edges.push({
          from: filePath,
          to: rendered.componentName, // Component name (would need file resolution)
          props: rendered.props,
          callbacks: rendered.callbacks
        });
      });
    });

    return edges;
  }

  /**
   * Visualize composition as a tree structure
   * @param {Object} compositionGraph - Composition graph
   * @param {Set} entryPoints - Entry point files
   * @returns {Array} - Tree structure
   */
  visualizeComposition(compositionGraph, entryPoints) {
    const self = this;
    const { nodes } = compositionGraph;
    const trees = [];
    const visited = new Set();

    const buildNode = (filePath, depth = 0, maxDepth = 10) => {
      if (depth > maxDepth || visited.has(filePath)) {
        return null;
      }

      const node = nodes.get(filePath);
      if (!node) return null;

      visited.add(filePath);
      const children = [];

      // Build children from rendered components
      node.renders.forEach(rendered => {
        // For now, we'll use component name
        // In a full implementation, we'd resolve component names to file paths
        children.push({
          componentName: rendered.componentName,
          props: rendered.props,
          callbacks: rendered.callbacks,
          depth: depth + 1
        });
      });

      return {
        file: filePath,
        relativePath: node.relativePath,
        componentName: self.extractComponentName(node.relativePath),
        children: children,
        props: node.receives,
        depth: depth
      };
    };

    // Build trees from entry points
    const entryPointsArray = Array.isArray(entryPoints) ? entryPoints : Array.from(entryPoints || []);
    entryPointsArray.forEach(filePath => {
      const rootNode = buildNode(filePath, 0);
      if (rootNode) {
        trees.push(rootNode);
      }
    });

    return trees;
  }

  /**
   * Extract component name from file path
   * @param {string} relativePath - Relative file path
   * @returns {string} - Component name
   */
  extractComponentName(relativePath) {
    const fileName = relativePath.split('/').pop() || relativePath.split('\\').pop();
    return fileName.replace(/\.(tsx|jsx|ts|js)$/, '');
  }
}

