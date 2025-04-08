import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { callGeminiAPI } from './utils/geminiClient.js';

export async function convertPagesToScreens(nextAppPath, rnProjectPath) {
  const appDir = path.join(nextAppPath, 'app');
  const screensDir = path.join(rnProjectPath, 'screens');
  const appTsxPath = path.join(rnProjectPath, 'App.tsx');

  if (!fs.existsSync(appDir)) {
    console.log(chalk.red('❌ No app/ directory found in the Next.js project.'));
    return;
  }

  await fs.ensureDir(screensDir);

  const files = await fs.readdir(appDir);
  const allDependencies = new Set();

  console.log(chalk.cyan('\n🔄 Converting app/ pages into React Native screens...'));

  for (const file of files) {
    const fullPath = path.join(appDir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isFile() && file.endsWith('page.tsx')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      console.log(chalk.cyan(`🔁 Converting ${file} to Home.tsx...`));

      const { code: converted, dependencies } = await callGeminiAPI(content, 'page.tsx');

      const screenPath = path.join(screensDir, 'Home.tsx');
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

  if (allDependencies.size > 0) {
    const requirementPath = path.join(rnProjectPath, 'requirement.txt');
    const content = Array.from(allDependencies).sort().join('\n');
    await fs.writeFile(requirementPath, content);
    console.log(chalk.blueBright(`\n📦 Saved required packages to ${requirementPath}\n`));
  } else {
    console.log(chalk.yellow('⚠️ No dependencies detected.'));
  }

  console.log(chalk.greenBright('\n📱 Conversion complete!\n'));
}
