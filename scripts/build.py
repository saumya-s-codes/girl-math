#!/usr/bin/env python3
"""Assemble src/ into the single deployable page docs/index.html.

    python3 scripts/build.py

Order matters: motion -> progress -> components -> scene -> confetti -> app.
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = root / "src"
read = lambda name: (src / name).read_text(encoding="utf-8")

js = "\n".join(read(f) for f in ["motion.js", "progress.js", "components.js", "scene.js", "confetti.js", "app.js"])
html = (
    read("template.html")
    .replace("{{CSS}}", read("style.css"))
    .replace("{{ART}}", read("art.json").strip())
    .replace("{{JS}}", js)
)
out = root / "docs" / "index.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out.relative_to(root)} ({len(html)/1024:.0f} KB)")

# offline support: stamp the service worker with a fingerprint of the page, so every change gets a fresh cache
import hashlib
version = hashlib.sha1(html.encode("utf-8")).hexdigest()[:10]
sw = read("sw.js").replace("{{VERSION}}", version)
(root / "docs" / "sw.js").write_text(sw, encoding="utf-8")
print(f"wrote docs/sw.js (version {version})")
