import { EmailTemplate } from './templates';

export interface EmailJob {
  id: string;
  to: string | string[];
  template: EmailTemplate;
  priority: 'low' | 'normal' | 'high';
  retries: number;
  maxRetries: number;
  scheduledAt?: Date;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}

export interface EmailQueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

export class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  private options: Required<EmailQueueOptions>;

  constructor(options: EmailQueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 5000, // 5 seconds
      batchSize: options.batchSize ?? 10,
    };
  }

  async addEmail(
    to: string | string[],
    template: EmailTemplate,
    priority: 'low' | 'normal' | 'high' = 'normal',
    scheduledAt?: Date
  ): Promise<string> {
    const job: EmailJob = {
      id: this.generateId(),
      to,
      template,
      priority,
      retries: 0,
      maxRetries: this.options.maxRetries,
      scheduledAt,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.sortQueue();

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return job.id;
  }

  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by scheduled time (if any)
      if (a.scheduledAt && b.scheduledAt) {
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      }
      if (a.scheduledAt) return 1;
      if (b.scheduledAt) return -1;
      
      // Finally by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.getReadyJobs();
        if (batch.length === 0) {
          // No jobs ready, wait a bit
          await this.sleep(1000);
          continue;
        }

        await this.processBatch(batch);
      }
    } finally {
      this.processing = false;
    }
  }

  private getReadyJobs(): EmailJob[] {
    const now = new Date();
    return this.queue
      .filter(job => !job.scheduledAt || job.scheduledAt <= now)
      .slice(0, this.options.batchSize);
  }

  private async processBatch(jobs: EmailJob[]): Promise<void> {
    const { emailService } = await import('./service');

    for (const job of jobs) {
      try {
        await emailService.sendTemplate(job.to, job.template);
        
        // Remove successful job from queue
        this.removeJob(job.id);
        
        console.log(`Email sent successfully: ${job.id}`);
      } catch (error) {
        job.retries++;
        job.lastAttempt = new Date();
        job.error = error instanceof Error ? error.message : 'Unknown error';

        if (job.retries >= job.maxRetries) {
          // Max retries reached, remove from queue
          this.removeJob(job.id);
          console.error(`Email failed after ${job.maxRetries} retries: ${job.id}`, error);
        } else {
          // Schedule retry
          job.scheduledAt = new Date(Date.now() + this.options.retryDelay * job.retries);
          console.warn(`Email retry scheduled: ${job.id} (attempt ${job.retries + 1})`);
        }
      }
    }

    this.sortQueue();
  }

  private removeJob(id: string): void {
    const index = this.queue.findIndex(job => job.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getQueueStatus() {
    return {
      total: this.queue.length,
      processing: this.processing,
      byPriority: {
        high: this.queue.filter(j => j.priority === 'high').length,
        normal: this.queue.filter(j => j.priority === 'normal').length,
        low: this.queue.filter(j => j.priority === 'low').length,
      },
      failed: this.queue.filter(j => j.retries >= j.maxRetries).length,
    };
  }

  clearQueue(): void {
    this.queue = [];
  }
}

export const emailQueue = new EmailQueue();