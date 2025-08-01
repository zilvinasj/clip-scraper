import { TwitchPlatform } from './platforms/twitch-platform';
import { YouTubePlatform } from './platforms/youtube-platform';
import { KickPlatform } from './platforms/kick-platform';
import { ClipDownloader } from './downloader/clip-downloader';
import { Clip, ClipScraperConfig } from './types';
import chalk from 'chalk';

export class ClipScraper {
  private config: ClipScraperConfig;
  private platforms: Map<string, any> = new Map();
  private downloader: ClipDownloader;

  constructor(config: ClipScraperConfig) {
    this.config = config;
    this.downloader = new ClipDownloader(config.download);
    this.initializePlatforms();
  }

  private initializePlatforms(): void {
    if (this.config.twitch) {
      this.platforms.set('twitch', new TwitchPlatform(this.config.twitch));
    }
    
    if (this.config.youtube) {
      this.platforms.set('youtube', new YouTubePlatform(this.config.youtube));
    }
    
    if (this.config.kick) {
      this.platforms.set('kick', new KickPlatform(this.config.kick));
    }
  }

  async scrapeClips(username: string | 'all', platforms: string[] = ['twitch', 'youtube', 'kick'], limit = 10): Promise<Clip[]> {
    console.log(chalk.blue(`🔍 Searching for top clips for: ${username}`));
    
    const allClips: Clip[] = [];
    
    for (const platformName of platforms) {
      const platform = this.platforms.get(platformName);
      if (!platform) {
        console.log(chalk.yellow(`⚠️  Platform ${platformName} not configured, skipping...`));
        continue;
      }

      try {
        console.log(chalk.cyan(`📡 Fetching clips from ${platformName}...`));
        const clips = await platform.getTopClips(username, limit);
        allClips.push(...clips);
        console.log(chalk.green(`✅ Found ${clips.length} clips from ${platformName}`));
      } catch (error) {
        console.error(chalk.red(`❌ Error fetching clips from ${platformName}: ${error}`));
      }
    }

    // Sort all clips by view count and take top results
    const sortedClips = allClips
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);

    console.log(chalk.blue(`📊 Total clips found: ${sortedClips.length}`));
    return sortedClips;
  }

  async downloadClips(clips: Clip[]): Promise<string[]> {
    console.log(chalk.blue(`📥 Starting download of ${clips.length} clips...`));
    
    const downloadedFiles = await this.downloader.downloadClips(clips);
    
    console.log(chalk.green(`🎉 Downloaded ${downloadedFiles.length} clips successfully!`));
    return downloadedFiles;
  }

  async scrapeAndDownload(username: string | 'all', platforms: string[] = ['twitch', 'youtube', 'kick'], limit = 10): Promise<string[]> {
    const clips = await this.scrapeClips(username, platforms, limit);
    
    if (clips.length === 0) {
      console.log(chalk.yellow('📭 No clips found matching the criteria'));
      return [];
    }

    console.log(chalk.blue('\n📋 Top clips found:'));
    clips.forEach((clip, index) => {
      console.log(chalk.white(`${index + 1}. ${clip.title}`));
      console.log(chalk.gray(`   👀 ${clip.viewCount.toLocaleString()} views | 📺 ${clip.platform} | 👤 ${clip.creator}`));
    });

    console.log(''); // Empty line for better readability
    return await this.downloadClips(clips);
  }
}
