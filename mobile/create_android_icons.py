#!/usr/bin/env python3
"""Usa a arte SVG existente da marca PP-MT no Android (sem imagens externas).

Execute SOMENTE após `npx cap add android`. Cria recursos nativos no projeto
gerado e temporário, que não é enviado ao repositório.
"""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
ANDROID_RES = ROOT / "mobile" / "android" / "app" / "src" / "main" / "res"
SVG = ROOT / "icon.svg"
DENSITIES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

if not SVG.exists() or not ANDROID_RES.is_dir():
    raise SystemExit("Prepare o projeto Android Capacitor e confira icon.svg.")

for density, size in DENSITIES.items():
    folder = ANDROID_RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    for basename in ("ic_launcher", "ic_launcher_round"):
        destination = folder / f"{basename}.png"
        cairosvg.svg2png(
            url=str(SVG), write_to=str(destination),
            output_width=size, output_height=size,
        )

    # Capacitor/Android podem usar ic_launcher_foreground em recursos adaptativos.
    foreground = folder / "ic_launcher_foreground.png"
    cairosvg.svg2png(
        url=str(SVG), write_to=str(foreground),
        output_width=size, output_height=size,
    )

print("Ícones de demonstração Android gerados a partir de icon.svg.")
