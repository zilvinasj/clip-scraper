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
    const searchType = username === 'all' ? 'trending clips across platforms' : `clips for user: ${username}`;
    console.log(chalk.blue(`🔍 Searching for top ${searchType}`));
    
    const allClips: Clip[] = [];
    
    for (const platformName of platforms) {
      const platform = this.platforms.get(platformName);
      if (!platform) {
        console.log(chalk.yellow(`⚠️  Platform ${platformName} not configured, skipping...`));
        continue;
      }

      try {
        const searchTypeMsg = username === 'all' ? 'trending clips' : `clips for ${username}`;
        console.log(chalk.cyan(`📡 Fetching ${searchTypeMsg} from ${platformName}...`));
        
        // For "all", get more clips per platform to have better variety
        const platformLimit = username === 'all' ? Math.max(limit, 20) : limit;
        const clips = await platform.getTopClips(username, platformLimit);
        
        allClips.push(...clips);
        console.log(chalk.green(`✅ Found ${clips.length} clips from ${platformName}`));
        
        if (clips.length > 0 && username === 'all') {
          // Show a preview of top clip from this platform
          const topClip = clips[0];
          console.log(chalk.gray(`   🏆 Top: "${topClip.title}" (${topClip.viewCount.toLocaleString()} views)`));
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error fetching clips from ${platformName}: ${error}`));
      }
    }

    // Sort all clips by view count and take top results
    const sortedClips = allClips
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);

    console.log(chalk.blue(`📊 Total clips found: ${sortedClips.length}`));
    
    if (sortedClips.length > 0 && username === 'all') {
      console.log(chalk.magenta(`🌟 Top clip overall: "${sortedClips[0].title}" from ${sortedClips[0].platform} (${sortedClips[0].viewCount.toLocaleString()} views)`));
    }
    
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
