import { AnalysisError, MAX_REQUEST_BYTES, analyzeMessages, readLimitedText } from "../../../lib/ai.ts";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" };
const tooLarge = () => new AnalysisError(413, "REQUEST_TOO_LARGE", "请求过大，请减少每批聊天记录；每次请求最多 2 MiB。");

export async function POST(request: Request): Promise<Response> {
  try {
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      throw new AnalysisError(415, "UNSUPPORTED_MEDIA_TYPE", "请使用 JSON 格式提交分析请求。");
    }
    const size = Number(request.headers.get("content-length"));
    if (Number.isFinite(size) && size > MAX_REQUEST_BYTES) throw tooLarge();
    let value: unknown;
    const text = await readLimitedText(request.body, MAX_REQUEST_BYTES, tooLarge, request.signal);
    try { value = JSON.parse(text); } catch { throw new AnalysisError(400, "INVALID_JSON", "请求不是有效 JSON，请重新选择聊天文件后重试。"); }
    const result = await analyzeMessages(value, { signal: request.signal });
    return Response.json(result, { headers });
  } catch (error) {
    const known = error instanceof AnalysisError ? error : new AnalysisError(400, "INVALID_REQUEST", "无法读取分析请求，请检查格式后重试。");
    return Response.json({ error: { code: known.code, message: known.message } }, { status: known.status, headers });
  }
}
