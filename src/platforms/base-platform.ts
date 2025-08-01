import { Clip, PlatformConfig } from '../types';

export abstract class BasePlatform {
  protected config: PlatformConfig;
  protected platformName: string;

  constructor(config: PlatformConfig, platformName: string) {
    this.config = config;
    this.platformName = platformName;
  }

  abstract getTopClips(username: string | 'all', limit?: number): Promise<Clip[]>;
  
  protected abstract authenticate(): Promise<void>;
  
  protected formatClipData(rawData: any): Clip {
    // This will be implemented by each platform
    throw new Error('formatClipData must be implemented by subclass');
  }
}
