import axios from 'axios';
import { BasePlatform } from './base-platform';
import { Clip, PlatformConfig } from '../types';

export class YouTubePlatform extends BasePlatform {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(config: PlatformConfig) {
    super(config, 'youtube');
  }

  async getTopClips(username: string | 'all', limit = 10): Promise<Clip[]> {
    if (!this.config.apiKey) {
      throw new Error('YouTube API key is required');
    }

    try {
      let searchParams: any = {
        part: 'snippet,statistics',
        type: 'video',
        order: 'viewCount',
        maxResults: Math.min(limit, 50), // YouTube API limit
        publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        key: this.config.apiKey
      };

      if (username !== 'all') {
        // Get channel ID first
        const channelResponse = await axios.get(`${this.baseUrl}/channels`, {
          params: {
            part: 'id',
            forUsername: username,
            key: this.config.apiKey
          }
        });

        if (channelResponse.data.items.length === 0) {
          // Try searching by channel name
          const searchResponse = await axios.get(`${this.baseUrl}/search`, {
            params: {
              part: 'snippet',
              type: 'channel',
              q: username,
              maxResults: 1,
              key: this.config.apiKey
            }
          });

          if (searchResponse.data.items.length === 0) {
            throw new Error(`Channel ${username} not found on YouTube`);
          }

          searchParams.channelId = searchResponse.data.items[0].snippet.channelId;
        } else {
          searchParams.channelId = channelResponse.data.items[0].id;
        }
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: searchParams
      });

      // Get detailed video information including statistics
      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');
      const videosResponse = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds,
          key: this.config.apiKey
        }
      });

      return videosResponse.data.items
        .filter((video: any) => !this.config.minViews || parseInt(video.statistics.viewCount) >= this.config.minViews)
        .sort((a: any, b: any) => parseInt(b.statistics.viewCount) - parseInt(a.statistics.viewCount))
        .slice(0, limit)
        .map((video: any) => this.formatClipData(video));
    } catch (error) {
      console.error(`Error fetching YouTube videos: ${error}`);
      return [];
    }
  }

  protected async authenticate(): Promise<void> {
    // YouTube uses API key authentication, no need for OAuth for public data
  }

  protected formatClipData(rawData: any): Clip {
    // Parse duration from ISO 8601 format (PT4M13S) to seconds
    const duration = this.parseDuration(rawData.contentDetails.duration);
    
    return {
      id: rawData.id,
      title: rawData.snippet.title,
      url: `https://www.youtube.com/watch?v=${rawData.id}`,
      viewCount: parseInt(rawData.statistics.viewCount),
      duration,
      createdAt: new Date(rawData.snippet.publishedAt),
      thumbnailUrl: rawData.snippet.thumbnails.high?.url || rawData.snippet.thumbnails.default.url,
      creator: rawData.snippet.channelTitle,
      platform: 'youtube'
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }
}
