#!/usr/bin/env python3
"""
Resize Tryston Spritesheets
Processes spritesheets from tryston/spritesheets, resizes frames from 128x96 to 128x128
by centering vertically, and saves to negative_tryston with "negative_" prefix.
"""

import os
from PIL import Image
import glob

def resize_spritesheet(input_path, output_dir):
    """
    Resize a spritesheet by splitting frames, extending height, and recombining.
    
    Args:
        input_path: Path to the input spritesheet image
        output_dir: Directory to save the resized spritesheet
    """
    # Open the image
    img = Image.open(input_path)
    original_width, original_height = img.size
    
    # Validate width
    if original_width != 128:
        print(f"Warning: {os.path.basename(input_path)} has width {original_width}, expected 128. Skipping.")
        return False
    
    # Validate height is divisible by 96
    if original_height % 96 != 0:
        print(f"Warning: {os.path.basename(input_path)} has height {original_height}, not divisible by 96. Skipping.")
        return False
    
    # Calculate number of frames
    num_frames = original_height // 96
    
    print(f"Processing {os.path.basename(input_path)}: {original_width}x{original_height} ({num_frames} frame{'s' if num_frames != 1 else ''})")
    
    # Process each frame
    resized_frames = []
    for i in range(num_frames):
        # Extract frame (128x96)
        y_start = i * 96
        y_end = y_start + 96
        frame = img.crop((0, y_start, 128, y_end))
        
        # Create new 128x128 image with transparent background
        resized_frame = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
        
        # Center the frame vertically (paste at y=16)
        resized_frame.paste(frame, (0, 16), frame if frame.mode == 'RGBA' else None)
        
        resized_frames.append(resized_frame)
    
    # Combine frames back into spritesheet
    final_height = 128 * num_frames
    spritesheet = Image.new('RGBA', (128, final_height), (0, 0, 0, 0))
    
    for i, frame in enumerate(resized_frames):
        y_offset = i * 128
        spritesheet.paste(frame, (0, y_offset), frame)
    
    # Save output
    filename = os.path.basename(input_path)
    output_filename = f"negative_{filename}"
    output_path = os.path.join(output_dir, output_filename)
    
    # Ensure output is RGBA for transparency
    if spritesheet.mode != 'RGBA':
        spritesheet = spritesheet.convert('RGBA')
    
    spritesheet.save(output_path, "PNG")
    
    print(f"  -> Saved: {output_filename} ({128}x{final_height})")
    return True

def main():
    """Main function to process all Tryston spritesheets"""
    
    # Configuration
    input_dir = "assets/characters/tryston/spritesheets"
    output_dir = "assets/characters/negative_tryston"
    
    if not os.path.exists(input_dir):
        print(f"Error: Input directory not found: {input_dir}")
        return
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Find all PNG files
    pattern = os.path.join(input_dir, "*.png")
    png_files = glob.glob(pattern)
    
    if not png_files:
        print(f"No PNG files found in {input_dir}")
        return
    
    print("=== Tryston Spritesheet Resizer ===")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Found {len(png_files)} PNG file(s)")
    print()
    
    # Process each spritesheet
    success_count = 0
    for png_file in sorted(png_files):
        if resize_spritesheet(png_file, output_dir):
            success_count += 1
        print()
    
    print(f"=== Summary ===")
    print(f"Successfully processed: {success_count}/{len(png_files)} file(s)")

if __name__ == "__main__":
    main()



