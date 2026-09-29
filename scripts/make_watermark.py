from PIL import Image, ImageDraw, ImageFont

text = "themotorlist.ge"
pad_x, pad_y = 24, 14
font_size = 44

font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
try:
    font = ImageFont.truetype(font_path, font_size)
except Exception:
    font = ImageFont.load_default()

# measure text
tmp = Image.new("RGBA", (10, 10))
d = ImageDraw.Draw(tmp)
bbox = d.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

W, H = tw + pad_x * 2, th + pad_y * 2
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# semi-transparent rounded box behind the text for legibility on any background
draw.rounded_rectangle([0, 0, W, H], radius=10, fill=(0, 0, 0, 110))
draw.text((pad_x - bbox[0], pad_y - bbox[1]), text, font=font, fill=(255, 255, 255, 210))

img.save("/Users/eldino/projects/TMLG_webapp/scripts/watermark.png")
print(f"watermark.png: {W}x{H}")
