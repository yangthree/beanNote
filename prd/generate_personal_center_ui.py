import math
import os
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1500
HEIGHT = 900
SCREEN_W = 360
SCREEN_H = 780
SCREEN_RADIUS = 60

# color palette
BG_TOP = (250, 245, 238)
BG_BOTTOM = (238, 226, 214)
ACCENT = (214, 181, 143)
ACCENT_DARK = (142, 109, 79)
CARD_BG = (255, 255, 255, 230)
TEXT_PRIMARY = (51, 51, 51)
TEXT_SECONDARY = (136, 136, 136)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates: List[Tuple[str, int]] = [
        ("/System/Library/Fonts/PingFang.ttc", 0 if not bold else 1),
        ("/System/Library/Fonts/PingFangHK.ttc", 0 if not bold else 1),
        ("/System/Library/Fonts/SFNSRounded.ttf", 0),
        ("/System/Library/Fonts/SFNSDisplay.ttf", 0),
        ("/System/Library/Fonts/Helvetica.ttc", 0),
    ]
    for path, index in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size, index=index)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_vertical_gradient(draw: ImageDraw.ImageDraw, width: int, height: int, top_color, bottom_color):
    for y in range(height):
        ratio = y / float(height - 1)
        r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))


def draw_glow(image: Image.Image, bbox: Tuple[int, int, int, int], color: Tuple[int, int, int], blur: int = 40, opacity: int = 80):
    glow_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.ellipse(bbox, fill=(color[0], color[1], color[2], opacity))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(blur))
    image.alpha_composite(glow_layer)


def rounded_rect(base: Image.Image, bbox: Tuple[int, int, int, int], radius: int, fill, outline=None, outline_width: int = 2):
    x1, y1, x2, y2 = bbox
    rect_w = x2 - x1
    rect_h = y2 - y1
    rect_image = Image.new("RGBA", (rect_w, rect_h), (0, 0, 0, 0))
    rect_draw = ImageDraw.Draw(rect_image)
    rect_draw.rounded_rectangle((0, 0, rect_w, rect_h), radius=radius, fill=fill, outline=outline, width=outline_width if outline else 0)
    base.alpha_composite(rect_image, dest=(x1, y1))


def draw_phone_frame(base: Image.Image, x: int, title: str):
    y = 60
    rounded_rect(base, (x, y, x + SCREEN_W, y + SCREEN_H), SCREEN_RADIUS, fill=(255, 255, 255, 245))
    draw = ImageDraw.Draw(base)
    top_font = load_font(26, bold=True)
    draw.text((x + SCREEN_W / 2, y - 30), title, fill=ACCENT_DARK, font=top_font, anchor="mm")


