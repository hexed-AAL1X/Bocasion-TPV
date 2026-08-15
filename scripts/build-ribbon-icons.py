#!/usr/bin/env python3
"""Genera iconos activos de la cinta y catálogo completo en public/images/iconos/."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WUA = Path(
    os.environ.get("WUA_ICONS", "/tmp/wua/Icons/Windows Vista/ico")
)
VB_DEMO = Path(
    os.environ.get(
        "VB_DEMO",
        ROOT / "public/images/ribbon/_vendor/vista-business-demo",
    )
)
RIBBON = ROOT / "public" / "images" / "ribbon"
CATALOG = ROOT / "public" / "images" / "iconos"

# Candidatos para comparar en el catálogo (índices shell32 / imageres)
CATALOG_GROUPS: dict[str, list[tuple[str, int]]] = {
    "inbox": [
        ("shell32", n)
        for n in (
            15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 47,
            112, 113, 114, 115, 116, 117, 118,
            168, 169, 170, 171, 172,
            238, 239, 240, 247,
            260, 261, 262, 272, 273, 275, 278,
        )
    ],
    "clientes": [
        ("shell32", n)
        for n in (
            167, 168, 175, 177, 192, 275, 281, 289, 290,
            16710, 16715, 16717, 16718, 16780, 16781, 16782, 16783,
        )
    ]
    + [("imageres", n) for n in range(100, 200)],
    "menu": [
        ("shell32", n)
        for n in (
            46, 47, 48, 49, 50, 133, 134, 135, 137, 138,
            151, 152, 160, 161, 165, 166, 274,
        )
    ],
    "productos": [("shell32", n) for n in (23, 176, 259, 275)],
    "mostrador": [("shell32", n) for n in (193, 275, 281)],
    "cobranzas": [],  # solo demo PNG abajo
}


def load_ico(path: Path, size: int = 48) -> Image.Image:
    img = Image.open(path)
    best = img.copy()
    if hasattr(img, "n_frames"):
        for i in range(img.n_frames):
            img.seek(i)
            if img.size[0] >= best.size[0]:
                best = img.copy()
    best = best.convert("RGBA")
    best.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(best, ((size - best.width) // 2, (size - best.height) // 2), best)
    return canvas


def load_png(path: Path, size: int = 48) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    return canvas


def ico_path(dll: str, index: int) -> Path:
    folder = dll if dll.endswith(".dll") else f"{dll}.dll"
    return WUA / folder / f"ICON{index}_1.ico"


def badge_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "DejaVuSans-Bold.ttf",
        "Arial Bold.ttf",
        "arialbd.ttf",
        "LiberationSans-Bold.ttf",
    ):
        for base in (
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/truetype/liberation",
            "/usr/share/fonts/TTF",
        ):
            p = Path(base) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def add_doc_badge(base: Image.Image, text: str) -> Image.Image:
    """Insignia azul estilo ERP (documento + letras)."""
    out = base.copy()
    d = ImageDraw.Draw(out)
    size = out.size[0]
    r = max(9, int(size * 0.24))
    cx, cy = size - r - 1, size - r - 1
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(30, 90, 180, 255), outline=(12, 48, 110, 255))
    font_size = max(7, int(r * (0.95 if len(text) <= 2 else 0.72)))
    font = badge_font(font_size)
    tw = d.textlength(text, font=font)
    th = font_size
    d.text((cx - tw / 2, cy - th / 2 - 1), text, fill=(255, 255, 255, 255), font=font)
    return out


def save_icon(img: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="PNG", optimize=True)


def build_ribbon_icons() -> list[tuple[str, Image.Image]]:
    s32 = WUA / "shell32.dll"
    img_res = WUA / "imageres.dll"
    doc_base = load_ico(img_res / "ICON102_1.ico")

    return [
        ("inbox", load_ico(img_res / "ICON184_1.ico")),
        ("productos", load_ico(s32 / "ICON171_1.ico")),
        ("orden-compra", add_doc_badge(doc_base, "OC")),
        ("notas-ingreso", add_doc_badge(doc_base, "NI")),
        ("notas-salida", add_doc_badge(doc_base, "NS")),
        ("mostrador", load_ico(img_res / "ICON178_1.ico")),
        ("menu", load_ico(img_res / "ICON121_1.ico")),
        ("remision", add_doc_badge(doc_base, "G")),
        ("boleta", add_doc_badge(doc_base, "B")),
        ("factura", add_doc_badge(doc_base, "F")),
        ("nota-vta", add_doc_badge(doc_base, "NV")),
        ("clientes", load_ico(img_res / "ICON130_1.ico")),
        ("cobranzas", load_png(VB_DEMO / "650600-coin-box.png")),
    ]


def catalog_filename(group: str, dll: str, index: int) -> str:
    return f"{group}-{dll}-{index}.png"


def write_catalog_index(files_by_group: dict[str, list[str]]) -> None:
    sections: list[str] = []
    order = ["activo", *sorted(k for k in files_by_group if k != "activo")]
    labels = {
        "activo": "En uso ahora (cinta)",
        "inbox": "Actualizar Inbox",
        "clientes": "Clientes",
        "menu": "Definir menú",
        "productos": "Padrón de productos",
        "mostrador": "Mostrador ventas",
        "cobranzas": "Cobranzas",
        "documentos": "Documentos (base + insignia)",
    }
    for group in order:
        names = sorted(files_by_group.get(group, []))
        if not names:
            continue
        title = labels.get(group, group)
        cards = []
        for name in names:
            cls = ' class="activo"' if group == "activo" else ""
            cards.append(
                f'    <figure{cls}><img src="{name}" alt="{name}">'
                f"<figcaption>{name}</figcaption></figure>"
            )
        sections.append(f"  <h2>{title}</h2>\n  <div class=\"grid\">\n" + "\n".join(cards) + "\n  </div>")

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catálogo iconos — BocaSoft</title>
  <style>
    body {{ font-family: system-ui, sans-serif; background: #e8e8e8; margin: 1rem 1.5rem; color: #222; }}
    h1 {{ font-size: 1.2rem; margin-bottom: 0.25rem; }}
    p {{ font-size: 0.9rem; color: #444; max-width: 52rem; }}
    h2 {{ font-size: 1rem; margin: 1.75rem 0 0.5rem; padding-bottom: 0.35rem; border-bottom: 1px solid #bbb; }}
    .grid {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    figure {{ margin: 0; text-align: center; background: #fff; border: 1px solid #ccc; padding: 10px 8px 6px; width: 108px; box-shadow: 0 1px 2px rgba(0,0,0,.08); }}
    figure.activo {{ border: 2px solid #1a5fb4; box-shadow: 0 0 0 1px #1a5fb4; }}
    img {{ width: 48px; height: 48px; display: block; margin: 0 auto; image-rendering: pixelated; }}
    figcaption {{ font-size: 9px; line-height: 1.25; word-break: break-all; margin-top: 6px; color: #333; }}
    code {{ background: #fff; padding: 0.1em 0.35em; border-radius: 3px; font-size: 0.85em; }}
  </style>
</head>
<body>
  <h1>Catálogo de iconos (48×48)</h1>
  <p>Con <code>npm run dev</code>, abre <code>/images/iconos/</code> en el navegador. Elige por nombre de archivo (ej. <code>inbox-shell32-27.png</code>) y dímelo para dejarlo en la cinta.</p>
{chr(10).join(sections)}
</body>
</html>
"""
    (CATALOG / "index.html").write_text(html, encoding="utf-8")


