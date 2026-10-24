"""Generate PNG install icons from the approved three-bar mark geometry."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parent / "studio/public/icons"
output.mkdir(parents=True, exist_ok=True)
for size in (180, 192, 512):
    scale = 4
    image = Image.new("RGB", (size * scale, size * scale), "#007D7B")
    draw = ImageDraw.Draw(image)
    unit = size * scale / 100
    def box(values):
        return tuple(round(value * unit) for value in values)
    for left in (25, 43):
        draw.rounded_rectangle(box((left, 27, left + 11, 73)), radius=round(5.5 * unit), fill="#FFFDFA")
    draw.rounded_rectangle(box((61, 27, 77, 73)), radius=round(11 * unit), fill="#FFFDFA")
    draw.rectangle(box((61, 27, 66, 73)), fill="#FFFDFA")
    image.resize((size, size), Image.Resampling.LANCZOS).save(output / f"icon-{size}.png")