def draw_main_screen(base: Image.Image, x: int):
    y = 60
    draw = ImageDraw.Draw(base)
    padding = 24
    top = y + padding

    # top gradient card
    card_bbox = (x + padding, top, x + SCREEN_W - padding, top + 140)
    rounded_rect(base, card_bbox, 28, fill=(255, 255, 255, 230))
    draw_glow(base, (card_bbox[0], card_bbox[1] - 50, card_bbox[2], card_bbox[1] + 50), ACCENT, blur=60, opacity=90)

    avatar_radius = 35
    avatar_center = (card_bbox[0] + avatar_radius + 20, top + 70)
    draw.ellipse(
        (
            avatar_center[0] - avatar_radius,
            avatar_center[1] - avatar_radius,
            avatar_center[0] + avatar_radius,
            avatar_center[1] + avatar_radius,
        ),
        fill=(240, 230, 220),
    )
    draw.text((avatar_center[0], avatar_center[1]), "豆", fill=ACCENT_DARK, font=load_font(30, bold=True), anchor="mm")

    draw.text((avatar_center[0] + 90, avatar_center[1] - 16), "微信授权登录", fill=TEXT_PRIMARY, font=load_font(24, bold=True), anchor="lm")
    draw.text((avatar_center[0] + 90, avatar_center[1] + 16), "解锁个人中心功能", fill=TEXT_SECONDARY, font=load_font(18), anchor="lm")

    button_bbox = (card_bbox[2] - 140, card_bbox[3] - 46, card_bbox[2] - 24, card_bbox[3] - 10)
    rounded_rect(base, button_bbox, 20, fill=(214, 181, 143, 255))
    draw.text(((button_bbox[0] + button_bbox[2]) / 2, (button_bbox[1] + button_bbox[3]) / 2), "去登录", fill=(255, 255, 255), font=load_font(20, bold=True), anchor="mm")

    section_title_font = load_font(20, bold=True)
    draw.text((x + padding, card_bbox[3] + 40), "功能快捷入口", fill=TEXT_PRIMARY, font=section_title_font)

    cards = [
        ("常用冲煮设备", "手冲/意式设备一键选", "icon_device"),
        ("豆子库存管理", "剩余克数实时提醒", "icon_beans"),
    ]
    card_height = 120
    for idx, (title, desc, _) in enumerate(cards):
        top_y = card_bbox[3] + 70 + idx * (card_height + 20)
        rounded_rect(
            base,
            (x + padding, top_y, x + SCREEN_W - padding, top_y + card_height),
            26,
            fill=(255, 255, 255, 245),
        )
        draw.text((x + padding + 24, top_y + 30), title, fill=TEXT_PRIMARY, font=load_font(22, bold=True))
        draw.text((x + padding + 24, top_y + 70), desc, fill=TEXT_SECONDARY, font=load_font(18))
        draw.text((x + SCREEN_W - padding - 20, top_y + card_height / 2), "›", fill=ACCENT_DARK, font=load_font(36), anchor="mm")

    pill_bbox = (x + padding, y + SCREEN_H - 120, x + SCREEN_W - padding, y + SCREEN_H - 60)
    rounded_rect(base, pill_bbox, 32, fill=(255, 255, 255, 235))
    draw.text((pill_bbox[0] + 20, pill_bbox[1] + 20), "数据概览", fill=TEXT_PRIMARY, font=load_font(20, bold=True))
    draw.text((pill_bbox[0] + 20, pill_bbox[1] + 52), "默认设备 2 台 · 在库豆子 5 款", fill=TEXT_SECONDARY, font=load_font(16))


def draw_device_screen(base: Image.Image, x: int):
    y = 60
    padding = 20
    draw = ImageDraw.Draw(base)

    draw.text((x + SCREEN_W / 2, y + 36), "常用冲煮设备", fill=TEXT_PRIMARY, font=load_font(24, bold=True), anchor="mm")
    rounded_rect(base, (x + padding, y + 70, x + SCREEN_W - padding, y + 120), 22, fill=(255, 255, 255, 230))
    draw.text((x + padding + 10, y + 90), "＋  添加设备", fill=ACCENT_DARK, font=load_font(20, bold=True))

    groups = [
        ("手冲设备", ["Fellow Stagg EKG", "ORIGAMI Dripper"]),
        ("意式设备", ["La Marzocco Linea Mini"]),
        ("磨豆机", ["小飞鹰 640S (默认)", "Comandante C40 MK4"]),
    ]

    current_y = y + 140
    for group, items in groups:
        draw.text((x + padding, current_y), group, fill=TEXT_PRIMARY, font=load_font(20, bold=True))
        current_y += 10
        for item in items:
            card_bbox = (x + padding, current_y + 20, x + SCREEN_W - padding, current_y + 110)
            rounded_rect(base, card_bbox, 24, fill=(255, 255, 255, 245))
            draw.text((card_bbox[0] + 20, card_bbox[1] + 20), item, fill=TEXT_PRIMARY, font=load_font(20, bold=True))
            draw.text((card_bbox[0] + 20, card_bbox[1] + 60), "品牌 · 型号", fill=TEXT_SECONDARY, font=load_font(16))
            draw.text((card_bbox[2] - 30, (card_bbox[1] + card_bbox[3]) / 2), "›", fill=ACCENT_DARK, font=load_font(32), anchor="mm")
            current_y += 100


