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
      if (username === 'all') {
        return await this.getTopTrendingClips(limit);
      } else {
        return await this.getUserClips(username, limit);
      }
    } catch (error) {
      console.error(`Error fetching Kick clips: ${error}`);
      return [];
    }
  }

  private async getTopTrendingClips(limit: number): Promise<Clip[]> {
    const allClips: any[] = [];

    try {
      // Try multiple trending endpoints to get more clips
      const endpoints = [
        `${this.baseUrl}/clips/trending`,
        `${this.baseUrl}/clips/featured`,
        `${this.baseUrl}/clips`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            params: {
              limit: Math.min(limit * 2, 100) // Get more clips to filter from
            }
          });
          
          if (response.data.data) {
            allClips.push(...response.data.data);
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${endpoint}: ${endpointError}`);
        }
      }

      // Remove duplicates based on clip ID
      const uniqueClips = allClips.filter((clip, index, self) => 
        index === self.findIndex(c => c.id === clip.id)
      );

      return uniqueClips
        .filter((clip: any) => !this.config.minViews || clip.views >= this.config.minViews)
        .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
        .slice(0, limit)
        .map((clip: any) => this.formatClipData(clip));

    } catch (error) {
      console.warn(`Kick trending clips failed, trying basic endpoint: ${error}`);
      
      // Fallback to basic clips endpoint
      try {
        const response = await axios.get(`${this.baseUrl}/clips`, {
          params: { limit: Math.min(limit, 50) }
        });
        
        const clips = response.data.data || [];
        return clips
          .filter((clip: any) => !this.config.minViews || clip.views >= this.config.minViews)
          .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
          .slice(0, limit)
          .map((clip: any) => this.formatClipData(clip));
      } catch (fallbackError) {
        console.error(`All Kick endpoints failed: ${fallbackError}`);
        return [];
      }
    }
  }

  private async getUserClips(username: string, limit: number): Promise<Clip[]> {
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
    
    const clips = clipsResponse.data.data || [];
    return clips
      .filter((clip: any) => !this.config.minViews || clip.views >= this.config.minViews)
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, limit)
      .map((clip: any) => this.formatClipData(clip));
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
