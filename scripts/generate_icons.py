import zlib
import struct
import os

def create_png(width, height, r, g, b, a=255):
    # Signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr = struct.pack('!I4sIIBBBBB', 13, b'IHDR', width, height, 8, 6, 0, 0, 0)
    ihdr += struct.pack('!I', zlib.crc32(ihdr[4:]) & 0xFFFFFFFF)
    png += ihdr
    
    # IDAT
    # Raw data: (1 byte filter (0) + width * 4 bytes pixel data) * height
    # We'll just valid filter 0 (None) for each scanline
    raw_data = b''
    pixel = struct.pack('BBBB', r, g, b, a)
    scanline = b'\x00' + (pixel * width)
    raw_data = scanline * height
    
    compressed = zlib.compress(raw_data)
    idat = struct.pack('!I4s', len(compressed), b'IDAT') + compressed
    idat += struct.pack('!I', zlib.crc32(idat[4:]) & 0xFFFFFFFF)
    png += idat
    
    # IEND
    iend = struct.pack('!I4s', 0, b'IEND')
    iend += struct.pack('!I', zlib.crc32(iend[4:]) & 0xFFFFFFFF)
    png += iend
    
    return png

def create_ico(png_data):
    # ICO Header
    # 0, 1 (ICO), 1 (count)
    header = struct.pack('<HHH', 0, 1, 1)
    
    # Directory Entry
    # Width (0=256), Height (0=256), ColorCount (0), Reserved (0), Planes (1), BitCount (32), Size, Offset
    # We assume the PNG is 256x256 or can simply say 0 for 256. 
    # For simplicity, let's claim it is 256x256.
    width = 0
    height = 0
    size = len(png_data)
    offset = 6 + 16 # Header + 1 DirEntry
    
    entry = struct.pack('<BBBBHHII', width, height, 0, 0, 1, 32, size, offset)
    
    return header + entry + png_data

def main():
    if not os.path.exists('src-tauri/icons'):
        os.makedirs('src-tauri/icons')
        
    # Create master icon.png (512x512) - Blueish
    icon_512 = create_png(512, 512, 59, 130, 246) # #3B82F6 (Blue-500)
    with open('src-tauri/icons/icon.png', 'wb') as f:
        f.write(icon_512)
        
    # Create 32x32
    icon_32 = create_png(32, 32, 59, 130, 246)
    with open('src-tauri/icons/32x32.png', 'wb') as f:
        f.write(icon_32)
        
    # Create 128x128
    icon_128 = create_png(128, 128, 59, 130, 246)
    with open('src-tauri/icons/128x128.png', 'wb') as f:
        f.write(icon_128)
        
    # Create ICO (using a 256x256 resized version or just the 128 one? Windows prefers 256 for large ones)
    # Let's verify if 256 is needed. Standard ico can hold multiple sizes.
    # For minimal viable ico, one 256x256 image is usually fine.
    icon_256 = create_png(256, 256, 59, 130, 246)
    ico_data = create_ico(icon_256)
    with open('src-tauri/icons/icon.ico', 'wb') as f:
        f.write(ico_data)

if __name__ == '__main__':
    main()