def build_catalog(ribbon_mapping: list[tuple[str, Image.Image]]) -> None:
    if CATALOG.exists():
        for old in CATALOG.glob("*.png"):
            old.unlink()

    files_by_group: dict[str, list[str]] = {"activo": [], "documentos": []}

    for name, icon in ribbon_mapping:
        fname = f"activo-{name}.png"
        save_icon(icon, CATALOG / fname)
        files_by_group["activo"].append(fname)
        print(f"  catálogo: {fname}")

    s32 = WUA / "shell32.dll"
    img_res = WUA / "imageres.dll"
    doc_base = load_ico(img_res / "ICON102_1.ico")
    for badge in ("OC", "NI", "NS", "G", "B", "F", "NV"):
        fname = f"documentos-imageres-102-{badge}.png"
        save_icon(add_doc_badge(doc_base, badge), CATALOG / fname)
        files_by_group["documentos"].append(fname)

    seen: set[str] = set()
    for group, entries in CATALOG_GROUPS.items():
        files_by_group.setdefault(group, [])
        for dll, index in entries:
            path = ico_path(dll, index)
            if not path.exists():
                continue
            fname = catalog_filename(group, dll, index)
            if fname in seen:
                continue
            seen.add(fname)
            save_icon(load_ico(path), CATALOG / fname)
            files_by_group[group].append(fname)

    demo = VB_DEMO / "650600-coin-box.png"
    if demo.exists():
        fname = "cobranzas-vistabusiness-650600.png"
        save_icon(load_png(demo), CATALOG / fname)
        files_by_group.setdefault("cobranzas", []).append(fname)

    write_catalog_index(files_by_group)
    total = sum(len(v) for v in files_by_group.values())
    print(f"\nCatálogo: {total} PNG + index.html en {CATALOG}")


def main() -> None:
    mapping = build_ribbon_icons()

    if RIBBON.exists():
        for old in RIBBON.glob("*.png"):
            old.unlink()

    for name, icon in mapping:
        save_icon(icon, RIBBON / f"{name}.png")
        print(f"  cinta: {name}.png")

    print(f"\nCinta: {len(mapping)} iconos en {RIBBON}\n")
    build_catalog(mapping)

    legacy = RIBBON / "_candidates"
    if legacy.is_dir():
        for f in legacy.iterdir():
            f.unlink()
        legacy.rmdir()
        print("Eliminada carpeta antigua ribbon/_candidates/")


if __name__ == "__main__":
    main()
