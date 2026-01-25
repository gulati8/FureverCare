#!/bin/bash
# Download realistic pet images for seed data
#
# Downloads images from Unsplash and saves them locally
# These can then be uploaded to your own storage if needed

set -e

SCRIPT_DIR="$(dirname "$0")"
OUTPUT_DIR="$SCRIPT_DIR/../assets/seed-images"

mkdir -p "$OUTPUT_DIR"

echo "🐾 Downloading pet images for seed data..."
echo "   Output directory: $OUTPUT_DIR"
echo ""

# Pet images with their Unsplash URLs
declare -A PETS
PETS["biscuit-golden-retriever"]="https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=800&fit=crop"
PETS["whiskers-tabby-cat"]="https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800&h=800&fit=crop"
PETS["duke-labrador"]="https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=800&h=800&fit=crop"
PETS["luna-siamese"]="https://images.unsplash.com/photo-1568152950566-c1bf43f4ab28?w=800&h=800&fit=crop"
PETS["cheddar-corgi"]="https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=800&h=800&fit=crop"
PETS["maple-beagle"]="https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=800&h=800&fit=crop"
PETS["oliver-maine-coon"]="https://images.unsplash.com/photo-1615796153287-98eacf0abb13?w=800&h=800&fit=crop"

for name in "${!PETS[@]}"; do
  url="${PETS[$name]}"
  output_file="$OUTPUT_DIR/$name.jpg"

  if [ -f "$output_file" ]; then
    echo "  ⏭️  $name.jpg already exists, skipping"
  else
    echo "  📥 Downloading $name.jpg..."
    curl -sL "$url" -o "$output_file"
    echo "     ✅ Saved to $output_file"
  fi
done

echo ""
echo "✅ All images downloaded to: $OUTPUT_DIR"
echo ""
echo "To use these images locally or upload to your own storage:"
echo "  1. Host them on S3, Cloudflare R2, or similar"
echo "  2. Update the photo_url values in backend/src/db/seed.ts"
echo ""
echo "Note: The seed script uses Unsplash URLs by default which work fine"
echo "for demo purposes. Only use local images if you need offline access"
echo "or want to avoid external dependencies."
