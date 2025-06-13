// NTRN Conversion Configuration
// Generated on 2025-06-13T16:48:13.268Z

export default {
  "ai": {
    "model": "gemini-2.0-flash",
    "temperature": 0.3,
    "maxTokens": 8192,
    "batchSize": 5,
    "rateLimitDelay": 1000,
    "retryAttempts": 3,
    "timeout": 60000
  },
  "conversion": {
    "preserveFileStructure": true,
    "generateNavigation": true,
    "optimizeImports": true,
    "generateDocs": true,
    "includeErrorBoundaries": true,
    "addAccessibility": true
  },
  "navigation": {
    "type": "stack",
    "enableDeepLinking": false,
    "screens": []
  },
  "styling": {
    "framework": "nativewind",
    "generateTheme": true,
    "responsiveDesign": true,
    "darkModeSupport": false,
    "customTheme": null
  },
  "development": {
    "enableFlipperIntegration": false,
    "addDevMenu": true,
    "enableHotReload": true,
    "includeStorybook": false
  },
  "files": {
    "excludePatterns": [
      "*.test.*",
      "*.spec.*",
      "__tests__/**",
      "node_modules/**"
    ],
    "includePatterns": [
      "**/*.tsx",
      "**/*.ts",
      "**/*.jsx",
      "**/*.js"
    ],
    "backupOriginals": false
  },
  "processing": {
    "includeAssets": true,
    "optimizeImages": true,
    "generateTypes": true,
    "batchSize": 5
  },
  "output": {
    "includeReadme": true,
    "includeDocumentation": false,
    "includeExampleScreens": false
  },
  "qualityImprovement": {
    "enabled": true,
    "maxIterations": 5,
    "targetScore": 100,
    "autoFixCriticalIssues": true
  }
};