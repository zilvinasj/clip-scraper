# Clip Scraper

A TypeScript application that finds and downloads the most viewed clips from Twitch and Kick platforms. Clips are organized in a structured folder format: `/{username}/{platform}/{clipname}_{date}.{extension}`.

## Features

- 🎬 **Multi-platform support**: Twitch and Kick
- 📊 **Top clips discovery**: Find the most viewed clips by username or trending
- 📥 **Automatic downloading**: Downloads clips with organized folder structure by user and platform
- 🚫 **Duplicate prevention**: Tracks downloaded clips to avoid re-downloading the same content
- 📱 **Social media ready**: Automatically creates square (1:1) and vertical (9:16) versions optimized for Instagram, TikTok, and YouTube Shorts
- ⚙️ **Configurable**: Set minimum view counts, video quality, and download limits
- 📈 **Download statistics**: View stats about downloaded clips by platform
- 🎨 **Beautiful CLI**: Colored output with progress indicators
- 🔧 **TypeScript**: Fully typed for better development experience

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd clip-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API credentials
```

4. Install FFmpeg (required for social media processing):
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (using chocolatey)
choco install ffmpeg
```

## API Setup

### Twitch API
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Create a new application
3. Copy Client ID and Client Secret to your `.env` file

### Kick API
No API credentials required for public clips.

## Usage

### Build the project
```bash
npm run build
```

### CLI Commands

#### Scrape clips for a specific user
```bash
npm run dev scrape <username>
```

#### Scrape top trending clips from across all platforms
```bash
npm run dev scrape all
```
*When using "all", the app will fetch the most popular/trending clips from each platform and return the top clips by view count across all platforms combined.*

#### Advanced options
```bash
npm run dev scrape <username> --platforms twitch kick --limit 20 --quality 720 --min-views 1000
```

#### Social media options
```bash
# Create only square versions (Instagram posts)
npm run dev scrape <username> --social-formats square

# Create only vertical versions (TikTok, Instagram Reels, YouTube Shorts)
npm run dev scrape <username> --social-formats vertical

# Disable social media processing
npm run dev scrape <username> --no-social-media

# Custom social media settings
npm run dev scrape <username> --social-duration 30 --no-background-blur
```

#### Get top trending clips with high view count filter
```bash
npm run dev scrape all --limit 50 --min-views 100000
```

#### Generate sample config
```bash
npm run dev config
```

#### View download statistics
```bash
npm run dev stats
```

#### Clear download history (allows re-downloading clips)
```bash
npm run dev clear-history --confirm
```

### Command Options

- `--platforms, -p`: Specify platforms (twitch, kick)
- `--limit, -l`: Maximum number of clips to download. For "all", this gets the top clips across all platforms combined (default: 10)
- `--output, -o`: Output directory (default: ./downloads)
- `--quality, -q`: Video quality (default: best)
- `--min-views`: Minimum view count filter (default: 0)
- `--social-media`: Create social media versions (default: enabled)
- `--no-social-media`: Disable social media version creation
- `--social-formats`: Social media formats to create: square, vertical (default: both)
- `--social-duration`: Maximum duration for social media clips in seconds (default: 59)
- `--no-background-blur`: Disable blurred background for social media versions

## Examples

```bash
# Download top 10 clips from all platforms for user "ninja"
npm run dev scrape ninja

# Download top 5 Twitch clips for user "shroud"
npm run dev scrape shroud --platforms twitch --limit 5

# Download top 25 trending clips across all platforms with minimum 10k views
npm run dev scrape all --min-views 10000 --limit 25

# Download trending clips from specific platforms only
npm run dev scrape all --platforms twitch kick --limit 15

# Download clips in 720p quality to custom folder
npm run dev scrape pokimane --quality 720 --output ./my-clips

# Get the absolute top trending clips across all platforms
npm run dev scrape all --limit 100 --min-views 50000
```

## Project Structure

```
clip-scraper/
├── src/
│   ├── platforms/          # Platform-specific implementations
│   │   ├── base-platform.ts
│   │   ├── twitch-platform.ts
│   │   └── kick-platform.ts
│   ├── downloader/         # Video download functionality
│   │   ├── clip-downloader.ts
│   │   └── download-tracker.ts
│   ├── processor/          # Video processing functionality
│   │   └── social-media-processor.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── clip-scraper.ts     # Main scraper class
│   ├── cli.ts              # Command-line interface
│   └── index.ts            # Package exports
├── dist/                   # Compiled JavaScript
├── downloads/              # Default download directory
├── .env.example            # Environment variables template
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project configuration
```

## Development

### Run in development mode
```bash
npm run dev
```

### Watch mode for development
```bash
npm run watch
```

### Build for production
```bash
npm run build
```

### Clean build directory
```bash
npm run clean
```

## Output Structure

Downloaded clips are organized as follows:
```
downloads/
├── username1/
│   ├── twitch/
│   │   ├── amazing_clip_2024-08-01.mp4
│   │   ├── amazing_clip_2024-08-01_square.mp4     # 1:1 for Instagram
│   │   ├── amazing_clip_2024-08-01_vertical.mp4   # 9:16 for TikTok/Reels
│   │   ├── epic_play_2024-08-02.mp4
│   │   ├── epic_play_2024-08-02_square.mp4
│   │   └── epic_play_2024-08-02_vertical.mp4
│   └── kick/
│       ├── short_clip_2024-08-01.mp4
│       ├── short_clip_2024-08-01_square.mp4
│       └── short_clip_2024-08-01_vertical.mp4
├── username2/
│   └── twitch/
│       ├── highlight_2024-08-01.mp4
│       ├── highlight_2024-08-01_square.mp4
│       └── highlight_2024-08-01_vertical.mp4
```

### Social Media Processing

The application automatically creates optimized versions for social media platforms:

- **Square versions (1080x1080)**: Perfect for Instagram posts and stories
- **Vertical versions (1080x1920)**: Optimized for TikTok, Instagram Reels, and YouTube Shorts
- **Smart cropping**: Uses intelligent scaling and optional blurred backgrounds
- **Duration optimization**: Automatically trims clips to 59 seconds max (configurable)
- **High quality**: Maintains video quality while optimizing for mobile viewing

## Configuration

The application uses environment variables for API credentials:

```env
# Twitch API credentials
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

## Error Handling

- **Missing API credentials**: The application will warn about missing credentials and skip those platforms
- **User not found**: If a username doesn't exist on a platform, it will be skipped
- **Download failures**: Failed downloads are logged but don't stop the process
- **Rate limiting**: The application respects API rate limits and handles errors gracefully

## Dependencies

- **axios**: HTTP client for API requests
- **youtube-dl-exec**: Video downloading functionality
- **commander**: CLI framework
- **chalk**: Colored terminal output
- **dotenv**: Environment variable management

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Missing youtube-dl**: Install youtube-dl or yt-dlp on your system
2. **API rate limits**: Use appropriate delays between requests
3. **Download failures**: Check internet connection and video availability
4. **Permission errors**: Ensure write permissions in the output directory

### Support

For issues and feature requests, please create an issue on the GitHub repository.
