#!/usr/bin/env python3
"""Replay our anonymous group snapshot locally, without a model or API key."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from relationship_candlestick import server
from relationship_candlestick.charts import build_html


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "output" / "group_demo")
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    fixture = ROOT / "examples" / "group_chat"
    job = server.ingest_scored(server.IngestRequest(scored_path=str(fixture / "scored.jsonl")))
    if job["status"] != "done":
        raise RuntimeError(job.get("error") or "Could not import group example")
    result = server.JOBS[job["id"]]
    result.events_df.to_csv(output / "relationship_index_path.csv", index=False)
    for timeframe, candles in result.ohlc_by_tf.items():
        candles.to_csv(output / f"relationship_ohlc_{timeframe}.csv", index=False)
    build_html(output / "relationship_chart.html", events_df=result.events_df,
               ohlc=result.ohlc_by_tf["1d"], timeframe="1d")
    summary = {
        "records": len(result.events_df), "members": 5,
        "latest_index": float(result.events_df["relationship_index"].iloc[-1]),
        "bars_per_timeframe": {tf: len(df) for tf, df in result.ohlc_by_tf.items()},
        "job_id": job["id"],
        "chart_url": f"http://127.0.0.1:7000/#chart/{job['id']}",
        "note": "Replay of retained numerical annotations. All message bodies and rationales are placeholders; no model is called. Volume changes with placeholder lengths.",
    }
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "README.md").write_text(
        "# 群聊数值回归演示\n\n"
        "本结果重放课程项目群的 1497 条既有数值标注；5 位成员均已匿名化。"
        "所有聊天正文和评分理由都已替换，未调用模型，也不验证原文语义判断。\n\n"
        f"- 最新指数：{summary['latest_index']}（非百分比或成绩）\n"
        "- 双击 `relationship_chart.html` 可离线查看日线；图表脚本内嵌。\n"
        "- 11 种周期 CSV 位于本目录；可核对开高低收和消息数量。\n"
        "- 文本长度已改变，因此互动量不是原群聊互动量。\n"
        f"- 运行 `python start.py` 后可打开持久化任务：{summary['chart_url']}\n",
        encoding="utf-8",
    )
    print(f"Replayed {summary['records']} messages; final index = {summary['latest_index']}")
    print(f"Offline chart: {output / 'relationship_chart.html'}")
    print(f"After starting the service: {summary['chart_url']}")


if __name__ == "__main__":
    main()
