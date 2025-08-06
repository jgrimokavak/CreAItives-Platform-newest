import { objectStorage } from './objectStorage';
import { persistImage } from './fs-storage';
import sharp from 'sharp';

/**
 * Test complete image generation pipeline with Object Storage
 */
async function testImageGenerationPipeline() {
  try {
    console.log('🎨 Testing complete image generation pipeline...');
    
    // Simulate image generation result (like from OpenAI/Replicate)
    const generatedImageBuffer = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 100, g: 200, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    const base64Image = generatedImageBuffer.toString('base64');
    
    console.log(`📦 Generated test image: ${generatedImageBuffer.length} bytes`);
    
    // Test the persistImage function (which should now use Object Storage)
    const metadata = {
      prompt: 'A test car generated for Object Storage integration',
      params: {
        model: 'test-model',
        aspect_ratio: '1:1',
        quality: 'standard'
      },
      userId: 'test-user-123',
      sources: ['test-generation']
    };
    
    console.log('💾 Testing persistImage with Object Storage...');
    const result = await persistImage(base64Image, metadata, 'pipeline-test-image');
    
    console.log('✅ Image persisted successfully:', result);
    
    // Test if we can access the image via API
    console.log('🔗 Testing API access...');
    
    const imageUrl = result.fullUrl.replace('/api/object-storage/image/', '');
    const downloadResult = await objectStorage.downloadImage(imageUrl);
    
    console.log(`✅ API access successful: ${downloadResult.length} bytes downloaded`);
    
    // Test gallery listing
    console.log('🖼️ Testing gallery listing...');
    const galleryResult = await objectStorage.getAllImagesForGallery({ limit: 5 });
    
    console.log(`📊 Gallery shows ${galleryResult.images.length} images`);
    if (galleryResult.images.length > 0) {
      console.log('🎯 Recent images:', galleryResult.images.slice(0, 2).map(img => ({ id: img.id, path: img.path })));
    }
    
    console.log('🎉 Complete pipeline test successful!');
    return true;
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    return false;
  }
}

testImageGenerationPipeline();