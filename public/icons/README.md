# PWA Icons

This folder should contain the following icon files for PWA support:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to generate icons:

### Option 1: Use online tools
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload your logo (SVG or PNG)
3. Download the generated icons
4. Extract to this folder

### Option 2: Use Figma/Sketch
1. Create a 512x512 icon
2. Export at different sizes
3. Save to this folder

### Option 3: Use ImageMagick (command line)
```bash
convert icon.svg -resize 72x72 icon-72x72.png
convert icon.svg -resize 96x96 icon-96x96.png
convert icon.svg -resize 128x128 icon-128x128.png
convert icon.svg -resize 144x144 icon-144x144.png
convert icon.svg -resize 152x152 icon-152x152.png
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 384x384 icon-384x384.png
convert icon.svg -resize 512x512 icon-512x512.png
```

## Current Status
Currently using SVG icon (icon.svg) as a fallback.
For production, please generate proper PNG icons.
