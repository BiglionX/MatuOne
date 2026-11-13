"""生成社交分享卡 og-cover.png（1200×630）。

沿用 brand-build.py 的产物 public/logo.png（透明底），不重新抠图。
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "public" / "logo.png"
OUT = ROOT / "public" / "og-cover.png"

W, H = 1200, 630
BG = (251, 250, 247)
INK = (30, 42, 46)
INK_SOFT = (92, 107, 114)
BRAND_SOFT = (228, 246, 242)
BRAND_ACTION = (23, 128, 116)

FONT_BOLD = "C:/Windows/Fonts/msyhbd.ttc"
FONT_REG = "C:/Windows/Fonts/msyh.ttc"


def main() -> None:
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    # 背景装饰：右上浅色圆
    draw.ellipse((820, -180, 1320, 220), fill=BRAND_SOFT)

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((300, 300), Image.LANCZOS)
    canvas.paste(logo, (84, (H - logo.height) // 2), logo)

    title_font = ImageFont.truetype(FONT_BOLD, 82)
    sub_font = ImageFont.truetype(FONT_REG, 38)
    tag_font = ImageFont.truetype(FONT_BOLD, 28)

    x = 440
    draw.text((x, 196), "代码闯关", font=title_font, fill=INK)
    draw.text((x, 320), "Python 编程课外课", font=sub_font, fill=INK_SOFT)
    draw.text((x, 392), "小学 2—5 年级 · 每节 20 分钟", font=sub_font, fill=INK_SOFT)

    # 底部标签
    tag_text = "14 天试用 · 最多 10 个席位"
    bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tw = bbox[2] - bbox[0]
    draw.rounded_rectangle((x, 470, x + tw + 56, 470 + 62), radius=31, fill=BRAND_ACTION)
    draw.text((x + 28, 470 + 14), tag_text, font=tag_font, fill=(255, 255, 255))

    canvas.save(OUT, "PNG", optimize=True)
    print(f"og-cover: {OUT} {W}x{H} {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
