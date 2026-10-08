#!/usr/bin/env python3
"""Assemble src/ into the single deployable page docs/index.html.

    python3 scripts/build.py

Order matters: motion -> progress -> components -> scene -> app.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "src"
read = lambda name: (src / name).read_text(encoding="utf-8")

js = "\n".join(read(f) for f in ["motion.js", "progress.js", "components.js", "scene.js", "app.js"])
html = (
    read("template.html")
    .replace("{{CSS}}", read("style.css"))
    .replace("{{ART}}", read("art.json").strip())
    .replace("{{JS}}", js)
)
out = root / "docs" / "index.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out.relative_to(root)} ({len(html)/1024:.0f} KB)")
