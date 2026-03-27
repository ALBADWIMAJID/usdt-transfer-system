from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]

MASTER_SIZE = 1024
OUTPUTS = [
    (ROOT / "public" / "apple-touch-icon-v3.png", 180, False),
    (ROOT / "public" / "icons" / "icon-192-v3.png", 192, False),
    (ROOT / "public" / "icons" / "icon-512-v3.png", 512, False),
    (ROOT / "public" / "icons" / "icon-maskable-512-v3.png", 512, True),
]


def blend_channel(left: int, right: int, ratio: float) -> int:
    return round(left + (right - left) * ratio)


def diagonal_gradient(size: int, start_hex: str, end_hex: str) -> Image.Image:
    start = ImageColor.getrgb(start_hex)
    end = ImageColor.getrgb(end_hex)
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    denominator = max((size - 1) * 2, 1)

    for y in range(size):
        for x in range(size):
            ratio = (x + y) / denominator
            pixels[x, y] = (
                blend_channel(start[0], end[0], ratio),
                blend_channel(start[1], end[1], ratio),
                blend_channel(start[2], end[2], ratio),
                255,
            )

    return image


def add_glow(base: Image.Image, box: tuple[float, float, float, float], color: str, alpha: int, blur: float) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rgb = ImageColor.getrgb(color)
    draw.ellipse(box, fill=(rgb[0], rgb[1], rgb[2], alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(overlay)


def draw_round_segment(
    image: Image.Image,
    start: tuple[float, float],
    end: tuple[float, float],
    width: float,
    fill: tuple[int, int, int, int],
) -> None:
    draw = ImageDraw.Draw(image)
    draw.line([start, end], fill=fill, width=round(width))
    radius = width / 2

    for point in (start, end):
        draw.ellipse(
            (
                point[0] - radius,
                point[1] - radius,
                point[0] + radius,
                point[1] + radius,
            ),
            fill=fill,
        )


def build_icon_master(maskable: bool = False) -> Image.Image:
    size = MASTER_SIZE
    icon = diagonal_gradient(size, "#1B425D", "#0F273A")

    add_glow(icon, (size * 0.05, size * 0.02, size * 0.45, size * 0.28), "#FFFFFF", 24, size * 0.06)
    add_glow(icon, (size * 0.18, size * 0.16, size * 0.86, size * 0.64), "#0D7A72", 26, size * 0.10)
    add_glow(icon, (size * 0.14, size * 0.64, size * 0.48, size * 0.94), "#19B7AB", 18, size * 0.08)

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    if maskable:
        top_y = size * 0.255
        bottom_y = size * 0.675
        left_top_x = size * 0.355
        left_bottom_x = size * 0.472
        right_top_x = size * 0.645
        right_bottom_x = size * 0.528
        stroke = size * 0.108
        bar_width = size * 0.11
        bar_height = size * 0.024
        bar_y = size * 0.765
    else:
        top_y = size * 0.235
        bottom_y = size * 0.685
        left_top_x = size * 0.34
        left_bottom_x = size * 0.472
        right_top_x = size * 0.66
        right_bottom_x = size * 0.528
        stroke = size * 0.118
        bar_width = size * 0.12
        bar_height = size * 0.026
        bar_y = size * 0.772

    shadow_offset = (size * 0.012, size * 0.02)
    shadow_color = (7, 18, 26, 92)
    draw_round_segment(
        shadow,
        (left_top_x + shadow_offset[0], top_y + shadow_offset[1]),
        (left_bottom_x + shadow_offset[0], bottom_y + shadow_offset[1]),
        stroke,
        shadow_color,
    )
    draw_round_segment(
        shadow,
        (right_top_x + shadow_offset[0], top_y + shadow_offset[1]),
        (right_bottom_x + shadow_offset[0], bottom_y + shadow_offset[1]),
        stroke,
        shadow_color,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.016))
    icon.alpha_composite(shadow)

    teal = (13, 122, 114, 255)
    draw_round_segment(icon, (left_top_x, top_y), (left_bottom_x, bottom_y), stroke, teal)
    draw_round_segment(icon, (right_top_x, top_y), (right_bottom_x, bottom_y), stroke, teal)

    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_round_segment(
        highlight,
        (left_top_x - size * 0.01, top_y - size * 0.01),
        (left_bottom_x - size * 0.01, bottom_y - size * 0.015),
        stroke * 0.33,
        (116, 255, 236, 48),
    )
    draw_round_segment(
        highlight,
        (right_top_x - size * 0.006, top_y - size * 0.01),
        (right_bottom_x - size * 0.006, bottom_y - size * 0.015),
        stroke * 0.22,
        (180, 255, 246, 24),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(size * 0.01))
    icon.alpha_composite(highlight)

    accent = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    bar_left = (size - bar_width) / 2
    accent_draw.rounded_rectangle(
        (bar_left, bar_y, bar_left + bar_width, bar_y + bar_height),
        radius=bar_height / 2,
        fill=ImageColor.getrgb("#C89A43") + (255,),
    )
    accent = accent.filter(ImageFilter.GaussianBlur(size * 0.002))
    icon.alpha_composite(accent)

    return icon


def export_icons() -> None:
    masters = {
        False: build_icon_master(maskable=False),
        True: build_icon_master(maskable=True),
    }

    for output_path, size, maskable in OUTPUTS:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        masters[maskable].resize((size, size), Image.Resampling.LANCZOS).save(output_path, format="PNG")


if __name__ == "__main__":
    export_icons()
