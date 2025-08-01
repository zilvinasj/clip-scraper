import axios from 'axios';
import { BasePlatform } from './base-platform';
import { Clip, PlatformConfig } from '../types';

export class KickPlatform extends BasePlatform {
  private readonly baseUrl = 'https://kick.com/api/v2';

  constructor(config: PlatformConfig) {
    super(config, 'kick');
  }

  async getTopClips(username: string | 'all', limit = 10): Promise<Clip[]> {
    try {
      let clips: any[] = [];

      if (username === 'all') {
        // Get trending clips
        const response = await axios.get(`${this.baseUrl}/clips/trending`, {
          params: {
            limit: Math.min(limit, 50)
          }
        });
        clips = response.data.data || [];
      } else {
        // Get user's channel first
        const channelResponse = await axios.get(`${this.baseUrl}/channels/${username}`);
        
        if (!channelResponse.data) {
          throw new Error(`User ${username} not found on Kick`);
        }

        const channelId = channelResponse.data.id;
        
        // Get clips for the specific channel
        const clipsResponse = await axios.get(`${this.baseUrl}/channels/${channelId}/clips`, {
          params: {
            limit: Math.min(limit, 50)
          }
        });
        clips = clipsResponse.data.data || [];
      }

      return clips
        .filter((clip: any) => !this.config.minViews || clip.views >= this.config.minViews)
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, limit)
        .map((clip: any) => this.formatClipData(clip));
    } catch (error) {
      console.error(`Error fetching Kick clips: ${error}`);
      return [];
    }
  }

  protected async authenticate(): Promise<void> {
    // Kick API doesn't require authentication for public clips
  }

  protected formatClipData(rawData: any): Clip {
    return {
      id: rawData.id.toString(),
      title: rawData.title || 'Untitled Clip',
      url: `https://kick.com/${rawData.channel?.slug}/clips/${rawData.id}`,
      viewCount: rawData.views || 0,
      duration: rawData.duration || 0,
      createdAt: new Date(rawData.created_at),
      thumbnailUrl: rawData.thumbnail_url || '',
      creator: rawData.channel?.username || rawData.channel?.slug || 'Unknown',
      platform: 'kick'
    };
  }
}
