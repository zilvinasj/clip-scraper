<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Clip Scraper Project Instructions

This is a TypeScript application that finds and downloads the most viewed clips from Twitch, Kick, and YouTube platforms.

## Project Structure
- Use modular architecture with separate classes for each platform
- Implement proper error handling and retry mechanisms
- Use async/await for all asynchronous operations
- Follow TypeScript best practices with proper typing
- Organize downloaded clips in folders: /{username}/{platform}/{clipname}_{date}

## Platform Integration
- Twitch: Use Twitch API for clip discovery
- Kick: Use web scraping or API if available
- YouTube: Use YouTube Data API v3 for video discovery

## File Naming Convention
- Use kebab-case for file names
- Use PascalCase for class names
- Use camelCase for variables and functions
- Downloaded clips: {clipname}_{YYYY-MM-DD}.{extension} (platform is indicated by folder structure)

## Dependencies
- axios: For HTTP requests
- youtube-dl-exec: For video downloading
- commander: For CLI interface
- chalk: For colored console output
- dotenv: For environment variable management
