# pip install cairosvg ; python3 tools/rasterize.py
import cairosvg, os
os.makedirs("assets", exist_ok=True)
for s in [1024,512,192,180,32]:
    cairosvg.svg2png(url="assets/icon.svg", write_to=f"assets/icon-{s}.png", output_width=s, output_height=s)
print("icons rasterized")