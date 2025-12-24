import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { JSXToFlutterConverter } from './jsxToFlutterConverter.js';
import { CodeParser } from './codeParser.js';

export class FlutterGenerator {
  constructor(outputPath, projectName) {
    this.outputPath = path.resolve(outputPath);
    this.projectName = projectName;
    this.codeParser = new CodeParser();
    this.jsxConverter = new JSXToFlutterConverter();
  }

  async generate(analysis, mapping) {
    try {
      // Create project directory and all subdirectories first
      // fs.ensureDir creates all parent directories automatically, but let's be explicit
      await fs.ensureDir(this.outputPath);
      
      // Create lib directory structure
      const libDir = path.join(this.outputPath, 'lib');
      await fs.ensureDir(libDir);
      await fs.ensureDir(path.join(libDir, 'screens'));
      await fs.ensureDir(path.join(libDir, 'widgets'));
      await fs.ensureDir(path.join(libDir, 'utils'));
      await fs.ensureDir(path.join(libDir, 'models'));

      // Generate pubspec.yaml
      await this.generatePubspec();

      // Generate main.dart (after lib directory is created)
      await this.generateMainDart(mapping);

      // Convert files to Flutter widgets (v0.7)
      const conversionStats = await this.convertFiles(analysis, mapping);

      // Generate Android structure
      await this.generateAndroidStructure();

      // Generate iOS structure
      await this.generateIOSStructure();

      // Generate README
      await this.generateREADME(analysis, mapping);

      return {
        success: true,
        path: this.outputPath,
        conversionStats: conversionStats
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generatePubspec() {
    const pubspecContent = `name: ${this.projectName.replace(/[^a-z0-9_]/g, '_').toLowerCase()}
description: Flutter project converted from Next.js/React
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;

    await fs.writeFile(
      path.join(this.outputPath, 'pubspec.yaml'),
      pubspecContent
    );
  }

  async generateMainDart(mapping) {
    // Determine which screen to use as home
    let homeScreenImport = '';
    let homeScreenWidget = 'Scaffold(body: Center(child: Text("No screens found")))';
    
    if (mapping.screens.length > 0) {
      const firstScreen = mapping.screens[0];
      const screenClassName = this.toPascalCase(firstScreen.dartName);
      homeScreenImport = `import 'screens/${firstScreen.dartName}.dart';`;
      homeScreenWidget = `const ${screenClassName}()`;
    }

    const mainDartContent = `import 'package:flutter/material.dart';${homeScreenImport ? '\n' + homeScreenImport : ''}

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${this.projectName}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: ${homeScreenWidget},
    );
  }
}
`;

    // Ensure lib directory exists before writing
    const libDir = path.join(this.outputPath, 'lib');
    await fs.ensureDir(libDir);
    
    const mainDartPath = path.join(libDir, 'main.dart');
    await fs.writeFile(mainDartPath, mainDartContent);
  }

  /**
   * Convert React/JSX files to Flutter widgets (v0.7)
   */
  async convertFiles(analysis, mapping) {
    let screensConverted = 0;
    let widgetsConverted = 0;
    let errors = 0;
    
    // Convert screens (pages)
    for (const screen of mapping.screens) {
      try {
        const sourceFile = screen.source;
        if (sourceFile && sourceFile.fullPath && this.codeParser.canParse(sourceFile.fullPath)) {
          const parseResult = await this.codeParser.parseFile(sourceFile.fullPath);
          if (parseResult.success && parseResult.ast) {
            const structure = sourceFile.structure;
            const dartCode = this.jsxConverter.convertComponent(
              parseResult.ast,
              sourceFile.fullPath,
              structure
            );
            await this.generateConvertedDartFile(screen, dartCode);
            screensConverted++;
          } else {
            // Fallback to placeholder if parsing fails
            const screenContent = this.generateScreenPlaceholder(screen.dartName);
            await fs.writeFile(
              path.join(this.outputPath, screen.dartPath),
              screenContent
            );
          }
        } else {
          // No source file or can't parse, use placeholder
          const screenContent = this.generateScreenPlaceholder(screen.dartName);
          await fs.writeFile(
            path.join(this.outputPath, screen.dartPath),
            screenContent
          );
        }
      } catch (error) {
        // On error, fallback to placeholder
        const screenContent = this.generateScreenPlaceholder(screen.dartName);
        await fs.writeFile(
          path.join(this.outputPath, screen.dartPath),
          screenContent
        );
        errors++;
      }
    }

    // Convert widgets (components)
    for (const widget of mapping.widgets) {
      try {
        const sourceFile = widget.source;
        if (sourceFile && sourceFile.fullPath && this.codeParser.canParse(sourceFile.fullPath)) {
          const parseResult = await this.codeParser.parseFile(sourceFile.fullPath);
          if (parseResult.success && parseResult.ast) {
            const structure = sourceFile.structure;
            const dartCode = this.jsxConverter.convertComponent(
              parseResult.ast,
              sourceFile.fullPath,
              structure
            );
            await this.generateConvertedDartFile(widget, dartCode);
            widgetsConverted++;
          } else {
            // Fallback to placeholder if parsing fails
            const widgetContent = this.generateWidgetPlaceholder(widget.dartName);
            await fs.writeFile(
              path.join(this.outputPath, widget.dartPath),
              widgetContent
            );
          }
        } else {
          // No source file or can't parse, use placeholder
          const widgetContent = this.generateWidgetPlaceholder(widget.dartName);
          await fs.writeFile(
            path.join(this.outputPath, widget.dartPath),
            widgetContent
          );
        }
      } catch (error) {
        // On error, fallback to placeholder
        const widgetContent = this.generateWidgetPlaceholder(widget.dartName);
        await fs.writeFile(
          path.join(this.outputPath, widget.dartPath),
          widgetContent
        );
        errors++;
      }
    }

    // Generate util placeholders (utils don't have JSX, so keep placeholders)
    for (const util of mapping.utils) {
      const utilContent = this.generateUtilPlaceholder(util.dartName);
      await fs.writeFile(
        path.join(this.outputPath, util.dartPath),
        utilContent
      );
    }

    return {
      screensConverted,
      widgetsConverted,
      errors
    };
  }

  /**
   * Generate converted Dart file
   */
  async generateConvertedDartFile(fileInfo, dartCode) {
    await fs.writeFile(
      path.join(this.outputPath, fileInfo.dartPath),
      dartCode
    );
  }

  generateScreenPlaceholder(name) {
    const className = this.toPascalCase(name);
    return `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${className}'),
      ),
      body: const Center(
        child: Text(
          '${className} Screen',
          style: TextStyle(fontSize: 24),
        ),
      ),
    );
  }
}
`;
  }

  generateWidgetPlaceholder(name) {
    const className = this.toPascalCase(name);
    return `import 'package:flutter/material.dart';

