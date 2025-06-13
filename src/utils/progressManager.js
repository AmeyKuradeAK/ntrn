import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class ProgressManager {
  constructor(projectPath, outputPath) {
    this.projectPath = projectPath;
    this.outputPath = outputPath;
    this.progressFile = path.join(outputPath, '.ntrn-progress.json');
    this.checkpointInterval = 10; // Save progress every 10 files
    this.lastSave = 0;
  }

  async loadProgress() {
    if (await fs.exists(this.progressFile)) {
      try {
        const data = await fs.readFile(this.progressFile, 'utf-8');
        const progress = JSON.parse(data);
        
        console.log(chalk.cyan(`📂 Found previous conversion progress (${progress.completed.length} files completed)`));
        
        const shouldResume = await this.promptResume();
        if (shouldResume) {
          return progress;
        } else {
          await this.clearProgress();
          return this.createNewProgress();
        }
      } catch (error) {
        console.warn(chalk.yellow('⚠️ Could not load previous progress, starting fresh'));
        return this.createNewProgress();
      }
    }
    
    return this.createNewProgress();
  }

  async promptResume() {
    const prompts = await import('prompts');
    const response = await prompts.default({
      type: 'toggle',
      name: 'resume',
      message: 'Resume previous conversion?',
      initial: true,
      active: 'yes',
      inactive: 'no (start fresh)'
    });
    
    return response.resume;
  }

  createNewProgress() {
    return {
      startTime: Date.now(),
      projectPath: this.projectPath,
      outputPath: this.outputPath,
      completed: [],
      failed: [],
      remaining: [],
      metadata: {
        version: '2.2.1',
        lastUpdate: Date.now()
      }
    };
  }

  async saveProgress(progress) {
    progress.metadata.lastUpdate = Date.now();
    
    try {
      await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
      this.lastSave = Date.now();
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not save progress'));
    }
  }

  async updateProgress(progress, completedFile, failed = false, error = null) {
    if (failed) {
      progress.failed.push({
        file: completedFile,
        error: error?.message || 'Unknown error',
        errorType: error?.response?.data?.error?.code || 'unknown',
        timestamp: Date.now()
      });
    } else {
      progress.completed.push({
        file: completedFile,
        timestamp: Date.now()
      });
    }

    // Remove from remaining
    progress.remaining = progress.remaining.filter(file => file !== completedFile);

    // Periodic save
    if (progress.completed.length - this.lastSave >= this.checkpointInterval) {
      await this.saveProgress(progress);
      console.log(chalk.blue(`💾 Progress saved (${progress.completed.length} files completed)`));
    }
  }

  filterCompletedFiles(allFiles, progress) {
    const completedFiles = new Set(progress.completed.map(item => 
      typeof item === 'string' ? item : item.file
    ));
    
    const remainingFiles = allFiles.filter(file => !completedFiles.has(file));
    progress.remaining = remainingFiles;
    
    if (completedFiles.size > 0) {
      console.log(chalk.green(`⏭️  Skipping ${completedFiles.size} already completed files`));
      console.log(chalk.cyan(`📋 Remaining: ${remainingFiles.length} files to convert`));
    }
    
    return remainingFiles;
  }

  async clearProgress() {
    if (await fs.exists(this.progressFile)) {
      await fs.remove(this.progressFile);
    }
  }

  async finalizeProgress(progress, conversionResults) {
    // Add final statistics
    progress.endTime = Date.now();
    progress.duration = progress.endTime - progress.startTime;
    progress.statistics = {
      totalFiles: progress.completed.length + progress.failed.length,
      successful: progress.completed.length,
      failed: progress.failed.length,
      successRate: Math.round((progress.completed.length / (progress.completed.length + progress.failed.length)) * 100)
    };

    await this.saveProgress(progress);

    // Generate summary report
    const summaryReport = this.generateSummaryReport(progress, conversionResults);
    const reportPath = path.join(this.outputPath, 'conversion-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(summaryReport, null, 2));

    console.log(chalk.green(`📊 Final progress saved to conversion-summary.json`));
    
    // Clean up progress file on successful completion
    if (progress.failed.length === 0) {
      await this.clearProgress();
    }
  }

  generateSummaryReport(progress, conversionResults) {
    const duration = progress.duration || 0;
    const durationMinutes = Math.round(duration / 60000);
    
    return {
      conversion: {
        startTime: new Date(progress.startTime).toISOString(),
        endTime: new Date(progress.endTime).toISOString(),
        duration: `${durationMinutes} minutes`,
        version: '2.2.1'
      },
      statistics: progress.statistics,
      files: {
        screens: conversionResults.screens.length,
        components: conversionResults.components.length,
        libraries: conversionResults.libs.length,
        hooks: conversionResults.hooks.length
      },
      errors: progress.failed,
      performance: {
        avgTimePerFile: duration > 0 ? Math.round(duration / (progress.completed.length + progress.failed.length)) : 0,
        filesPerMinute: durationMinutes > 0 ? Math.round((progress.completed.length + progress.failed.length) / durationMinutes) : 0
      }
    };
  }

  async setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(chalk.yellow(`\n🛑 Received ${signal}, saving progress...`));
      
      // The progress will be saved by the main conversion loop
      console.log(chalk.cyan('💾 Progress has been saved. You can resume the conversion later.'));
      console.log(chalk.gray('Run the same command again to resume from where you left off.'));
      
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handle Windows Ctrl+C
    if (process.platform === "win32") {
      const rl = await import('readline');
      const readline = rl.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.on("SIGINT", () => {
        process.emit("SIGINT");
      });
    }
  }

  async cleanup() {
    // Alias for clearProgress for backwards compatibility
    await this.clearProgress();
  }
} 