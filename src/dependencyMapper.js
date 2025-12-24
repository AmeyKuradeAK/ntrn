import fs from 'fs-extra';
import path from 'path';

export class DependencyMapper {
  constructor(projectPath, verbose = false) {
    this.projectPath = path.resolve(projectPath);
    this.verbose = verbose;
    this.pathAliases = null; // Will be loaded from tsconfig.json/jsconfig.json
  }

  /**
   * Load path aliases from tsconfig.json or jsconfig.json
   */
  async loadPathAliases() {
    if (this.pathAliases !== null) {
      return this.pathAliases;
    }

    this.pathAliases = {};
    
    // Try tsconfig.json first
    const tsconfigPath = path.join(this.projectPath, 'tsconfig.json');
    if (await fs.exists(tsconfigPath)) {
      try {
        const tsconfig = await fs.readJson(tsconfigPath);
        if (tsconfig.compilerOptions?.paths) {
          // Convert paths mapping to simple alias map
          // e.g., {"@/*": ["./src/*"]} -> {"@": "./src"}
          for (const [alias, paths] of Object.entries(tsconfig.compilerOptions.paths)) {
            if (paths && paths.length > 0) {
              const aliasKey = alias.replace('/*', '').replace('*', '');
              const aliasPath = paths[0].replace('/*', '').replace('*', '');
              this.pathAliases[aliasKey] = path.join(this.projectPath, aliasPath);
            }
          }
        }
      } catch (error) {
        if (this.verbose) {
          console.log(`Warning: Could not parse tsconfig.json: ${error.message}`);
        }
      }
    }

    // Try jsconfig.json if tsconfig.json didn't have paths
    if (Object.keys(this.pathAliases).length === 0) {
      const jsconfigPath = path.join(this.projectPath, 'jsconfig.json');
      if (await fs.exists(jsconfigPath)) {
        try {
          const jsconfig = await fs.readJson(jsconfigPath);
          if (jsconfig.compilerOptions?.paths) {
            for (const [alias, paths] of Object.entries(jsconfig.compilerOptions.paths)) {
              if (paths && paths.length > 0) {
                const aliasKey = alias.replace('/*', '').replace('*', '');
                const aliasPath = paths[0].replace('/*', '').replace('*', '');
                this.pathAliases[aliasKey] = path.join(this.projectPath, aliasPath);
              }
            }
          }
        } catch (error) {
          if (this.verbose) {
            console.log(`Warning: Could not parse jsconfig.json: ${error.message}`);
          }
        }
      }
    }

    // Default @/ alias to src/ if not configured
    if (!this.pathAliases['@'] && !this.pathAliases['@/']) {
      const srcPath = path.join(this.projectPath, 'src');
      if (await fs.exists(srcPath)) {
        this.pathAliases['@'] = srcPath;
        this.pathAliases['@/'] = srcPath;
      } else {
        this.pathAliases['@'] = this.projectPath;
        this.pathAliases['@/'] = this.projectPath;
      }
    }

    // Default ~/ alias to src/ or root
    if (!this.pathAliases['~'] && !this.pathAliases['~/']) {
      const srcPath = path.join(this.projectPath, 'src');
      if (await fs.exists(srcPath)) {
        this.pathAliases['~'] = srcPath;
        this.pathAliases['~/'] = srcPath;
      } else {
        this.pathAliases['~'] = this.projectPath;
        this.pathAliases['~/'] = this.projectPath;
      }
    }

    return this.pathAliases;
  }

