import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, 'public');

async function generateIcons() {
  const svgPath = join(publicDir, 'pwa-icon.svg');
  const svg = readFileSync(svgPath, 'utf-8');
  
  console.log('Generating PWA icons from SVG...');
  
  // Generate different sizes
  const sizes = [
    { output: 'pwa-192x192.png', width: 192, height: 192 },
    { output: 'pwa-512x512.png', width: 512, height: 512 },
    { output: 'apple-touch-icon.png', width: 180, height: 180 }
  ];
  
  for (const size of sizes) {
    try {
      const resvg = new Resvg(svg, {
        fitTo: {
          mode: 'width',
          value: size.width
        }
      });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      
      const outputPath = join(publicDir, size.output);
      writeFileSync(outputPath, pngBuffer);
      console.log(`✓ Generated ${size.output} (${size.width}x${size.height})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size.output}:`, error.message);
    }
  }
  
  console.log('\n✓ All PWA icons generated!');
}

generateIcons();
