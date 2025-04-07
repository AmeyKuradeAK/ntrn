#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';

const program = new Command();

process.removeAllListeners('warning');
process.on('warning', (e) => {
  if (e.name === 'DeprecationWarning' && e.message.includes('punycode')) {
    // Suppress this specific warning
    return;
  }
  // Show all other warnings
  console.warn(e);
});


program
  .name('ntrn')
  .version('1.0.0')
  .description(
    chalk.cyanBright(figlet.textSync('NTRN')) +
    '\n' +
    chalk.white.bold('Next.js → React Native Converter CLI') +
    '\n\n' +
    chalk.white('Easily convert a Next.js project into a fully working Expo React Native project.') +
    '\n\n' +
    chalk.yellowBright('Usage:') +
    '\n' +
    chalk.white('  $ ntrn') +
    '\n' +
    chalk.white('  $ ntrn --help') +
    '\n' +
    chalk.white('  $ ntrn --version') +
    '\n\n' +
    chalk.yellowBright('Example:') +
    '\n' +
    chalk.white('  $ ntrn') +
    '\n' +
    chalk.gray('  > Enter your new Expo project name: ') + chalk.green('my-rn-app') +
    '\n' +
    chalk.gray('  > Enter path to your Next.js project: ') + chalk.green('./nextjs-app')
  )
  .action(async () => {
    // Show NTRN ASCII banner on CLI start
    console.log(chalk.cyanBright(figlet.textSync('NTRN')));

    const { createProjectFlow } = await import('./createExpoProject.js');
    await createProjectFlow(); // handles prompts internally now
  });

program.parse(process.argv);
