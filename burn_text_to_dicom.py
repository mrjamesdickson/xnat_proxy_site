#!/usr/bin/env python3
"""
Script to burn text into DICOM pixel data for testing OCR anonymization.
This adds visible text to DICOM images to simulate burned-in PHI.
"""

import os
import sys
from pathlib import Path
import pydicom
from PIL import Image, ImageDraw, ImageFont
import numpy as np


def burn_text_into_dicom(dicom_path: str, text: str, output_path: str = None):
    """
    Burns text into a DICOM file's pixel data.

    Args:
        dicom_path: Path to input DICOM file
        text: Text string to burn into the image
        output_path: Path to save modified DICOM (if None, overwrites original)
    """
    # Read DICOM file
    ds = pydicom.dcmread(dicom_path)

    # Check if pixel data exists
    if not hasattr(ds, 'PixelData'):
        print(f"Skipping {dicom_path}: No pixel data")
        return False

    # Get pixel array
    pixel_array = ds.pixel_array

    # Convert to PIL Image for drawing
    # Normalize to 0-255 range
    if pixel_array.max() > 255:
        # 16-bit image - normalize to 8-bit
        pixel_array = ((pixel_array - pixel_array.min()) /
                      (pixel_array.max() - pixel_array.min()) * 255).astype(np.uint8)
    else:
        pixel_array = pixel_array.astype(np.uint8)

    # Create PIL Image
    if len(pixel_array.shape) == 2:
        # Grayscale
        img = Image.fromarray(pixel_array, mode='L')
    elif len(pixel_array.shape) == 3:
        # RGB
        img = Image.fromarray(pixel_array, mode='RGB')
    else:
        print(f"Skipping {dicom_path}: Unsupported pixel array shape {pixel_array.shape}")
        return False

    # Draw text on image
    draw = ImageDraw.Draw(img)

    # Try to use a reasonably sized font
    try:
        # Try to load a system font
        font_size = max(20, img.height // 20)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fall back to default font
        font = ImageFont.load_default()

    # Position text in upper left corner with some padding
    position = (10, 10)

    # Draw text in white
    draw.text(position, text, fill=255, font=font)

    # Convert back to numpy array
    modified_array = np.array(img)

    # Update pixel data in DICOM
    ds.PixelData = modified_array.tobytes()

    # Save
    output = output_path if output_path else dicom_path
    ds.save_as(output)

    print(f"✓ Burned text into {os.path.basename(dicom_path)}")
    return True


def process_directory(directory: str, text: str):
    """
    Process all DICOM files in a directory.

    Args:
        directory: Path to directory containing DICOM files
        text: Text to burn into images
    """
    directory = Path(directory)

    if not directory.exists():
        print(f"Error: Directory {directory} does not exist")
        return

    # Find all .dcm files
    dicom_files = list(directory.glob("*.dcm"))

    if not dicom_files:
        print(f"No .dcm files found in {directory}")
        return

    print(f"Found {len(dicom_files)} DICOM files")
    print(f"Burning text: '{text}'")
    print("-" * 50)

    success_count = 0
    for dcm_file in dicom_files:
        try:
            if burn_text_into_dicom(str(dcm_file), text):
                success_count += 1
        except Exception as e:
            print(f"✗ Error processing {dcm_file.name}: {e}")

    print("-" * 50)
    print(f"Successfully processed {success_count}/{len(dicom_files)} files")


if __name__ == "__main__":
    # Default settings
    test_dir = "/Users/james/projects/data/pixel/8eec518c/4259db4/a65451f9"
    text_to_burn = "this is a text string"

    # Allow command line override
    if len(sys.argv) > 1:
        test_dir = sys.argv[1]
    if len(sys.argv) > 2:
        text_to_burn = sys.argv[2]

    print("=" * 50)
    print("DICOM Text Burning Script")
    print("=" * 50)
    print(f"Directory: {test_dir}")
    print(f"Text: '{text_to_burn}'")
    print("=" * 50)

    process_directory(test_dir, text_to_burn)
