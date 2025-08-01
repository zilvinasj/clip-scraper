export interface Clip {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  duration: number;
  createdAt: Date;
  thumbnailUrl: string;
  creator: string;
  platform: 'twitch' | 'kick';
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
  socialMedia?: {
    enabled?: boolean;
    formats?: {
      square?: boolean;
      vertical?: boolean;
    };
    maxDuration?: number;
    backgroundBlur?: boolean;
    quality?: string;
  };
}

export interface ClipScraperConfig {
  twitch?: PlatformConfig;
  kick?: PlatformConfig;
  download: DownloadOptions;
}
