import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { callGeminiAPI } from './utils/geminiClient.js';

export async function convertPagesToScreens(nextAppPath, rnProjectPath) {
  const appDir = path.join(nextAppPath, 'app');
  const nextComponentsDir = path.join(nextAppPath, 'components');
  const rnScreensDir = path.join(rnProjectPath, 'screens');
  const rnComponentsDir = path.join(rnProjectPath, 'components');
  const appTsxPath = path.join(rnProjectPath, 'App.tsx');

  const allDependencies = new Set();

  // Ensure screens and components directories exist
  await fs.ensureDir(rnScreensDir);
  await fs.ensureDir(rnComponentsDir);

  console.log(chalk.cyan('\n🔄 Converting app/ pages into React Native screens...'));

  // Convert all page.tsx files in app/
  const files = await fs.readdir(appDir);
  for (const file of files) {
    const fullPath = path.join(appDir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isFile() && file.endsWith('page.tsx')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      console.log(chalk.cyan(`🔁 Converting ${file} to Home.tsx...`));

      const { code: converted, dependencies } = await callGeminiAPI(content, file);

      const screenPath = path.join(rnScreensDir, 'Home.tsx');
      await fs.writeFile(screenPath, converted);
      console.log(chalk.green(`✅ Converted: ${file} → screens/Home.tsx`));

      Object.keys(dependencies).forEach(dep => allDependencies.add(dep));

      // Generate App.tsx importing Home
      const appContent = `
import React from 'react';
import { SafeAreaView } from 'react-native';
import Home from './screens/Home';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Home />
    </SafeAreaView>
  );
}
      `.trim();

      await fs.writeFile(appTsxPath, appContent);
      console.log(chalk.green('✅ Generated App.tsx importing Home screen.'));
    }
  }

  // Convert all components from Next.js components/ folder
  if (fs.existsSync(nextComponentsDir)) {
    console.log(chalk.cyan('\n🔄 Converting components/ to React Native components...'));
    const componentFiles = await fs.readdir(nextComponentsDir);

    for (const file of componentFiles) {
      const fullPath = path.join(nextComponentsDir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isFile() && file.endsWith('.tsx')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const { code: converted, dependencies } = await callGeminiAPI(content, file);

        const outputPath = path.join(rnComponentsDir, file);
        await fs.writeFile(outputPath, converted);
        console.log(chalk.green(`✅ Converted component: ${file} → components/${file}`));

        Object.keys(dependencies).forEach(dep => allDependencies.add(dep));
      }
    }
  } else {
    console.log(chalk.yellow('⚠️ No components/ folder found in the Next.js project.'));
  }

  // Write all dependencies to requirement.txt
  if (allDependencies.size > 0) {
    const requirementPath = path.join(rnProjectPath, 'requirement.txt');
    const content = Array.from(allDependencies).sort().join('\n');
    await fs.writeFile(requirementPath, content);
    console.log(chalk.blueBright(`\n📦 Saved required packages to ${requirementPath}\n`));
  } else {
    console.log(chalk.yellow('⚠️ No dependencies detected.'));
  }

  console.log(chalk.greenBright('\n✅ Conversion complete! Your React Native app is ready.\n'));
}
