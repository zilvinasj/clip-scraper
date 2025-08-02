import { SocialMediaProcessor } from './src/processor/social-media-processor';
async function testProcessor() {
    const processor = new SocialMediaProcessor({
        enabled: true,
        formats: {
            square: true,
            vertical: true,
        },
        maxDuration: 59,
        backgroundBlur: true,
        videoScale: 1, // Default to 150% scale
    });
    const testFile = 'downloads/Agent00/twitch/so_much_aura_in_one_clip_2025-07-26.mp4'; // Example file path, adjust as needed

    console.log('Testing social media processor...');
    try {
        const results = await processor.processClip(testFile);
        console.log('Results:', results);
    } catch (error) {
        console.error('Error:', error);
    }
}

testProcessor();
