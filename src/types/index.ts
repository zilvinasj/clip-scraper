export interface Clip {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  duration: number;
  createdAt: Date;
  thumbnailUrl: string;
  creator: string;
  platform: 'twitch' | 'kick' | 'youtube';
}

export interface PlatformConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  maxClips?: number;
  minViews?: number;
}

export interface DownloadOptions {
  outputPath: string;
  quality?: string;
  format?: string;
}

export interface ClipScraperConfig {
  twitch?: PlatformConfig;
  kick?: PlatformConfig;
  youtube?: PlatformConfig;
  download: DownloadOptions;
}
