import chalk from 'chalk';

export class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 15; // Conservative for Gemini free tier
    this.requestsPerHour = options.requestsPerHour || 1000; // Adjust based on quota
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 2000; // 2 seconds base delay
    this.maxDelay = options.maxDelay || 60000; // 1 minute max delay
    
    this.requestQueue = [];
    this.requestHistory = [];
    this.isProcessing = false;
    this.retryDelays = new Map(); // Track retry delays for each request
  }

  async addRequest(requestFn, context = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFn,
        context,
        resolve,
        reject,
        attempts: 0,
        id: Math.random().toString(36).substr(2, 9)
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        // Check rate limits before processing
        await this.checkRateLimits();
        
        // Execute the request
        const result = await this.executeRequest(request);
        request.resolve(result);
        
        // Track successful request
        this.requestHistory.push({
          timestamp: Date.now(),
          success: true,
          id: request.id
        });
        
      } catch (error) {
        const shouldRetry = await this.handleError(error, request);
        
        if (shouldRetry) {
          // Add back to queue for retry
          this.requestQueue.unshift(request);
        } else {
          request.reject(error);
        }
      }
      
      // Add delay between requests
      await this.delay(this.getInterRequestDelay());
    }
    
    this.isProcessing = false;
  }

  async executeRequest(request) {
    request.attempts++;
    
    console.log(chalk.gray(
      `  [${request.attempts}/${this.maxRetries + 1}] Processing: ${request.context.fileName || 'unknown'}`
    ));
    
    const startTime = Date.now();
    const result = await request.requestFn();
    const duration = Date.now() - startTime;
    
    console.log(chalk.green(
      `  ✅ Completed in ${duration}ms: ${request.context.fileName || 'unknown'}`
    ));
    
    return result;
  }

  async handleError(error, request) {
    const isRateLimit = this.isRateLimitError(error);
    const isQuotaExceeded = this.isQuotaExceededError(error);
    const isServerOverload = this.isServerOverloadError(error);
    
    console.error(chalk.red(
      `  ❌ Error (attempt ${request.attempts}): ${request.context.fileName || 'unknown'}`
    ));
    
    if (isQuotaExceeded) {
      console.error(chalk.red('  💰 Quota exceeded - conversion paused'));
      console.log(chalk.yellow(`
⚠️  Gemini API Quota Exhausted
  
Options to continue:
1. Wait for quota reset (usually 24 hours)
2. Upgrade your Gemini API plan
3. Use a different API key
4. Resume conversion later

The conversion will be paused. You can resume by running the tool again.
      `));
      
      // Don't retry quota exceeded errors
      return false;
    }
    
    if ((isRateLimit || isServerOverload) && request.attempts <= this.maxRetries) {
      const delay = this.calculateRetryDelay(request.attempts, isServerOverload);
      
      console.log(chalk.yellow(
        `  ⏳ Rate limited, retrying in ${Math.round(delay / 1000)}s...`
      ));
      
      await this.delay(delay);
      return true; // Retry
    }
    
    return false; // Don't retry
  }

  isRateLimitError(error) {
    return error.response?.data?.error?.code === 429 ||
           error.response?.status === 429 ||
           (error.message && error.message.includes('rate limit'));
  }

  isQuotaExceededError(error) {
    return error.response?.data?.error?.code === 429 &&
           error.response?.data?.error?.message?.includes('quota');
  }

  isServerOverloadError(error) {
    return error.response?.data?.error?.code === 503 ||
           error.response?.status === 503 ||
           (error.message && error.message.includes('overloaded'));
  }

  calculateRetryDelay(attemptNumber, isServerOverload) {
    // Exponential backoff with jitter
    const baseMultiplier = isServerOverload ? 2 : 1.5;
    const exponentialDelay = this.baseDelay * Math.pow(baseMultiplier, attemptNumber - 1);
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const delay = Math.min(exponentialDelay + jitter, this.maxDelay);
    
    return Math.max(delay, this.baseDelay);
  }

  async checkRateLimits() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    
    // Clean old history
    this.requestHistory = this.requestHistory.filter(
      req => req.timestamp > oneHourAgo
    );
    
    const recentRequests = this.requestHistory.filter(
      req => req.timestamp > oneMinuteAgo
    );
    
    const hourlyRequests = this.requestHistory.length;
    
    // Check minute rate limit
    if (recentRequests.length >= this.requestsPerMinute) {
      const oldestRecent = Math.min(...recentRequests.map(r => r.timestamp));
      const waitTime = 60000 - (now - oldestRecent);
      
      if (waitTime > 0) {
        console.log(chalk.yellow(
          `⏳ Rate limit: waiting ${Math.round(waitTime / 1000)}s...`
        ));
        await this.delay(waitTime);
      }
    }
    
    // Check hourly rate limit
    if (hourlyRequests >= this.requestsPerHour) {
      const oldestHourly = Math.min(...this.requestHistory.map(r => r.timestamp));
      const waitTime = 3600000 - (now - oldestHourly);
      
      if (waitTime > 0) {
        console.log(chalk.yellow(
          `⏳ Hourly limit reached: waiting ${Math.round(waitTime / 60000)}m...`
        ));
        await this.delay(Math.min(waitTime, 300000)); // Max 5 minute wait
      }
    }
  }

  getInterRequestDelay() {
    // Dynamic delay based on recent success rate
    const recentRequests = this.requestHistory.filter(
      req => req.timestamp > Date.now() - 300000 // Last 5 minutes
    );
    
    if (recentRequests.length === 0) return 1000;
    
    const successRate = recentRequests.filter(r => r.success).length / recentRequests.length;
    
    if (successRate > 0.9) return 1000; // 1 second if high success rate
    if (successRate > 0.7) return 2000; // 2 seconds if moderate success rate
    return 4000; // 4 seconds if low success rate
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      recentRequests: this.requestHistory.filter(
        req => req.timestamp > Date.now() - 60000
      ).length,
      totalProcessed: this.requestHistory.length
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log(chalk.yellow('🛑 Shutting down rate limiter...'));
    
    // Wait for current queue to finish
    while (this.requestQueue.length > 0 && this.isProcessing) {
      await this.delay(1000);
    }
    
    console.log(chalk.green('✅ Rate limiter shutdown complete'));
  }
} 