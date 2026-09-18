import os
import math
from PIL import Image, ImageDraw, ImageFilter

def draw_lotus(draw, cx, cy, scale, color, center_glow_color):
    # Center lotus petal (upright teardrop/leaf)
    p_center = [
        (cx, cy - int(95 * scale)),
        (cx + int(32 * scale), cy - int(35 * scale)),
        (cx + int(24 * scale), cy + int(45 * scale)),
        (cx, cy + int(60 * scale)),
        (cx - int(24 * scale), cy + int(45 * scale)),
        (cx - int(32 * scale), cy - int(35 * scale)),
    ]
    draw.polygon(p_center, fill=color)
    
    # Left inner petal
    p_left_in = [
        (cx - int(20 * scale), cy + int(50 * scale)),
        (cx - int(55 * scale), cy + int(10 * scale)),
        (cx - int(65 * scale), cy - int(45 * scale)),
        (cx - int(30 * scale), cy - int(40 * scale)),
        (cx - int(10 * scale), cy + int(10 * scale)),
    ]
    draw.polygon(p_left_in, fill=color)
    
    # Right inner petal
    p_right_in = [
        (cx + int(20 * scale), cy + int(50 * scale)),
        (cx + int(55 * scale), cy + int(10 * scale)),
        (cx + int(65 * scale), cy - int(45 * scale)),
        (cx + int(30 * scale), cy - int(40 * scale)),
        (cx + int(10 * scale), cy + int(10 * scale)),
    ]
    draw.polygon(p_right_in, fill=color)

    # Left outer petal
    p_left_out = [
        (cx - int(15 * scale), cy + int(58 * scale)),
        (cx - int(75 * scale), cy + int(45 * scale)),
        (cx - int(95 * scale), cy - int(5 * scale)),
        (cx - int(60 * scale), cy - int(15 * scale)),
        (cx - int(25 * scale), cy + int(35 * scale)),
    ]
    draw.polygon(p_left_out, fill=color)

    # Right outer petal
    p_right_out = [
        (cx + int(15 * scale), cy + int(58 * scale)),
        (cx + int(75 * scale), cy + int(45 * scale)),
        (cx + int(95 * scale), cy - int(5 * scale)),
        (cx + int(60 * scale), cy - int(15 * scale)),
        (cx + int(25 * scale), cy + int(35 * scale)),
    ]
    draw.polygon(p_right_out, fill=color)

    # Bottom supportive cradle / base curve
    draw.ellipse([
        cx - int(45 * scale), cy + int(48 * scale),
        cx + int(45 * scale), cy + int(68 * scale)
    ], fill=center_glow_color)

def generate_logo(size=512, is_maskable=False):
    # Render at 2x for antialiasing
    render_size = size * 2
    img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = render_size // 2
    cy = render_size // 2
    radius = (render_size // 2) if is_maskable else int(render_size * 0.48)

    # Background gradient / disc
    for r in range(radius, 0, -2):
        factor = r / radius
        red = int(75 * (1 - factor * 0.7) + 22 * (factor * 0.7))
        green = int(35 * (1 - factor * 0.7) + 12 * (factor * 0.7))
        blue = int(58 * (1 - factor * 0.7) + 20 * (factor * 0.7))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(red, green, blue, 255))

    # Outer subtle glowing ring if non-maskable
    if not is_maskable:
        draw.ellipse(
            [cx - radius + 4, cy - radius + 4, cx + radius - 4, cy + radius - 4],
            outline=(208, 188, 255, 90),
            width=6
        )

    # Ambient center glow
    glow_img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_r = int(render_size * 0.28)
    glow_draw.ellipse([cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r], fill=(208, 188, 255, 60))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=30))
    img = Image.alpha_composite(img, glow_img)
    draw = ImageDraw.Draw(img)

    # Draw lotus symbol
    scale = (render_size / 512.0) * (0.85 if is_maskable else 1.05)
    
    # Shadow layer
    shadow_img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    draw_lotus(shadow_draw, cx, cy + int(10 * scale), scale, (10, 5, 10, 140), (10, 5, 10, 140))
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=int(12 * scale)))
    img = Image.alpha_composite(img, shadow_img)
    draw = ImageDraw.Draw(img)

    # Main Emblem
    lotus_color = (248, 238, 246, 255) # Radiant white-lavender
    gold_accent = (220, 195, 250, 255) # Soft lavender glow
    draw_lotus(draw, cx, cy, scale, lotus_color, gold_accent)

    # Downsample with Lanczos for super smooth edges
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    base_dir = r"d:\Copy\V5(frontend)\frontend\public"
    icons_dir = os.path.join(base_dir, "icons")
    favicons_dir = os.path.join(base_dir, "assets", "favicon")
    
    os.makedirs(icons_dir, exist_ok=True)
    os.makedirs(favicons_dir, exist_ok=True)

    print("Generating 512x512 standard icon...")
    icon_512 = generate_logo(512, is_maskable=False)
    icon_512.save(os.path.join(icons_dir, "icon-512x512.png"))
    icon_512.save(os.path.join(base_dir, "android-chrome-512x512.png"))
    icon_512.save(os.path.join(favicons_dir, "android-chrome-512x512.png"))

    print("Generating 192x192 standard icon...")
    icon_192 = generate_logo(192, is_maskable=False)
    icon_192.save(os.path.join(icons_dir, "icon-192x192.png"))
    icon_192.save(os.path.join(base_dir, "android-chrome-192x192.png"))
    icon_192.save(os.path.join(favicons_dir, "android-chrome-192x192.png"))

    print("Generating maskable icons...")
    maskable_512 = generate_logo(512, is_maskable=True)
    maskable_512.save(os.path.join(icons_dir, "icon-maskable-512x512.png"))

    maskable_192 = generate_logo(192, is_maskable=True)
    maskable_192.save(os.path.join(icons_dir, "icon-maskable-192x192.png"))

    print("Generating Apple touch icon...")
    apple_180 = generate_logo(180, is_maskable=False)
    apple_180.save(os.path.join(icons_dir, "apple-touch-icon.png"))
    apple_180.save(os.path.join(base_dir, "apple-touch-icon.png"))
    apple_180.save(os.path.join(favicons_dir, "apple-touch-icon.png"))

    print("Generating favicon-32x32 & 16x16...")
    fav_32 = generate_logo(32, is_maskable=False)
    fav_32.save(os.path.join(icons_dir, "favicon-32x32.png"))
    fav_32.save(os.path.join(base_dir, "favicon-32x32.png"))
    fav_32.save(os.path.join(favicons_dir, "favicon-32x32.png"))

    fav_16 = generate_logo(16, is_maskable=False)
    fav_16.save(os.path.join(icons_dir, "favicon-16x16.png"))
    fav_16.save(os.path.join(base_dir, "favicon-16x16.png"))
    fav_16.save(os.path.join(favicons_dir, "favicon-16x16.png"))

    print("Generating favicon.ico...")
    icon_512.save(
        os.path.join(base_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    icon_512.save(
        os.path.join(favicons_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    app_fav = r"d:\Copy\V5(frontend)\frontend\app\favicon.ico"
    icon_512.save(
        app_fav,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )

    print("All Mythri app icons and favicons generated successfully!")

if __name__ == "__main__":
    main()
