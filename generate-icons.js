const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - soft blue gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#A7C7E7');
  gradient.addColorStop(1, '#74739E');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();

  // Dollar sign symbol
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', size / 2, size / 2 - size * 0.05);

  // Small book/school icon at bottom
  const bookY = size * 0.72;
  const bookSize = size * 0.15;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(size / 2 - bookSize, bookY, bookSize * 2, bookSize * 0.6);
  ctx.fillStyle = '#A7C7E7';
  ctx.fillRect(size / 2 - bookSize * 0.8, bookY + bookSize * 0.1, bookSize * 1.6, bookSize * 0.4);

  return canvas.toBuffer('image/png');
}

// Generate icons
const publicDir = path.join(__dirname, 'public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIcon(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIcon(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180));

console.log('✓ PWA icons generated successfully!');
