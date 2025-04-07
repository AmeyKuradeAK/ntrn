import prompts from 'prompts';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { convertPagesToScreens } from './convertPagesToScreens.js'; // ✅ Correct import

export async function createProjectFlow() {
  const { projectName, nextPath } = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Enter the name of the new React Native project:',
      validate: name => name ? true : 'Project name is required',
    },
    {
      type: 'text',
      name: 'nextPath',
      message: 'Enter the path to your Next.js project:',
      validate: input => fs.existsSync(input) ? true : 'Path does not exist',
    }
  ]);

  const targetPath = path.join(process.cwd(), projectName);

  console.log(chalk.cyan('\n🚀 Creating new Expo project...'));
  try {
    execSync(`npx create-expo-app@latest ${projectName} --template blank-typescript -y`, { stdio: 'inherit' });
    console.log(chalk.green('✅ Expo project created successfully.'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to create Expo project.'), error.message);
    return;
  }

  // Copy public/ → assets/
  const publicDir = path.join(nextPath, 'public');
  const assetDir = path.join(targetPath, 'assets');
  if (fs.existsSync(publicDir)) {
    console.log(chalk.cyan('📂 Copying public assets...'));
    await fs.copy(publicDir, assetDir);
    console.log(chalk.green('✅ Public assets copied to assets/'));
  }

  // Copy static/ directory if exists
  const staticDir = path.join(nextPath, 'static');
  const staticTarget = path.join(targetPath, 'static');
  if (fs.existsSync(staticDir)) {
    console.log(chalk.cyan('📂 Copying static directory...'));
    await fs.copy(staticDir, staticTarget);
    console.log(chalk.green('✅ Static directory copied.'));
  }

  // Check for Tailwind
  console.log(chalk.cyan('🔍 Checking for Tailwind usage...'));

  const pkgPath = path.join(nextPath, 'package.json');
  const postcssPath = fs.existsSync(path.join(nextPath, 'postcss.config.js'))
    ? path.join(nextPath, 'postcss.config.js')
    : fs.existsSync(path.join(nextPath, 'postcss.config.mjs'))
    ? path.join(nextPath, 'postcss.config.mjs')
    : null;

  let tailwindFound = false;

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['tailwindcss']) {
      tailwindFound = true;
    }
  }

  if (postcssPath) {
    const content = fs.readFileSync(postcssPath, 'utf-8');
    if (content.includes('tailwindcss')) {
      tailwindFound = true;
    }
  }

  if (tailwindFound) {
    console.log(chalk.green('✅ Tailwind detected! Setting up NativeWind...'));

    execSync(`cd ${projectName} && npm install nativewind tailwindcss`, { stdio: 'inherit' });

    const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
    `;
    fs.writeFileSync(path.join(targetPath, 'tailwind.config.js'), tailwindConfig.trim());

    const babelPath = path.join(targetPath, 'babel.config.js');
    if (fs.existsSync(babelPath)) {
      let babel = fs.readFileSync(babelPath, 'utf-8');
      if (!babel.includes('nativewind/babel')) {
        babel = babel.replace(
          /presets:\s*\[(.*?)\]/s,
          `presets: [$1],\n    plugins: ["nativewind/babel"]`
        );
        fs.writeFileSync(babelPath, babel);
      }
    }

    const appPath = path.join(targetPath, 'App.tsx');
    if (fs.existsSync(appPath)) {
      let appCode = fs.readFileSync(appPath, 'utf-8');
      if (!appCode.includes(`import 'nativewind/tailwind.css'`)) {
        appCode = `import 'nativewind/tailwind.css';\n` + appCode;
        fs.writeFileSync(appPath, appCode);
      }
    }

    console.log(chalk.green('✅ NativeWind fully configured in the Expo project.'));
  } else {
    console.log(chalk.yellow('🚫 No Tailwind config found in Next.js project. Skipping NativeWind setup.'));
  }

  console.log(chalk.greenBright('\n✅ React Native project setup complete. Ready for conversion phase!'));

  // === Phase 2: Convert app/pages using Gemini API ===
  console.log(chalk.blueBright('\n📦 Starting Gemini-based conversion from app/ to screens/...'));

  try {
    await convertPagesToScreens(nextPath, targetPath);
  } catch (err) {
    console.error(chalk.red('❌ Failed to convert app/ to screens/'), err.message);
  }

  console.log(chalk.greenBright('\n🎉 Conversion complete! Your React Native project is ready!\n'));
  console.log(chalk.cyan(`Next steps:
  ${chalk.green(`cd ${projectName}`)}
  ${chalk.green('npm run android')}   # Run on Android
  ${chalk.green('npm run ios')}       # Run on iOS (macOS only)
  ${chalk.green('npm run web')}       # Run on Web
`));
}