  /**
   * Resolve an import path to an actual file path
   * @param {string} importSource - The import source string (e.g., './Component', '@/utils/helper')
   * @param {string} fromFile - The file that contains this import
   * @returns {string|null} - Resolved absolute file path or null if not found
   */
  async resolveImportPath(importSource, fromFile) {
    await this.loadPathAliases();

    // Handle Next.js special imports - mark as external
    if (importSource.startsWith('next/')) {
      return null; // External/Next.js import
    }

    // Handle path aliases (@/, ~/)
    let resolvedPath = null;
    if (importSource.startsWith('@/') || importSource.startsWith('@')) {
      const alias = importSource.startsWith('@/') ? '@/' : '@';
      const aliasPath = this.pathAliases[alias] || this.pathAliases['@'];
      if (aliasPath) {
        const rest = importSource.substring(alias === '@/' ? 2 : 1);
        resolvedPath = path.join(aliasPath, rest);
      }
    } else if (importSource.startsWith('~/') || importSource.startsWith('~')) {
      const alias = importSource.startsWith('~/') ? '~/' : '~';
      const aliasPath = this.pathAliases[alias] || this.pathAliases['~'];
      if (aliasPath) {
        const rest = importSource.substring(alias === '~/' ? 2 : 1);
        resolvedPath = path.join(aliasPath, rest);
      }
    } else if (importSource.startsWith('./') || importSource.startsWith('../')) {
      // Relative import
      const fromDir = path.dirname(fromFile);
      resolvedPath = path.resolve(fromDir, importSource);
    } else if (importSource.startsWith('/')) {
      // Absolute import from project root
      resolvedPath = path.join(this.projectPath, importSource);
    } else {
      // External package - return null
      return null;
    }

    if (!resolvedPath) {
      return null;
    }

    // Try to find the actual file with various extensions
    const extensions = ['.tsx', '.ts', '.jsx', '.js'];
    
    // Check if it's already a file with extension
    if (path.extname(resolvedPath)) {
      if (await fs.exists(resolvedPath)) {
        return path.normalize(resolvedPath);
      }
      return null;
    }

    // Try with extensions
    for (const ext of extensions) {
      const filePath = resolvedPath + ext;
      if (await fs.exists(filePath)) {
        return path.normalize(filePath);
      }
    }

    // Try as directory with index file
    if (await fs.exists(resolvedPath)) {
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        if (await fs.exists(indexPath)) {
          return path.normalize(indexPath);
        }
      }
      }
    }

    // Not found
    return null;
  }

  /**
   * Build dependency graph from project structure
   * @param {Object} structure - Project structure with pages, components, utils, lib
   * @returns {Object} - Dependency graph with nodes and edges
   */
  async buildDependencyGraph(structure) {
    const nodes = new Map();
    const edges = [];

    // Collect all files
    const allFiles = [
      ...structure.pages,
      ...structure.components,
      ...structure.utils,
      ...structure.lib
    ];

    // Create nodes for all files
    for (const file of allFiles) {
      const filePath = file.fullPath;
      const fileType = structure.pages.includes(file) ? 'page' :
                      structure.components.includes(file) ? 'component' :
                      structure.utils.includes(file) ? 'util' : 'lib';

      const node = {
        filePath: filePath,
        relativePath: file.relativePath,
        exports: file.structure?.exportDetails || [],
        imports: file.structure?.importDetails || [],
        dependencies: new Set(), // Files this file imports
        dependents: new Set(),   // Files that import this file
        fileType: fileType
      };

      nodes.set(filePath, node);
    }

    // Build edges by resolving imports
    for (const file of allFiles) {
      const fromNode = nodes.get(file.fullPath);
      if (!fromNode || !file.structure?.importDetails) {
        continue;
      }

      for (const importInfo of file.structure.importDetails) {
        const resolvedPath = await this.resolveImportPath(importInfo.source, file.fullPath);
        
        let edgeType = 'external';
        if (importInfo.isNextJS) {
          edgeType = 'nextjs';
        } else if (importInfo.isRelative || importInfo.source.startsWith('@/') || importInfo.source.startsWith('~/')) {
          edgeType = resolvedPath ? 'relative' : 'unresolved';
        } else if (importInfo.isExternal) {
          edgeType = 'external';
        } else if (importInfo.source.startsWith('/')) {
          edgeType = resolvedPath ? 'absolute' : 'unresolved';
        }

        const edge = {
          from: file.fullPath,
          to: resolvedPath,
          type: edgeType,
          imports: [],
          source: importInfo.source
        };

        // Add what was imported
        if (importInfo.default) {
          edge.imports.push({ name: importInfo.default, type: 'default' });
        }
        if (importInfo.namespace) {
          edge.imports.push({ name: importInfo.namespace, type: 'namespace' });
        }
        if (importInfo.named && importInfo.named.length > 0) {
          importInfo.named.forEach(name => {
            edge.imports.push({ name, type: 'named' });
          });
        }

        edges.push(edge);

        // If resolved to an internal file, add dependency relationship
        if (resolvedPath && nodes.has(resolvedPath)) {
          fromNode.dependencies.add(resolvedPath);
          const toNode = nodes.get(resolvedPath);
          toNode.dependents.add(file.fullPath);
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Detect circular dependencies using DFS
   * @param {Object} graph - Dependency graph with nodes and edges
   * @returns {Array<Array<string>>} - Array of circular dependency chains
   */
  detectCircularDependencies(graph) {
    const { nodes } = graph;
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();
    const path = [];

    const dfs = (filePath) => {
      visited.add(filePath);
      recStack.add(filePath);
      path.push(filePath);

      const node = nodes.get(filePath);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart).concat([dep]);
              // Check if this cycle is not a duplicate
              const cycleKey = cycle.sort().join('→');
              if (!cycles.some(c => c.sort().join('→') === cycleKey)) {
                cycles.push(cycle);
              }
            }
          }
        }
      }

      recStack.delete(filePath);
      path.pop();
    };

    // Run DFS on all nodes
    for (const filePath of nodes.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath);
      }
    }

    return cycles;
  }

  /**
   * Track component usage by matching imports to exports
   * @param {Object} graph - Dependency graph
   * @returns {Map<string, Array<string>>} - Map of component name to files that use it
   */
  trackComponentUsage(graph) {
    const { nodes, edges } = graph;
    const componentUsage = new Map();

    // For each edge (import), match imported names to exported names
    for (const edge of edges) {
      if (!edge.to || !nodes.has(edge.to)) {
        continue; // External dependency
      }

      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);

      // Match imported names to exported names
      for (const imported of edge.imports) {
        let componentName = null;

        if (imported.type === 'default') {
          // Find default export
          const defaultExport = toNode.exports.find(e => e.isDefault);
          if (defaultExport) {
            componentName = defaultExport.name;
          }
        } else if (imported.type === 'named') {
          // Named export - use the imported name
          componentName = imported.name;
        } else if (imported.type === 'namespace') {
          // Namespace import - use the namespace name
          componentName = imported.name;
        }

        if (componentName) {
          if (!componentUsage.has(componentName)) {
            componentUsage.set(componentName, []);
          }
          const usageList = componentUsage.get(componentName);
          if (!usageList.includes(edge.from)) {
            usageList.push(edge.from);
          }
        }
      }
    }

    return componentUsage;
  }

  /**
   * Calculate import statistics
   * @param {Object} graph - Dependency graph
   * @returns {Object} - Import statistics
   */
  calculateImportStats(graph) {
    const { edges } = graph;
    const stats = {
      relative: 0,
      external: 0,
      nextjs: 0,
      absolute: 0,
      unresolved: 0
    };

    for (const edge of edges) {
      switch (edge.type) {
        case 'relative':
          stats.relative++;
          break;
        case 'external':
          stats.external++;
          break;
        case 'nextjs':
          stats.nextjs++;
          break;
        case 'absolute':
          stats.absolute++;
          break;
        case 'unresolved':
          stats.unresolved++;
          break;
      }
    }

    return stats;
  }

  /**
   * Get dependencies for a specific file
   * @param {string} filePath - File path
   * @param {Object} graph - Dependency graph
   * @returns {Object} - File dependencies info
   */
  getFileDependencies(filePath, graph) {
    const { nodes, edges } = graph;
    const node = nodes.get(filePath);
    if (!node) {
      return { imports: [], exports: [], dependents: [], externalImports: [] };
    }

    const imports = [];
    const dependents = [];
    const externalImports = [];

    // Get all edges where this file is the source
    edges.forEach(edge => {
      if (edge.from === filePath) {
        if (edge.to && nodes.has(edge.to)) {
          // Internal import
          const targetNode = nodes.get(edge.to);
          imports.push({
            file: edge.to,
            relativePath: targetNode.relativePath,
            imports: edge.imports,
            source: edge.source
          });
        } else if (edge.type === 'external' || edge.type === 'nextjs') {
          // External import
          externalImports.push({
            source: edge.source,
            type: edge.type,
            imports: edge.imports
          });
        }
      }
    });

    // Get all edges where this file is the target (dependents)
    edges.forEach(edge => {
      if (edge.to === filePath && nodes.has(edge.from)) {
        const sourceNode = nodes.get(edge.from);
        dependents.push({
          file: edge.from,
          relativePath: sourceNode.relativePath
        });
      }
    });

    return {
      imports,
      exports: node.exports || [],
      dependents,
      externalImports
    };
  }

  /**
   * Calculate dependency depth for each file
   * @param {Object} graph - Dependency graph
   * @param {Set} entryPoints - Set of entry point file paths
   * @returns {Map<string, number>} - Map of file path to depth
   */
  calculateDependencyDepth(graph, entryPoints) {
    const { nodes } = graph;
    const depths = new Map();
    const visited = new Set();
    const queue = [];

    // Initialize entry points with depth 0
    entryPoints.forEach(filePath => {
      if (nodes.has(filePath)) {
        depths.set(filePath, 0);
        queue.push({ filePath, depth: 0 });
        visited.add(filePath);
      }
    });

    // BFS to calculate depths
    while (queue.length > 0) {
      const { filePath, depth } = queue.shift();
      const node = nodes.get(filePath);
      
      if (!node) continue;

      // Process dependencies
      node.dependencies.forEach(depPath => {
        if (!visited.has(depPath)) {
          const newDepth = depth + 1;
          depths.set(depPath, newDepth);
          visited.add(depPath);
          queue.push({ filePath: depPath, depth: newDepth });
        } else {
          // Check if we found a shorter path (shouldn't happen in DAG, but handle cycles)
          const currentDepth = depths.get(depPath);
          if (currentDepth !== undefined && depth + 1 < currentDepth) {
            depths.set(depPath, depth + 1);
          }
        }
      });
    }

    // Mark files not reachable from entry points as -1
    nodes.forEach((node, filePath) => {
      if (!depths.has(filePath)) {
        depths.set(filePath, -1);
      }
    });

    return depths;
  }

  /**
   * Identify entry point files (pages)
   * @param {Object} structure - Project structure
   * @param {Object} graph - Dependency graph
   * @returns {Set<string>} - Set of entry point file paths
   */
  identifyEntryPoints(structure, graph) {
    const entryPoints = new Set();
    const { nodes } = graph;

    // Pages are entry points
    structure.pages.forEach(page => {
      if (nodes.has(page.fullPath)) {
        entryPoints.add(page.fullPath);
      }
    });

    return entryPoints;
  }

  /**
   * Find exports that are never imported
   * @param {Object} graph - Dependency graph
   * @param {Set} entryPoints - Set of entry point file paths
   * @returns {Array} - Array of unused exports
   */
  findUnusedExports(graph, entryPoints) {
    const { nodes, edges } = graph;
    const unusedExports = [];
    const usedExports = new Set();

    // Collect all used exports from edges
    edges.forEach(edge => {
      if (!edge.to || !nodes.has(edge.to)) return;

      const toNode = nodes.get(edge.to);
      edge.imports.forEach(imported => {
        if (imported.type === 'default') {
          const defaultExport = toNode.exports.find(e => e.isDefault);
          if (defaultExport) {
            usedExports.add(`${edge.to}::${defaultExport.name}::default`);
          }
        } else if (imported.type === 'named') {
          usedExports.add(`${edge.to}::${imported.name}::named`);
        } else if (imported.type === 'namespace') {
          // Namespace imports use all exports
          toNode.exports.forEach(exp => {
            usedExports.add(`${edge.to}::${exp.name}::${exp.isDefault ? 'default' : 'named'}`);
          });
        }
      });
    });

    // Find unused exports (excluding entry point default exports)
    nodes.forEach((node, filePath) => {
      const isEntryPoint = entryPoints.has(filePath);
      node.exports.forEach(exp => {
        // Skip default exports from entry points (they're used by framework routing)
        if (isEntryPoint && exp.isDefault) {
          return;
        }
        
        const exportKey = `${filePath}::${exp.name}::${exp.isDefault ? 'default' : 'named'}`;
        if (!usedExports.has(exportKey)) {
          unusedExports.push({
            filePath,
            relativePath: node.relativePath,
            exportName: exp.name,
            exportType: exp.isDefault ? 'default' : 'named'
          });
        }
      });
    });

    return unusedExports;
  }

  /**
   * Find imports that don't match exports
   * @param {Object} graph - Dependency graph
   * @returns {Array} - Array of import/export mismatches
   */
  findImportExportMismatches(graph) {
    const { nodes, edges } = graph;
    const mismatches = [];

    edges.forEach(edge => {
      if (!edge.to || !nodes.has(edge.to)) return;

      const toNode = nodes.get(edge.to);
      const fromNode = nodes.get(edge.from);

      edge.imports.forEach(imported => {
        let found = false;
        let issue = '';

        if (imported.type === 'default') {
          const defaultExport = toNode.exports.find(e => e.isDefault);
          if (defaultExport) {
            found = true;
          } else {
            issue = 'no default export';
          }
        } else if (imported.type === 'named') {
          const namedExport = toNode.exports.find(e => 
            !e.isDefault && e.name === imported.name
          );
          if (namedExport) {
            found = true;
          } else {
            issue = `named export '${imported.name}' not found`;
          }
        } else if (imported.type === 'namespace') {
          // Namespace imports are always valid if file exists
          found = true;
        }

        if (!found) {
          mismatches.push({
            fromFile: edge.from,
            fromRelativePath: fromNode.relativePath,
            toFile: edge.to,
            toRelativePath: toNode.relativePath,
            importedName: imported.name || (imported.type === 'default' ? 'default' : 'namespace'),
            importType: imported.type,
            issue
          });
        }
      });
    });

    return mismatches;
  }

  /**
   * Get detailed list of unresolved imports
   * @param {Object} graph - Dependency graph
   * @returns {Array} - Array of unresolved imports
   */
  getUnresolvedImports(graph) {
    const { nodes, edges } = graph;
    const unresolved = [];

    edges.forEach(edge => {
      if (edge.type === 'unresolved' && !edge.to) {
        const fromNode = nodes.get(edge.from);
        unresolved.push({
          filePath: edge.from,
          relativePath: fromNode ? fromNode.relativePath : edge.from,
          importSource: edge.source,
          reason: 'file not found'
        });
      }
    });

    return unresolved;
  }

  /**
   * Build dependency tree from entry points
   * @param {Object} graph - Dependency graph
   * @param {Set} entryPoints - Set of entry point file paths
   * @param {number} maxDepth - Maximum depth to traverse (default 10)
   * @returns {Array} - Tree structure
   */
  buildDependencyTree(graph, entryPoints, maxDepth = 10) {
    const { nodes } = graph;
    const tree = [];
    const visited = new Set();

    const buildNode = (filePath, depth) => {
      if (depth > maxDepth || visited.has(filePath)) {
        return null;
      }

      const node = nodes.get(filePath);
      if (!node) return null;

      visited.add(filePath);
      const children = [];

      // Get dependencies
      node.dependencies.forEach(depPath => {
        const childNode = buildNode(depPath, depth + 1);
        if (childNode) {
          children.push(childNode);
        }
      });

      return {
        file: filePath,
        relativePath: node.relativePath,
        children,
        depth
      };
    };

    // Build tree from each entry point
    entryPoints.forEach(filePath => {
      const rootNode = buildNode(filePath, 0);
      if (rootNode) {
        tree.push(rootNode);
      }
    });

    return tree;
  }

  /**
   * Build complete dependency analysis
   * @param {Object} structure - Project structure
   * @returns {Object} - Complete dependency analysis
   */
  async buildDependencies(structure) {
    const graph = await this.buildDependencyGraph(structure);
    const circularDependencies = this.detectCircularDependencies(graph);
    const componentUsage = this.trackComponentUsage(graph);
    const importStats = this.calculateImportStats(graph);
    const entryPoints = this.identifyEntryPoints(structure, graph);
    const dependencyDepths = this.calculateDependencyDepth(graph, entryPoints);
    const unusedExports = this.findUnusedExports(graph, entryPoints);
    const importMismatches = this.findImportExportMismatches(graph);
    const unresolvedImports = this.getUnresolvedImports(graph);
    const dependencyTree = this.buildDependencyTree(graph, entryPoints);

    // Build file dependencies map
    const fileDependencies = new Map();
    graph.nodes.forEach((node, filePath) => {
      fileDependencies.set(filePath, this.getFileDependencies(filePath, graph));
    });

    return {
      graph,
      circularDependencies,
      componentUsage,
      importStats,
      fileDependencies,
      dependencyDepths,
      entryPoints,
      unusedExports,
      importMismatches,
      unresolvedImports,
      dependencyTree
    };
  }
}

