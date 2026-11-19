/** Replaced only by the standalone Pages build; Vinext keeps same-origin defaults. */
declare const __RCL_ASSET_BASE__: string | undefined;
declare const __RCL_ANALYZE_URL__: string | undefined;

const assetBase = typeof __RCL_ASSET_BASE__ === "string" ? __RCL_ASSET_BASE__ : "/";

export function assetUrl(path: string): string {
  return assetBase + path.replace(/^\/+/, "");
}

export const ANALYZE_URL = typeof __RCL_ANALYZE_URL__ === "string"
  ? __RCL_ANALYZE_URL__
  : "/api/analyze";
