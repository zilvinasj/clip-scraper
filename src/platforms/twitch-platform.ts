import axios from 'axios';
import { BasePlatform } from './base-platform';
import { Clip, PlatformConfig } from '../types';

export class TwitchPlatform extends BasePlatform {
  private accessToken?: string;
  private readonly baseUrl = 'https://api.twitch.tv/helix';

  constructor(config: PlatformConfig) {
    super(config, 'twitch');
  }

  async getTopClips(username: string | 'all', limit = 10): Promise<Clip[]> {
    await this.authenticate();
    
    try {
      let url = `${this.baseUrl}/clips`;
      const params: any = {
        first: Math.min(limit, 100), // Twitch API limit
        started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      };

      if (username !== 'all') {
        // Get user ID first
        const userResponse = await axios.get(`${this.baseUrl}/users`, {
          headers: this.getHeaders(),
          params: { login: username }
        });

        if (userResponse.data.data.length === 0) {
          throw new Error(`User ${username} not found on Twitch`);
        }

        params.broadcaster_id = userResponse.data.data[0].id;
      }

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        params
      });

      return response.data.data
        .filter((clip: any) => !this.config.minViews || clip.view_count >= this.config.minViews)
        .sort((a: any, b: any) => b.view_count - a.view_count)
        .slice(0, limit)
        .map((clip: any) => this.formatClipData(clip));
    } catch (error) {
      console.error(`Error fetching Twitch clips: ${error}`);
      return [];
    }
  }

  protected async authenticate(): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Twitch client ID and secret are required');
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to authenticate with Twitch: ${error}`);
    }
  }

  protected formatClipData(rawData: any): Clip {
    return {
      id: rawData.id,
      title: rawData.title,
      url: rawData.url,
      viewCount: rawData.view_count,
      duration: rawData.duration,
      createdAt: new Date(rawData.created_at),
      thumbnailUrl: rawData.thumbnail_url,
      creator: rawData.broadcaster_name,
      platform: 'twitch'
    };
  }

  private getHeaders() {
    return {
      'Client-ID': this.config.clientId,
      'Authorization': `Bearer ${this.accessToken}`
    };
  }
}
