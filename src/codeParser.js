import fs from 'fs-extra';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export class CodeParser {
  constructor() {
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  }

  async parseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);
      const isTypeScript = ext === '.ts' || ext === '.tsx';
      const isJSX = ext === '.jsx' || ext === '.tsx';

      // Determine parser plugins
      const plugins = [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ];

      // Parse the file
      const ast = parse(content, {
        sourceType: 'module',
        plugins: plugins,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        errorRecovery: true
      });

      return {
        success: true,
        ast,
        content,
        filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath
      };
    }
  }

  canParse(filePath) {
    const ext = path.extname(filePath);
    return this.supportedExtensions.includes(ext);
  }
}

