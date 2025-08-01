import youtubeDl from 'youtube-dl-exec';
import { promises as fs } from 'fs';
import path from 'path';
import { Clip, DownloadOptions } from '../types';
import { DownloadTracker } from './download-tracker';

export class ClipDownloader {
  private options: DownloadOptions;
  private tracker: DownloadTracker;

  constructor(options: DownloadOptions) {
    this.options = options;
    this.tracker = new DownloadTracker(options.outputPath);
  }

  async initialize(): Promise<void> {
    await this.tracker.loadDownloadHistory();
  }

  async downloadClip(clip: Clip): Promise<string> {
    // Check if already downloaded
    if (this.tracker.isAlreadyDownloaded(clip)) {
      console.log(`⏭️  Skipping (already downloaded): ${clip.title} by ${clip.creator} (${clip.platform})`);
      
      // Return the expected file path even though we're skipping
      const sanitizedTitle = this.sanitizeFilename(clip.title);
      const date = clip.createdAt.toISOString().split('T')[0];
      const filename = `${sanitizedTitle}_${date}`;
      const userFolder = path.join(this.options.outputPath, clip.creator);
      const platformFolder = path.join(userFolder, clip.platform);
      
      // Try to find existing file with any extension
      try {
        const files = await fs.readdir(platformFolder);
        const existingFile = files.find(file => file.startsWith(filename));
        if (existingFile) {
          return path.join(platformFolder, existingFile);
        }
      } catch (error) {
        // Directory might not exist, that's okay
      }
      
      return path.join(platformFolder, `${filename}.mp4`); // Return expected path
    }

    const sanitizedTitle = this.sanitizeFilename(clip.title);
    const date = clip.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${sanitizedTitle}_${date}`;
    
    // Create folder structure: downloads/{username}/{platform}/
    const userFolder = path.join(this.options.outputPath, clip.creator);
    const platformFolder = path.join(userFolder, clip.platform);
    await this.ensureDirectoryExists(platformFolder);
    
    const outputPath = path.join(platformFolder, filename);

    try {
      console.log(`Downloading: ${clip.title} by ${clip.creator} (${clip.platform})`);
      
      const downloadOptions: any = {
        output: `${outputPath}.%(ext)s`,
        format: this.options.format || 'best',
      };

      if (this.options.quality && this.options.quality !== 'best') {
        downloadOptions.format = `best[height<=${this.options.quality}]`;
      }

      // Handle different platforms
      if (clip.platform === 'kick') {
        // For Kick, we might need to use a different approach
        downloadOptions.format = 'best';
      }

      await youtubeDl(clip.url, downloadOptions);
      
      // Find the actual downloaded file (extension might vary)
      const files = await fs.readdir(platformFolder);
      const downloadedFile = files.find(file => file.startsWith(filename));
      
      if (downloadedFile) {
        const fullPath = path.join(platformFolder, downloadedFile);
        console.log(`✅ Downloaded: ${clip.creator}/${clip.platform}/${downloadedFile}`);
        
        // Mark as downloaded in tracker
        this.tracker.markAsDownloaded(clip);
        await this.tracker.saveDownloadHistory();
        
        return fullPath;
      } else {
        throw new Error('Downloaded file not found');
      }
    } catch (error) {
      console.error(`❌ Failed to download ${clip.title}: ${error}`);
      throw error;
    }
  }

  async downloadClips(clips: Clip[]): Promise<string[]> {
    const downloadedFiles: string[] = [];
    let skippedCount = 0;
    let downloadedCount = 0;
    
    for (const clip of clips) {
      try {
        if (this.tracker.isAlreadyDownloaded(clip)) {
          skippedCount++;
          // Still add to the list for reporting purposes
          const filePath = await this.downloadClip(clip);
          downloadedFiles.push(filePath);
        } else {
          const filePath = await this.downloadClip(clip);
          downloadedFiles.push(filePath);
          downloadedCount++;
        }
      } catch (error) {
        console.error(`Failed to download clip ${clip.title}: ${error}`);
      }
    }
    
    // Report statistics
    if (skippedCount > 0) {
      console.log(`📊 Skipped ${skippedCount} already downloaded clips, downloaded ${downloadedCount} new clips`);
    }
    
    return downloadedFiles;
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // Limit length
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Get download statistics
  async getStats(): Promise<{ total: number; byPlatform: Record<string, number> }> {
    return this.tracker.getStats();
  }

  // Clear download history (useful for testing or fresh start)
  async clearHistory(): Promise<void> {
    await this.tracker.clearHistory();
    console.log('📝 Download history cleared');
  }
}
