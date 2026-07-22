#!/bin/bash
# Run this to generate placeholder assets before first build.
# Replace with real assets before App Store submission.

mkdir -p assets

# Generate a simple 1024x1024 teal icon using ImageMagick (if available)
if command -v convert &> /dev/null; then
  convert -size 1024x1024 xc:#1D9E75 \
    -fill white -font Helvetica-Bold -pointsize 400 \
    -gravity Center -annotate 0 "LB" \
    assets/icon.png
  
  # Splash (2048x2048)
  convert -size 2048x2048 xc:#ffffff \
    -fill '#1D9E75' -font Helvetica-Bold -pointsize 200 \
    -gravity Center -annotate 0 "LeftBehind" \
    assets/splash.png

  # Adaptive icon background
  convert -size 1024x1024 xc:#1D9E75 assets/adaptive-icon.png

  echo "Assets generated."
else
  echo "ImageMagick not found. Add your own assets/icon.png (1024x1024) and assets/splash.png (2048x2048)."
fi
