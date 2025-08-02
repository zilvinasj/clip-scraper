import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export interface SocialMediaConfig {
  enabled: boolean;
  formats: {
    square: boolean;
    vertical: boolean;
  };
  maxDuration: number;
  backgroundBlur: boolean;
  videoScale: number; // Scale factor for the main video (1.0 = 100%, 1.5 = 150%, etc.)
}

export interface PartialSocialMediaConfig {
  enabled?: boolean;
  formats?: {
    square?: boolean;
    vertical?: boolean;
  };
  maxDuration?: number;
  backgroundBlur?: boolean;
  videoScale?: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
}

export class SocialMediaProcessor {
  constructor(private config: SocialMediaConfig) {}

  /**
   * Process a video clip to create social media versions
   */
  async processClip(inputPath: string): Promise<string[]> {
    if (!this.config.enabled) {
      return [];
    }

    const outputFiles: string[] = [];
    
    try {
      console.log(chalk.cyan(`🎨 Creating social media versions of: ${path.basename(inputPath)}`));

      // Get video info first
      const videoInfo = await this.getVideoInfo(inputPath);
      const duration = Math.min(videoInfo.duration, this.config.maxDuration);

      if (this.config.formats.square) {
        const squareOutput = await this.createSquareVersion(inputPath, duration);
        if (squareOutput) outputFiles.push(squareOutput);
      }

      if (this.config.formats.vertical) {
        const verticalOutput = await this.createVerticalVersion(inputPath, duration);
        if (verticalOutput) outputFiles.push(verticalOutput);
      }

      if (outputFiles.length > 0) {
        console.log(chalk.green(`✅ Created ${outputFiles.length} social media versions`));
      }
      
      return outputFiles;
    } catch (error) {
      console.error(chalk.red(`❌ Error processing clip for social media: ${error}`));
      return [];
    }
  }

  /**
   * Get video information using ffprobe
   */
  private async getVideoInfo(inputPath: string): Promise<VideoInfo> {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath
    ];

    try {
      const output = await this.runFFprobe(args);
      const info = JSON.parse(output);
      
      const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
      const duration = parseFloat(info.format.duration);
      
      return {
        duration,
        width: videoStream.width,
        height: videoStream.height
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error}`);
    }
  }

  /**
   * Generate output filename with suffix
   */
  private generateOutputPath(inputPath: string, suffix: string): string {
    const parsed = path.parse(inputPath);
    const dir = parsed.dir;
    const nameWithoutExt = parsed.name;
    const ext = parsed.ext;
    
    return path.join(dir, `${nameWithoutExt}${suffix}${ext}`);
  }

  /**
   * Run FFmpeg with given arguments
   */
  private async runFFmpeg(args: string[], description: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(chalk.gray(`   ${description}...`));
      
      const ffmpeg = spawn('ffmpeg', args);
      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * Run FFprobe with given arguments
   */
  private async runFFprobe(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', args);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`ffprobe failed with code ${code}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe spawn error: ${error.message}`));
      });
    });
  }

  /**
   * Create square (1:1) version for Instagram/TikTok
   */
  private async createSquareVersion(inputPath: string, duration: number): Promise<string | null> {
    try {
      const outputPath = this.generateOutputPath(inputPath, '_square');
      
      let filterGraph = `[0:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080[v]`;
      
      if (this.config.backgroundBlur) {
        // Calculate scaled dimensions based on videoScale setting
        const scaledSize = Math.round(1080 * this.config.videoScale);
        filterGraph = `[0:v]split=2[bg][fg];[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,gblur=sigma=20[blurred];[fg]scale=iw*min(1080/iw\\,${scaledSize}/ih):ih*min(1080/iw\\,${scaledSize}/ih)[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2[v]`;
      }

      const args = [
        '-y',
        '-i', inputPath,
        '-t', duration.toString(),
        '-filter_complex', filterGraph,
        '-map', '[v]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        outputPath
      ];

      await this.runFFmpeg(args, `Creating square version (1080x1080)`);
      return outputPath;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create square version: ${error}`));
      return null;
    }
  }

  /**
   * Create vertical (9:16) version for YouTube Shorts/TikTok/Instagram Reels
   */
  private async createVerticalVersion(inputPath: string, duration: number): Promise<string | null> {
    try {
      const outputPath = this.generateOutputPath(inputPath, '_vertical');

    let filterGraph = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v]`;
    
    if (this.config.backgroundBlur) {
      // Scale the video based on videoScale setting, with blurred background
      const scaledHeight = Math.round(1920 * this.config.videoScale);
      filterGraph = `[0:v]split=2[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=20[blurred];[fg]scale=iw*min(1080/iw\\,${scaledHeight}/ih):1080[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2[v]`;
    } else {
      // If no blur, just scale the original video to fill the screen
      const scaledHeight = Math.round(1920 * this.config.videoScale);
      filterGraph = `[0:v]scale=1080:${scaledHeight}:force_original_aspect_ratio=increase,crop=1080:1920[v]`;
    }

      const args = [
        '-y',
        '-i', inputPath,
        '-t', duration.toString(),
        '-filter_complex', filterGraph,
        '-map', '[v]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        outputPath
      ];

      await this.runFFmpeg(args, `Creating vertical version (1080x1920)`);
      return outputPath;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create vertical version: ${error}`));
      return null;
    }
  }
}
