import { AnalysisError, MAX_REQUEST_BYTES, analyzeMessages, readLimitedText } from "../../../lib/ai.ts";

export const dynamic = "force-dynamic";
const allowedOrigins = new Set([
  "https://joruno-c.github.io",
  "https://relationship-candlestick-lab-joruno.perfectcube2.chatgpt.site",
]);
function isAllowedOrigin(request: Request, origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  const url = new URL(request.url);
  return ["http:", "https:"].includes(url.protocol)
    && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    && origin === url.origin;
}
function responseHeaders(request: Request): Headers {
  const headers = new Headers({ "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", Vary: "Origin" });
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(request, origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function checkOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  // Production origins are explicit. Development permits only the exact loopback origin of this request.
  if (origin !== null && !isAllowedOrigin(request, origin)) {
    throw new AnalysisError(403, "ORIGIN_NOT_ALLOWED", "此来源不能使用分析接口，请从正式网站打开分析页面。");
  }
}
const tooLarge = () => new AnalysisError(413, "REQUEST_TOO_LARGE", "请求过大，请减少每批聊天记录；每次请求最多 2 MiB。");

export async function OPTIONS(request: Request): Promise<Response> {
  const headers = responseHeaders(request);
  const origin = request.headers.get("origin");
  const method = request.headers.get("access-control-request-method");
  const requestedHeaders = (request.headers.get("access-control-request-headers") ?? "")
    .split(",").map((header) => header.trim().toLowerCase()).filter(Boolean);
  if (!origin || !isAllowedOrigin(request, origin) || method !== "POST" || requestedHeaders.some((header) => header !== "content-type")) {
    return Response.json({ error: { code: "PREFLIGHT_NOT_ALLOWED", message: "此跨域请求不被允许。" } }, { status: 403, headers });
  }
  headers.set("Access-Control-Allow-Methods", "POST");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request): Promise<Response> {
  const headers = responseHeaders(request);
  try {
    checkOrigin(request);
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
