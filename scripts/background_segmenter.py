#!/usr/bin/env python3
"""
Background Segmenter for Legacy Game
Chops large background images into segments for efficient loading and rendering
"""

import os
from PIL import Image
import json

def segment_background(input_path, output_dir, segment_width=1200, game_height=720):
    """
    Segment a large background image into smaller chunks
    
    Args:
        input_path: Path to the large background image
        output_dir: Directory to save segments
        segment_width: Width of each segment (default: game width)
        game_height: Target height for the game (default: 720)
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open the image
    img = Image.open(input_path)
    original_width, original_height = img.size
    
    print(f"Original image: {original_width}x{original_height}")
    print(f"Segment width: {segment_width}")
    print(f"Target height: {game_height}")
    
    # Calculate scale factor to fit game height
    scale_factor = game_height / original_height
    scaled_width = int(original_width * scale_factor)
    scaled_height = game_height
    
    print(f"Scaled dimensions: {scaled_width}x{scaled_height}")
    print(f"Scale factor: {scale_factor:.3f}")
    
    # Resize the image to fit game height
    resized_img = img.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
    
    # Calculate number of segments needed
    num_segments = (scaled_width + segment_width - 1) // segment_width
    print(f"Number of segments: {num_segments}")
    
    # Segment metadata
    metadata = {
        "original_dimensions": [original_width, original_height],
        "scaled_dimensions": [scaled_width, scaled_height],
        "segment_width": segment_width,
        "game_height": game_height,
        "scale_factor": scale_factor,
        "num_segments": num_segments,
        "segments": []
    }
    
    # Create segments
    for i in range(num_segments):
        left = i * segment_width
        right = min(left + segment_width, scaled_width)
        
        # Extract segment
        segment = resized_img.crop((left, 0, right, scaled_height))
        
        # Save segment
        segment_filename = f"segment_{i:03d}.png"
        segment_path = os.path.join(output_dir, segment_filename)
        segment.save(segment_path, "PNG")
        
        # Add to metadata
        segment_info = {
            "index": i,
            "filename": segment_filename,
            "width": right - left,
            "height": scaled_height,
            "x_offset": left,
            "x_position": left  # Start at x=0 (left edge of level)
        }
        metadata["segments"].append(segment_info)
        
        print(f"Created segment {i}: {segment_filename} ({right-left}x{scaled_height})")
    
    # Save metadata
    metadata_path = os.path.join(output_dir, "metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nSegmentation complete!")
    print(f"Segments saved to: {output_dir}")
    print(f"Metadata saved to: {metadata_path}")
    
    return metadata

def main():
    """Main function to segment the level 1 background"""
    
    # Configuration
    input_file = "assets/level_1_pieces/level1_background_street.png"
    output_dir = "assets/backgrounds/level_1_segments"
    segment_width = 1200  # Game width
    game_height = 720     # Game height
    
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        return
    
    print("=== Legacy Game Background Segmenter ===")
    print(f"Input: {input_file}")
    print(f"Output: {output_dir}")
    print()
    
    # Segment the background
    metadata = segment_background(input_file, output_dir, segment_width, game_height)
    
    print(f"\n=== Summary ===")
    print(f"Total segments: {metadata['num_segments']}")
    print(f"Total width: {metadata['scaled_dimensions'][0]}px")
    print(f"Segment width: {metadata['segment_width']}px")
    print(f"Game height: {metadata['game_height']}px")

if __name__ == "__main__":
    main()