def draw_inventory_screen(base: Image.Image, x: int):
    y = 60
    padding = 18
    draw = ImageDraw.Draw(base)
    draw.text((x + SCREEN_W / 2, y + 36), "豆子库存管理", fill=TEXT_PRIMARY, font=load_font(24, bold=True), anchor="mm")

    tab_bbox = (x + padding, y + 70, x + SCREEN_W - padding, y + 110)
    rounded_rect(base, tab_bbox, 26, fill=(255, 255, 255, 200))
    mid = (tab_bbox[0] + tab_bbox[2]) / 2
    rounded_rect(base, (tab_bbox[0] + 8, tab_bbox[1] + 6, mid - 8, tab_bbox[3] - 6), 20, fill=ACCENT)
    draw.text(((tab_bbox[0] + mid) / 2, (tab_bbox[1] + tab_bbox[3]) / 2), "在库", fill=(255, 255, 255), font=load_font(18, bold=True), anchor="mm")
    draw.text(((mid + tab_bbox[2]) / 2, (tab_bbox[1] + tab_bbox[3]) / 2), "已用完", fill=TEXT_SECONDARY, font=load_font(18), anchor="mm")

    card_w = (SCREEN_W - padding * 2 - 20) / 2
    card_h = 170
    start_y = y + 140
    bean_cards = [
        ("花魁 #102", "浅烘 · 余 120g", True),
        ("巴拿马 翡翠", "中烘 · 余 45g", False),
        ("耶加雪菲", "浅烘 · 余 18g", True),
        ("宏都拉斯", "深烘 · 余 200g", False),
    ]
    for idx, (title, info, warn) in enumerate(bean_cards):
        row = idx // 2
        col = idx % 2
        left = x + padding + col * (card_w + 20)
        top = start_y + row * (card_h + 24)
        card_bbox = (left, top, left + card_w, top + card_h)
        rounded_rect(base, card_bbox, 24, fill=(255, 255, 255, 240))
        draw.rectangle((left + 16, top + 16, left + card_w - 16, top + 70), fill=(244, 229, 213))
        draw.text((left + 24, top + 90), title, fill=TEXT_PRIMARY, font=load_font(18, bold=True))
        draw.text((left + 24, top + 120), info, fill=TEXT_SECONDARY, font=load_font(16))
        if warn:
            rounded_rect(base, (left + 24, top + 135, left + 110, top + 160), 14, fill=(242, 153, 74, 255))
            draw.text((left + 67, top + 147), "即将用完", fill=(255, 255, 255), font=load_font(14, bold=True), anchor="mm")

    footer_bbox = (x + padding, y + SCREEN_H - 140, x + SCREEN_W - padding, y + SCREEN_H - 70)
    rounded_rect(base, footer_bbox, 30, fill=(255, 255, 255, 235))
    draw.text((footer_bbox[0] + 20, footer_bbox[1] + 20), "记录消耗 / 标记已用完", fill=TEXT_PRIMARY, font=load_font(18, bold=True))
    draw.text((footer_bbox[0] + 20, footer_bbox[1] + 50), "长按卡片可快速减重", fill=TEXT_SECONDARY, font=load_font(16))


def main():
    base = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    draw_vertical_gradient(draw, WIDTH, HEIGHT, BG_TOP, BG_BOTTOM)

    draw_glow(base, (150, 50, 550, 450), ACCENT, blur=120, opacity=60)
    draw_glow(base, (900, 350, 1300, 700), (255, 210, 180), blur=140, opacity=50)

    draw_phone_frame(base, 120, "「我的」主入口")
    draw_main_screen(base, 120)

    draw_phone_frame(base, 570, "常用冲煮设备")
    draw_device_screen(base, 570)

    draw_phone_frame(base, 1020, "豆子库存管理")
    draw_inventory_screen(base, 1020)

    title_font = load_font(34, bold=True)
    subtitle_font = load_font(22)
    draw.text((WIDTH / 2, 30), "CoffeeNote · 个人中心视觉稿", fill=ACCENT_DARK, font=title_font, anchor="ma")
    draw.text((WIDTH / 2, 80), "高光玻璃风 · 浅咖啡色系", fill=TEXT_SECONDARY, font=subtitle_font, anchor="ma")

    output_path = os.path.join(os.path.dirname(__file__), "personal_center_ui.png")
    base = base.convert("RGB")
    base.save(output_path, quality=95)
    print(f"UI mock saved to {output_path}")


if __name__ == "__main__":
    main()

