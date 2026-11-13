# -*- coding: utf-8 -*-
"""
品牌图标构建：从 3D 渲染原图生成透明底 logo、favicon.ico、各尺寸 PNG。

原图是浅灰背景 + 底部投影 + 右下角水印。
做法：把"与四角背景色接近 / 低饱和高亮"的连通区域，从图片四边泛洪标记为背景。
主体（红框 + 奶油色脸）被红框完整包住，泛洪进不去，所以不会被误吃。
随后按主体包围盒裁切、居中留白、多尺寸导出。

用法：python scripts/brand-build.py
输出：public/logo.png(512) / logo-192.png / favicon.ico / favicon-32.png /
      favicon-16.png / apple-touch-icon.png / site.webmanifest
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_brand" / "logo-src.jpg"
PUBLIC = ROOT / "public"

PAD_RATIO = 0.05  # 主体最长边约占画布 90%


def background_mask(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    patch = 24
    corners = np.concatenate([
        rgb[:patch, :patch].reshape(-1, 3),
        rgb[:patch, -patch:].reshape(-1, 3),
        rgb[-patch:, :patch].reshape(-1, 3),
        rgb[-patch:, -patch:].reshape(-1, 3),
    ])
    bg = np.array([np.median(corners[:, i]) for i in range(3)])
    # 背景是中性浅灰、投影是中性灰，主体是红色（含奶油色内脸，但它被红框完整包住）。
    # 用"红色偏色"区分：redness 高的才是主体，中性色一律算背景候选，投影因此被一并清掉。
    rgb16 = rgb.astype(np.int16)
    redness = rgb16[..., 0] - (rgb16[..., 1] + rgb16[..., 2]) / 2
    candidate = redness < 45

    labels, count = ndimage.label(candidate, structure=np.ones((3, 3)))
    border = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1],
    ]))) - {0}
    bg_mask = np.isin(labels, list(border))

    print(f"背景基准色 {tuple(int(v) for v in bg)}；连通域 {count} 个，触边 {len(border)} 个；"
          f"背景占比 {bg_mask.mean() * 100:.1f}%")
    return bg_mask


def build_rgba(src: Image.Image) -> Image.Image:
    rgb = np.asarray(src.convert("RGB"))
    bg_mask = background_mask(rgb)
    subject = ~bg_mask

    ys, xs = np.where(subject)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    span = max(bottom - top, right - left) + 1
    pad = int(round(span * PAD_RATIO))
    side = span + pad * 2
    cy, cx = (top + bottom) // 2, (left + right) // 2
    y0, x0 = cy - side // 2, cx - side // 2

    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    sy0, sy1 = max(y0, 0), min(y0 + side, rgb.shape[0])
    sx0, sx1 = max(x0, 0), min(x0 + side, rgb.shape[1])
    dy0, dx0 = sy0 - y0, sx0 - x0
    canvas[dy0:dy0 + (sy1 - sy0), dx0:dx0 + (sx1 - sx0), :3] = rgb[sy0:sy1, sx0:sx1]
    canvas[dy0:dy0 + (sy1 - sy0), dx0:dx0 + (sx1 - sx0), 3] = np.where(
        subject[sy0:sy1, sx0:sx1], 255, 0
    )

    alpha = Image.fromarray(canvas[..., 3]).filter(ImageFilter.GaussianBlur(0.8))
    canvas[..., 3] = np.asarray(alpha)

    # 边缘去污：半透明像素的颜色被浅灰背景冲淡，缩到 16/32px 会在深色标签栏上留一圈白边。
    # 用距离变换把最近的实心主体颜色填进去，只保留形状由 alpha 决定。
    solid = canvas[..., 3] >= 200
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    canvas[..., :3] = np.where(
        (canvas[..., 3] < 200)[..., None],
        canvas[..., :3][idx[0], idx[1]],
        canvas[..., :3],
    )
    return Image.fromarray(canvas)


def square(img: Image.Image, size: int, pad: float = 0.04, bg=(0, 0, 0, 0)) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * (1 - pad * 2))
    scaled = img.copy()
    scaled.thumbnail((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return canvas


def main() -> None:
    art = build_rgba(Image.open(SRC))
    print(f"主体裁切后 {art.width}×{art.height}")

    PUBLIC.mkdir(exist_ok=True)
    square(art, 512).save(PUBLIC / "logo.png", optimize=True)
    square(art, 192).save(PUBLIC / "logo-192.png", optimize=True)

    master = Image.open(PUBLIC / "logo.png")
    square(master, 32, pad=0.08).save(PUBLIC / "favicon-32.png", optimize=True)
    square(master, 16, pad=0.08).save(PUBLIC / "favicon-16.png", optimize=True)

    # 小尺寸收紧留白，避免 16/32px 下糊成一团
    square(art, 256, pad=0.02).save(
        PUBLIC / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    # iOS 主屏图标不支持透明，铺白底
    square(art, 180, pad=0.08, bg=(255, 255, 255, 255)).convert("RGB").save(
        PUBLIC / "apple-touch-icon.png", optimize=True
    )

    (PUBLIC / "site.webmanifest").write_text(
        """{
  "name": "代码闯关 · Python 编程课外课",
  "short_name": "代码闯关",
  "start_url": "/enter",
  "display": "standalone",
  "background_color": "#FBFAF7",
  "theme_color": "#2BB3A3",
  "icons": [
    { "src": "/logo-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/logo.png", "sizes": "512x512", "type": "image/png" }
  ]
}
""",
        encoding="utf-8",
    )

    # 校验图：三种底色 + 16/32px 放大预览 + ico 最大帧
    for name, bg in (
        ("white", (255, 255, 255, 255)),
        ("dark", (24, 26, 28, 255)),
        ("brand", (43, 179, 163, 255)),
    ):
        sheet = Image.new("RGBA", (760, 260), bg)
        sheet.alpha_composite(square(Image.open(PUBLIC / "logo.png"), 240), (10, 10))
        sheet.alpha_composite(Image.open(PUBLIC / "favicon-32.png").resize((64, 64), Image.NEAREST), (270, 40))
        sheet.alpha_composite(Image.open(PUBLIC / "favicon-16.png").resize((64, 64), Image.NEAREST), (350, 40))
        sheet.alpha_composite(Image.open(PUBLIC / "favicon.ico").resize((240, 240), Image.NEAREST).convert("RGBA"), (450, 10))
        sheet.convert("RGB").save(ROOT / "_brand" / f"check-{name}.png")


if __name__ == "__main__":
    main()
