import { SocialMediaProcessor } from './src/processor/social-media-processor';

async function testProcessor() {
  const processor = new SocialMediaProcessor();
  const testFile = 'downloads/Ninja/twitch/yeah_bro_cooked_em_2025-07-30.mp4';
  
  console.log('Testing social media processor...');
  try {
    const results = await processor.processClip(testFile);
    console.log('Results:', results);
  } catch (error) {
    console.error('Error:', error);
  }
}

testProcessor();
