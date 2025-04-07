import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { callGeminiAPI } from './utils/geminiClient.js';

export async function convertPagesToScreens(nextAppPath, rnProjectPath) {
  const appDir = path.join(nextAppPath, 'app');
  const screensDir = path.join(rnProjectPath, 'screens');
  const layoutPath = path.join(appDir, 'layout.tsx');
  const appTsxPath = path.join(rnProjectPath, 'App.tsx');

  if (!fs.existsSync(appDir)) {
    console.log(chalk.red('❌ No app/ directory found in the Next.js project.'));
    return;
  }

  await fs.ensureDir(screensDir);

  const files = await fs.readdir(appDir);

  console.log(chalk.cyan('\n🔄 Converting app/ pages into React Native screens...'));

  const allDependencies = new Set();

  // Convert layout.tsx → App.tsx
  if (fs.existsSync(layoutPath)) {
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    console.log(chalk.cyan('🧠 Converting layout.tsx to App.tsx...'));

    const { code: convertedAppTsx, dependencies } = await callGeminiAPI(layoutContent, 'layout.tsx');
    await fs.writeFile(appTsxPath, convertedAppTsx);
    console.log(chalk.green('✅ Converted: layout.tsx → App.tsx'));

    Object.keys(dependencies).forEach(dep => allDependencies.add(dep));
  } else {
    console.log(chalk.yellow('⚠️ No layout.tsx found. Skipping App.tsx conversion.'));
  }

  // Convert page.tsx files → screens/
  for (const file of files) {
    const fullPath = path.join(appDir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isFile() && file.endsWith('.tsx') && file !== 'layout.tsx') {
      const content = await fs.readFile(fullPath, 'utf-8');
      const { code: converted, dependencies } = await callGeminiAPI(content, file);

      const screenName = file.replace('.tsx', '.tsx');
      const destPath = path.join(screensDir, screenName);
      await fs.writeFile(destPath, converted);
      console.log(chalk.green(`✅ Converted: ${file} → screens/${screenName}`));

      Object.keys(dependencies).forEach(dep => allDependencies.add(dep));
    }
  }

  // Write dependencies to requirement.txt
  if (allDependencies.size > 0) {
    const requirementPath = path.join(rnProjectPath, 'requirement.txt');
    const content = Array.from(allDependencies).sort().join('\n');
    await fs.writeFile(requirementPath, content);
    console.log(chalk.blueBright(`\n📦 Saved required packages to ${requirementPath}\n`));
  } else {
    console.log(chalk.yellow('⚠️ No dependencies detected.'));
  }

  console.log(chalk.greenBright('\n📱 All app/ pages converted to React Native screens!\n'));
}