class ${className} extends StatelessWidget {
  const ${className}({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      child: const Text('${className} Widget'),
    );
  }
}
`;
  }

  generateUtilPlaceholder(name) {
    const className = this.toPascalCase(name);
    return `// Utility functions for ${className}

class ${className} {
  // TODO: Add utility functions here
}
`;
  }

  async generateAndroidStructure() {
    const androidDir = path.join(this.outputPath, 'android');
    await fs.ensureDir(androidDir);
    await fs.ensureDir(path.join(androidDir, 'app', 'src', 'main'));
    await fs.ensureDir(path.join(androidDir, 'app', 'src', 'main', 'kotlin', 'com', 'example', this.projectName.toLowerCase().replace(/[^a-z0-9]/g, '')));

    // Generate basic AndroidManifest.xml
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="${this.projectName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;

    await fs.writeFile(
      path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml'),
      manifestContent
    );
  }

  async generateIOSStructure() {
    const iosDir = path.join(this.outputPath, 'ios');
    await fs.ensureDir(iosDir);
    await fs.ensureDir(path.join(iosDir, 'Runner'));
    await fs.ensureDir(path.join(iosDir, 'Runner', 'Assets.xcassets'));
    await fs.ensureDir(path.join(iosDir, 'Runner', 'Base.lproj'));

    // Generate basic Info.plist
    const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>\$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${this.projectName}</string>
	<key>CFBundleExecutable</key>
	<string>\$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>\$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${this.projectName}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>\$(FLUTTER_BUILD_NAME)</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>\$(FLUTTER_BUILD_NUMBER)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
`;

    await fs.writeFile(
      path.join(iosDir, 'Runner', 'Info.plist'),
      infoPlistContent
    );
  }

  async generateREADME(analysis, mapping) {
    const readmeContent = `# ${this.projectName}

Flutter project converted from ${analysis.framework === 'nextjs' ? 'Next.js' : 'React'}.

## Project Structure

- \`lib/screens/\` - Screen widgets (converted from pages)
- \`lib/widgets/\` - Reusable widgets (converted from components)
- \`lib/utils/\` - Utility functions (converted from utils/lib)
- \`lib/models/\` - Data models (for future use)

## Statistics

- Screens: ${mapping.screens.length}
- Widgets: ${mapping.widgets.length}
- Utils: ${mapping.utils.length}

## Getting Started

1. Install Flutter: https://flutter.dev/docs/get-started/install
2. Get dependencies: \`flutter pub get\`
3. Run the app: \`flutter run\`

## Note

This is a v0.1 conversion - structure only. Code conversion will be added in future versions.
`;

    await fs.writeFile(
      path.join(this.outputPath, 'README.md'),
      readmeContent
    );
  }

  toPascalCase(name) {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

