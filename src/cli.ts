#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { ClipScraper } from './clip-scraper';
import { ClipScraperConfig } from './types';
import chalk from 'chalk';
import path from 'path';

// Load environment variables
config();

const program = new Command();

program
  .name('clip-scraper')
  .description('Find and download the most viewed clips from Twitch and Kick')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape and download clips for a specific user or get trending clips from across the platform')
  .argument('<username>', 'Username to scrape clips for, or "all" for top trending clips across the entire platform')
  .option('-p, --platforms [platforms...]', 'Platforms to scrape (twitch, kick)', ['twitch', 'kick'])
  .option('-l, --limit <number>', 'Maximum number of clips to download (when using "all", gets best clips from across all platforms)', '10')
  .option('-o, --output <path>', 'Output directory for downloaded clips', './downloads')
  .option('-q, --quality <quality>', 'Video quality (e.g., 720, 1080)', 'best')
  .option('--min-views <number>', 'Minimum view count for clips', '0')
  .option('--social-media', 'Create social media versions (square and vertical) of downloaded clips', true)
  .option('--no-social-media', 'Disable social media version creation')
  .option('--social-formats [formats...]', 'Social media formats to create (square, vertical)', ['square', 'vertical'])
  .option('--social-duration <seconds>', 'Maximum duration for social media clips in seconds', '59')
  .option('--no-background-blur', 'Disable blurred background for social media versions')
  .action(async (username, options) => {
    try {
      console.log(chalk.blue.bold('🎬 Clip Scraper Started\n'));

      // Validate required environment variables
      const requiredEnvVars = [];
      
      if (options.platforms.includes('twitch')) {
        if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
          requiredEnvVars.push('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET');
        }
      }

      if (requiredEnvVars.length > 0) {
        console.error(chalk.red('❌ Missing required environment variables:'));
        requiredEnvVars.forEach(env => console.error(chalk.red(`   - ${env}`)));
        console.log(chalk.yellow('\n💡 Create a .env file with the required API credentials'));
        process.exit(1);
      }

      const scraperConfig: ClipScraperConfig = {
        download: {
          outputPath: path.resolve(options.output),
          quality: options.quality,
          format: 'best',
          socialMedia: {
            enabled: options.socialMedia,
            formats: {
              square: options.socialFormats.includes('square'),
              vertical: options.socialFormats.includes('vertical'),
            },
            maxDuration: parseInt(options.socialDuration),
            backgroundBlur: !options.noBackgroundBlur,
            quality: 'high'
          }
        }
      };

      // Configure platforms based on available credentials and user selection
      if (options.platforms.includes('twitch') && process.env.TWITCH_CLIENT_ID) {
        scraperConfig.twitch = {
          clientId: process.env.TWITCH_CLIENT_ID,
          clientSecret: process.env.TWITCH_CLIENT_SECRET,
          minViews: parseInt(options.minViews)
        };
      }

      if (options.platforms.includes('kick')) {
        scraperConfig.kick = {
          minViews: parseInt(options.minViews)
        };
      }

      const scraper = new ClipScraper(scraperConfig);
      
      const downloadedFiles = await scraper.scrapeAndDownload(
        username,
        options.platforms,
        parseInt(options.limit)
      );

      if (downloadedFiles.length > 0) {
        console.log(chalk.green.bold('\n🎉 Download Complete!'));
        console.log(chalk.white(`📁 Files saved to: ${options.output}`));
        console.log(chalk.white(`📊 Total files downloaded: ${downloadedFiles.length}`));
      } else {
        console.log(chalk.yellow('\n📭 No clips were downloaded'));
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Generate a sample .env configuration file')
  .action(() => {
    const sampleConfig = `# Twitch API credentials
# Get these from: https://dev.twitch.tv/console/apps
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Kick doesn't require API credentials for public clips
`;

    console.log(chalk.blue.bold('📝 Sample .env configuration:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(sampleConfig);
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('💡 Copy this to a .env file in your project root'));
    console.log(chalk.yellow('   and fill in your actual API credentials'));
  });

program
  .command('stats')
  .description('Show download statistics and history')
  .option('-o, --output <path>', 'Output directory to check', './downloads')
  .action(async (options) => {
    try {
      const { ClipDownloader } = await import('./downloader/clip-downloader');
      const downloader = new ClipDownloader({ outputPath: path.resolve(options.output) });
      await downloader.initialize();
      
      const stats = await downloader.getStats();
      
      console.log(chalk.blue.bold('📊 Download Statistics\n'));
      console.log(chalk.white(`Total clips downloaded: ${stats.total}`));
      
      if (Object.keys(stats.byPlatform).length > 0) {
        console.log(chalk.cyan('\nBy platform:'));
        for (const [platform, count] of Object.entries(stats.byPlatform)) {
          console.log(chalk.white(`  ${platform}: ${count} clips`));
        }
      } else {
        console.log(chalk.gray('No clips downloaded yet'));
      }
    } catch (error) {
      console.error(chalk.red(`Error getting stats: ${error}`));
    }
  });

program
  .command('clear-history')
  .description('Clear download history (allows re-downloading previously downloaded clips)')
  .option('-o, --output <path>', 'Output directory to clear history for', './downloads')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log(chalk.yellow('⚠️  This will clear the download history and allow re-downloading of all clips.'));
        console.log(chalk.yellow('   Use --confirm to skip this prompt.'));
        return;
      }

      const { ClipDownloader } = await import('./downloader/clip-downloader');
      const downloader = new ClipDownloader({ outputPath: path.resolve(options.output) });
      await downloader.initialize();
      await downloader.clearHistory();
      
      console.log(chalk.green('✅ Download history cleared successfully!'));
    } catch (error) {
      console.error(chalk.red(`Error clearing history: ${error}`));
    }
  });

program.parse();
