"""
Chuyển kết quả của Citenet (thư mục outputs/Citenet) thành dữ liệu cho web.

Cách chạy (từ thư mục gốc của web):
    python scripts/build_data.py "<đường dẫn tới outputs/Citenet>" [--cache "<đường dẫn work/Citenet/cache>"]

Nếu không ghi --cache, script tự tìm work/Citenet/cache nằm cạnh outputs/ (cấu trúc mặc định của Citenet).
Cache dùng để lấy danh sách tài liệu tham khảo của từng bài (trích dẫn chéo, điểm "nên đọc trước").
Bản đồ nào không đủ dữ liệu trong cache sẽ để trình duyệt tự lấy bù từ OpenAlex khi mở.

Ví dụ trên Windows:
    python scripts/build_data.py "C:\\Users\\admin\\Documents\\Codex\\2026-07-07\\n-u-m-c-ti-u\\outputs\\Citenet"

Chỉ các bản đồ có tên (slug) trong collection.json được đưa lên web.
Thiếu collection.json thì đưa tất cả.

Kết quả:
    public/data/index.json          danh sách bản đồ (mỗi DOI gốc một mục) + số liệu tổng
    public/data/papers.json         mọi tài liệu (gộp trùng theo DOI) + các bản đồ chứa nó
    public/data/maps/<slug>.json    dữ liệu biểu đồ của từng bản đồ
    public/downloads/<slug>/...     refs.csv, refs.ris, refs.bib, summary.md để tải về

Script chỉ đọc graph.json và các file xuất của Citenet, không gọi API nào,
và không ghi đường dẫn máy tính cá nhân vào dữ liệu web.
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DATA = ROOT / "public" / "data"
OUT_DL = ROOT / "public" / "downloads"
DOWNLOADS = ["refs.csv", "refs.ris", "refs.bib", "summary.md"]
RELATIONS = ["seed", "backward", "forward", "related"]


def primary_relation(types):
    for r in RELATIONS:
        if r in types:
            return r
    return "related"


def paper_key(node):
    return (node.get("doi") or node.get("openalex_id") or node["id"]).lower()


def load_refs_from_cache(cache_dir):
    """Đọc mọi phản hồi OpenAlex trong cache của Citenet → {W123: [W…, …]}"""
    refs = {}
    if not cache_dir or not cache_dir.is_dir():
        return refs
    for f in cache_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        works = data.get("results") if isinstance(data, dict) and isinstance(data.get("results"), list) else [data]
        for w in works:
            if isinstance(w, dict) and str(w.get("id", "")).startswith("https://openalex.org/W") and "referenced_works" in w:
                refs[w["id"].rsplit("/", 1)[-1]] = [r.rsplit("/", 1)[-1] for r in w.get("referenced_works") or []]
    return refs


def slim_node(n):
    c = n.get("classification") or {}
    return {
        "id": n["id"],
        "doi": n.get("doi") or "",
        "title": n.get("title") or "(không có tiêu đề)",
        "year": n.get("year"),
        "journal": n.get("journal") or "",
        "authors": n.get("authors") or [],
        "abstract": n.get("abstract") or "",
        "cites": n.get("citation_count") or 0,
        "rel": primary_relation(n.get("relation_types") or [n.get("node_type")]),
        "rels": n.get("relation_types") or [],
        "concepts": (n.get("concepts") or [])[:6],
        "url": n.get("landing_page_url") or (f"https://doi.org/{n['doi']}" if n.get("doi") else ""),
        "cls": {
            "topic": c.get("topic"),
            "method": c.get("method"),
            "design": c.get("study_design"),
            "evidence": c.get("evidence_level"),
            "direction": c.get("finding_direction"),
            "confidence": c.get("confidence"),
            "review": bool(c.get("needs_review")),
        },
        "x": n.get("x", 0),
        "y": n.get("y", 0),
    }


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        sys.exit(__doc__)
    src = Path(args[0]).expanduser()
    cache_dir = Path(args[args.index("--cache") + 1]).expanduser() if "--cache" in args else src.parent.parent / "work" / "Citenet" / "cache"
    all_refs = load_refs_from_cache(cache_dir)
    print(f"Cache: {cache_dir} ({len(all_refs)} bài có danh sách tài liệu tham khảo)" if all_refs else "Không dùng cache (trình duyệt sẽ tự lấy trích dẫn chéo)")
    folders = sorted(p for p in src.iterdir() if (p / "graph.json").is_file())
    if not folders:
        sys.exit(f"Không thấy thư mục kết quả nào có graph.json trong: {src}")

    cfg_path = ROOT / "collection.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.is_file() else {}
    if cfg.get("maps"):
        wanted = set(cfg["maps"])
        missing = wanted - {p.name for p in folders}
        if missing:
            print("Cảnh báo, không tìm thấy:", ", ".join(sorted(missing)))
        folders = [p for p in folders if p.name in wanted]

    # Xóa dữ liệu cũ để bản đồ đã bỏ khỏi collection.json không còn trên web
    for d in (OUT_DATA / "maps", OUT_DL):
        if d.exists():
            shutil.rmtree(d)
    (OUT_DATA / "maps").mkdir(parents=True, exist_ok=True)
    maps, papers = [], {}

    for folder in folders:
        slug = folder.name
        g = json.loads((folder / "graph.json").read_text(encoding="utf-8"))
        nodes = [slim_node(n) for n in g["nodes"]]
        # Gắn refs nếu cache có đủ cho ít nhất 90% số bài; nếu không, để trình duyệt tự lấy bù
        found = [all_refs.get(n["id"].rsplit("/", 1)[-1]) for n in nodes]
        has_refs = nodes and sum(r is not None for r in found) / len(nodes) >= 0.9
        if has_refs:
            for n, r in zip(nodes, found):
                n["refs"] = r or []
        seed = next((n for n in nodes if n["rel"] == "seed"), nodes[0])
        s = g.get("summary", {})

        (OUT_DATA / "maps" / f"{slug}.json").write_text(
            json.dumps({"slug": slug, "summary": s, "nodes": nodes,
                        "edges": [{"s": e["source"], "t": e["target"], "rel": e.get("relation_type")} for e in g["edges"]]},
                       ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")

        dl_dir = OUT_DL / slug
        dl_dir.mkdir(parents=True, exist_ok=True)
        files = []
        for name in DOWNLOADS:
            if (folder / name).is_file():
                shutil.copyfile(folder / name, dl_dir / name)
                files.append(name)

        top = sorted((n for n in nodes if n["rel"] != "seed"), key=lambda n: -n["cites"])[:3]
        maps.append({
            "slug": slug,
            "doi": s.get("doi") or seed["doi"],
            "title": seed["title"], "year": seed["year"], "journal": seed["journal"],
            "authors": seed["authors"], "abstract": seed["abstract"], "concepts": seed["concepts"],
            "domain": s.get("domain"),
            "papers": s.get("total_papers", len(nodes)), "edges": s.get("total_edges", len(g["edges"])),
            "backward": s.get("backward", 0), "forward": s.get("forward", 0), "related": s.get("related", 0),
            "needsReview": s.get("needs_review", 0), "abstractCoverage": s.get("abstract_coverage"),
            "backwardCandidates": s.get("backward_candidates"), "crossrefRefs": s.get("crossref_reference_count"),
            "elapsed": s.get("elapsed_seconds"), "generatedAt": (s.get("generated_at") or "")[:10],
            "topCited": [{"title": n["title"], "year": n["year"], "cites": n["cites"]} for n in top],
            "files": files,
            "hasRefs": bool(has_refs),
        })

        for n in nodes:
            if n["rel"] == "seed":
                continue
            k = paper_key(n)
            p = papers.setdefault(k, {**{f: n[f] for f in ("doi", "title", "year", "journal", "authors", "cites", "url", "concepts")},
                                      "abstract": n["abstract"][:600], "design": n["cls"]["design"], "maps": []})
            p["cites"] = max(p["cites"], n["cites"])
            if not p["abstract"] and n["abstract"]:
                p["abstract"] = n["abstract"][:600]
            p["maps"].append({"slug": slug, "rel": n["rel"]})

    seed_dois = {m["doi"].lower() for m in maps}
    plist = sorted(papers.values(), key=lambda p: (-len(p["maps"]), -p["cites"]))
    for p in plist:
        p["isSeed"] = p["doi"].lower() in seed_dois

    maps.sort(key=lambda m: m["generatedAt"], reverse=True)
    index = {
        "title": cfg.get("title", "Bộ sưu tập"),
        "description": cfg.get("description", ""),
        "builtFrom": "Citenet outputs",
        "updatedAt": max(m["generatedAt"] for m in maps),
        "totals": {
            "maps": len(maps),
            "nodes": sum(m["papers"] for m in maps),
            "edges": sum(m["edges"] for m in maps),
            "uniquePapers": len(plist),
            "sharedPapers": sum(1 for p in plist if len(p["maps"]) > 1),
        },
        "maps": maps,
    }
    (OUT_DATA / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT_DATA / "papers.json").write_text(json.dumps(plist, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(maps)} bản đồ, {len(plist)} tài liệu ({index['totals']['sharedPapers']} xuất hiện ở ≥2 bản đồ) -> public/data")


if __name__ == "__main__":
    main()
