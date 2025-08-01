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

  async initialize(): Promise<void> {
    await this.downloader.initialize();
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

  async scrapeClips(username: string | 'all', platforms: string[] = ['twitch', 'youtube', 'kick'], limit = 10, offset = 0): Promise<Clip[]> {
    const searchType = username === 'all' ? 'trending clips across platforms' : `clips for user: ${username}`;
    console.log(chalk.blue(`🔍 Searching for top ${searchType} (offset: ${offset})`));
    
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
        // Also add offset to get different clips in subsequent calls
        const platformLimit = username === 'all' ? Math.max(limit + offset, 20) : limit + offset;
        const clips = await platform.getTopClips(username, platformLimit);
        
        // Apply offset to get different clips
        const offsetClips = clips.slice(offset);
        
        allClips.push(...offsetClips);
        console.log(chalk.green(`✅ Found ${offsetClips.length} clips from ${platformName} (after offset)`));
        
        if (offsetClips.length > 0 && username === 'all') {
          // Show a preview of top clip from this platform
          const topClip = offsetClips[0];
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
    // Initialize download tracker
    await this.initialize();
    
    const downloadedFiles: string[] = [];
    let currentOffset = 0;
    let attempts = 0;
    const maxAttempts = 10; // Limit attempts to avoid infinite loops
    
    console.log(chalk.blue(`🔍 Searching for ${limit} unique clips...`));
    
    while (downloadedFiles.length < limit && attempts < maxAttempts) {
      // Calculate how many more clips we need
      const remaining = limit - downloadedFiles.length;
      
      // Fetch clips with current offset
      const fetchLimit = Math.min(remaining * 2, 50);
      
      const clips = await this.scrapeClips(username, platforms, fetchLimit, currentOffset);
      
      if (clips.length === 0) {
        console.log(chalk.yellow('📭 No more clips found matching the criteria'));
        break;
      }

      // Filter out already downloaded clips
      const newClips = clips.filter(clip => !this.downloader.isAlreadyDownloaded(clip));
      
      if (newClips.length === 0) {
        console.log(chalk.yellow(`⚠️  All ${clips.length} fetched clips have already been downloaded, trying next batch...`));
        currentOffset += fetchLimit;
        attempts++;
        continue;
      }

      // Take only what we need
      const clipsToDownload = newClips.slice(0, remaining);
      
      console.log(chalk.blue(`\n📋 New clips to download (${clipsToDownload.length}/${remaining} needed):`));
      clipsToDownload.forEach((clip, index) => {
        console.log(chalk.white(`${downloadedFiles.length + index + 1}. ${clip.title}`));
        console.log(chalk.gray(`   👀 ${clip.viewCount.toLocaleString()} views | 📺 ${clip.platform} | 👤 ${clip.creator}`));
      });

      console.log(''); // Empty line for better readability
      
      // Download the clips
      const newDownloadedFiles = await this.downloadClips(clipsToDownload);
      downloadedFiles.push(...newDownloadedFiles.filter(file => file)); // Filter out any null/undefined
      
      // If we got fewer new clips than expected, increase offset for next iteration
      if (newClips.length < remaining) {
        currentOffset += fetchLimit;
      }
      
      attempts++;
    }
    
    if (downloadedFiles.length < limit) {
      console.log(chalk.yellow(`\n⚠️  Could only find ${downloadedFiles.length} unique clips out of ${limit} requested`));
    } else {
      console.log(chalk.green(`\n🎉 Successfully found and downloaded ${downloadedFiles.length} unique clips!`));
    }
    
    return downloadedFiles;
  }
}
