import youtubeDl from 'youtube-dl-exec';
import { promises as fs } from 'fs';
import path from 'path';
import { Clip, DownloadOptions } from '../types';

export class ClipDownloader {
  private options: DownloadOptions;

  constructor(options: DownloadOptions) {
    this.options = options;
  }

  async downloadClip(clip: Clip): Promise<string> {
    const sanitizedTitle = this.sanitizeFilename(clip.title);
    const date = clip.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${sanitizedTitle}_${date}_${clip.platform}`;
    
    const userFolder = path.join(this.options.outputPath, clip.creator);
    await this.ensureDirectoryExists(userFolder);
    
    const outputPath = path.join(userFolder, filename);

    try {
      console.log(`Downloading: ${clip.title} by ${clip.creator}`);
      
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
      const files = await fs.readdir(userFolder);
      const downloadedFile = files.find(file => file.startsWith(filename));
      
      if (downloadedFile) {
        const fullPath = path.join(userFolder, downloadedFile);
        console.log(`✅ Downloaded: ${downloadedFile}`);
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
    
    for (const clip of clips) {
      try {
        const filePath = await this.downloadClip(clip);
        downloadedFiles.push(filePath);
      } catch (error) {
        console.error(`Failed to download clip ${clip.title}: ${error}`);
      }
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
}
