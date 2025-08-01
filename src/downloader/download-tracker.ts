import { promises as fs } from 'fs';
import path from 'path';
import { Clip } from '../types';

export class DownloadTracker {
  private trackingFile: string;
  private downloadedIds: Set<string> = new Set();

  constructor(outputPath: string) {
    this.trackingFile = path.join(outputPath, '.downloaded_clips.json');
  }

  async loadDownloadHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.trackingFile, 'utf-8');
      const history = JSON.parse(data);
      this.downloadedIds = new Set(history.downloadedIds || []);
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.downloadedIds = new Set();
    }
  }

  async saveDownloadHistory(): Promise<void> {
    const history = {
      downloadedIds: Array.from(this.downloadedIds),
      lastUpdated: new Date().toISOString(),
      totalDownloaded: this.downloadedIds.size
    };

    try {
      await fs.writeFile(this.trackingFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.warn(`Failed to save download history: ${error}`);
    }
  }

  isAlreadyDownloaded(clip: Clip): boolean {
    // Create a unique identifier for each clip
    const uniqueId = this.createUniqueId(clip);
    return this.downloadedIds.has(uniqueId);
  }

  markAsDownloaded(clip: Clip): void {
    const uniqueId = this.createUniqueId(clip);
    this.downloadedIds.add(uniqueId);
  }

  private createUniqueId(clip: Clip): string {
    // Create a unique identifier combining platform, clip ID, and creator
    // This ensures uniqueness across platforms and handles edge cases
    return `${clip.platform}:${clip.id}:${clip.creator}`;
  }

  getDownloadedCount(): number {
    return this.downloadedIds.size;
  }

  getDownloadedIds(): string[] {
    return Array.from(this.downloadedIds);
  }

  async clearHistory(): Promise<void> {
    this.downloadedIds.clear();
    await this.saveDownloadHistory();
  }

  // Get statistics about downloaded content
  getStats(): { total: number; byPlatform: Record<string, number> } {
    const byPlatform: Record<string, number> = {};
    
    for (const id of this.downloadedIds) {
      const platform = id.split(':')[0];
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    }

    return {
      total: this.downloadedIds.size,
      byPlatform
    };
  }
}
