#!/usr/bin/env python3
"""Gera ícones para APK DEBUG a partir da identidade oficial do PP-MT.
Não substitui o manifesto web e não cria arquivos binários no repositório.
"""
from pathlib import Path
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "icon.svg"
OUT = ROOT / "android" / "app" / "src" / "main" / "res"
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

if not SVG.exists():
    raise SystemExit("icon.svg não encontrado.")
for density, size in DENSITIES.items():
    folder = OUT / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / "ic_launcher.png"
    cairosvg.svg2png(url=str(SVG), write_to=str(dest), output_width=size, output_height=size)
    print(f"Ícone Android: {dest.relative_to(ROOT)} ({size}px)")
