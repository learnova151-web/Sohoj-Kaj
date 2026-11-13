import struct, zlib, math

SIZE = 512
BG = (30, 110, 78)
FG = (250, 246, 239)

def in_rounded_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    nx = max(x0 + r - x, 0, x - (x1 - r))
    ny = max(y0 + r - y, 0, y - (y1 - r))
    return nx * nx + ny * ny <= r * r

def in_circle(x, y, cx, cy, r):
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def in_ring(x, y, cx, cy, r_outer, r_inner):
    d2 = (x - cx) ** 2 + (y - cy) ** 2
    return r_inner ** 2 <= d2 <= r_outer ** 2

rows = []
for y in range(SIZE):
    row = bytearray()
    row.append(0)
    for x in range(SIZE):
        color = (0, 0, 0, 0)
        if in_rounded_rect(x, y, 16, 16, SIZE - 17, SIZE - 17, 96):
            color = (*BG, 255)
            cx, cy = SIZE / 2, SIZE / 2 - 30
            if 176 <= x <= 336 and 96 <= y <= 266 and in_rounded_rect(x, y, 176, 96, 336, 266, 80):
                color = (*FG, 255)
            elif in_ring(x, y, cx, cy + 8, 118, 88):
                color = (*FG, 255)
            elif 248 <= x <= 264 and 266 <= y <= 350:
                color = (*FG, 255)
            elif in_rounded_rect(x, y, 196, 344, 316, 368, 12):
                color = (*FG, 255)
        row.extend(color)
    rows.append(bytes(row))

raw = b"".join(rows)

def chunk(tag, data):
    c = struct.pack(">I", len(data)) + tag + data
    c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return c

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(raw, 9))
png += chunk(b"IEND", b"")

with open("build/icon.png", "wb") as f:
    f.write(png)

def scale(nearest, k):
    out = bytearray()
    out.append(0)
    for y in range(0, SIZE, k):
        for x in range(0, SIZE, k):
            i = (y * SIZE + x) * 4
            out.extend(raw[i:i + 4])
    return bytes(out)

small = b"\x89PNG\r\n\x1a\n"
small += chunk(b"IHDR", struct.pack(">IIBBBBB", 32, 32, 8, 6, 0, 0, 0))
small += chunk(b"IDAT", zlib.compress(scale(raw, 16), 9))
small += chunk(b"IEND", b"")

with open("build/tray.png", "wb") as f:
    f.write(small)

print("icons written")
