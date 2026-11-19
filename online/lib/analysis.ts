/** Browser-safe v3 numerical engine. No network, storage or model calls. */
export type Message = { id: number; timestamp: string; sender: string; message: string };
export type Score = { id: number; delta_vs_prior: number; delta_vs_atmosphere: number; primary_dim: string; rationale: string; tags?: string[] };
export type ScoredMessage = Message & Score & { relationship_index: number };
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number; message_count: number; events: ScoredMessage[] };
export type IndicatorKind = 'ma' | 'ema' | 'bb' | 'rsi' | 'macd' | 'kdj';
export type IndicatorLine = { name: string; data: { time: number; value: number }[]; pane: 'main' | 'lower' };

export const TIMEFRAMES = [
  { id: '5min', label: '5分钟' }, { id: '15min', label: '15分钟' },
  { id: '30min', label: '30分钟' }, { id: '1h', label: '1小时' },
  { id: '2h', label: '2小时' }, { id: '4h', label: '4小时' },
  { id: '1d', label: '日线' }, { id: '1w', label: '周线' },
  { id: '1mo', label: '月线' }, { id: '1q', label: '季线' }, { id: '1y', label: '年线' },
] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OFFSET = 8 * HOUR;
const TIME_KEYS = ['timestamp', 'ts', 'time', 'datetime', 'date', 'CreateTime', 'StrTime', '时间', '发送时间'];
const SENDER_KEYS = ['sender', 'from', 'user', 'talker', 'speaker', 'author', '发送者', '发送人'];
const TEXT_KEYS = ['message', 'text', 'content', 'msg', 'StrContent', 'body', '内容', '消息'];
const own = (row: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(row, key);
const valueOf = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) if (own(row, key) && row[key] !== undefined && row[key] !== null) return row[key];
  return undefined;
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('每条记录必须是一个对象。');
  return value as Record<string, unknown>;
};

/** Normalize all dates to a fixed +08:00 timeline, independent of the viewer's timezone. */
function timestamp(value: unknown): string {
  let milliseconds: number;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d{10}(?:\d{3})?$/.test(value.trim()))) {
    const numeric = Number(value);
    milliseconds = Math.abs(numeric) < 100_000_000_000 ? numeric * 1000 : numeric;
  } else if (typeof value === 'string') {
    const raw = value.trim();
    const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?)?(Z|[+-]\d{2}:?\d{2})?$/i);
    if (!match) throw new Error(`无法识别时间：${raw.slice(0, 50)}。请使用 YYYY-MM-DD HH:mm:ss 或 ISO 时间。`);
    const [, yy, mm, dd, hh = '00', minute = '00', second = '00', fraction = '', zone = '+08:00'] = match;
    const y = Number(yy), m = Number(mm), d = Number(dd), h = Number(hh), min = Number(minute), sec = Number(second);
    const calendar = new Date(Date.UTC(y, m - 1, d));
    if (y < 100 || calendar.getUTCFullYear() !== y || calendar.getUTCMonth() !== m - 1 || calendar.getUTCDate() !== d || h > 23 || min > 59 || sec > 59) {
      throw new Error('时间包含不存在的日期或无效时分秒。');
    }
    const tz = zone.toUpperCase() === 'Z' ? 'Z' : zone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
    if (tz !== 'Z' && (Number(tz.slice(1, 3)) > 23 || Number(tz.slice(4)) > 59)) throw new Error('时间的时区偏移无效。');
    const pad = (part: string) => part.padStart(2, '0');
    milliseconds = Date.parse(`${yy}-${pad(mm)}-${pad(dd)}T${pad(hh)}:${minute}:${second}${fraction}${tz}`);
  } else throw new Error('每条消息都需要真实时间戳。');
  if (!Number.isFinite(milliseconds)) throw new Error('存在无效的时间戳。');
  const date = new Date(milliseconds + OFFSET);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 100 || date.getUTCFullYear() > 9999) throw new Error('时间超出支持范围。');
  return date.toISOString().replace(/\.000Z$/, '+08:00').replace(/Z$/, '+08:00');
}

function messageRow(value: unknown, id: number): Message {
  const row = record(value);
  const sender = valueOf(row, SENDER_KEYS);
  const message = valueOf(row, TEXT_KEYS);
  if ((typeof sender !== 'string' && typeof sender !== 'number') || !String(sender).trim()) throw new Error(`第 ${id} 条记录缺少发送者 sender。`);
  if (typeof message !== 'string') throw new Error(`第 ${id} 条记录缺少文本 message。`);
  return { id, timestamp: timestamp(valueOf(row, TIME_KEYS)), sender: String(sender).trim(), message };
}

/** RFC4180-style CSV including multiline quoted cells. Deliberately rejects malformed files. */
function csvRows(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false, closedQuote = false;
  const cell = () => { row.push(field); field = ''; closedQuote = false; };
  const line = () => { cell(); if (row.some(v => v.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; closedQuote = true; }
      else field += char;
    } else if (char === ',') cell();
    else if (char === '\r' || char === '\n') { line(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"') {
      if (field || closedQuote) throw new Error('CSV 引号位置无效，请使用标准 CSV 导出。');
      inQuotes = true;
    } else {
      if (closedQuote && !/\s/.test(char)) throw new Error('CSV 引号关闭后存在多余字符。');
      if (!closedQuote) field += char;
    }
  }
  if (inQuotes) throw new Error('CSV 存在未关闭的引号。');
  if (field || row.length || closedQuote) line();
  const headers = rows.shift()?.map(v => v.trim());
  if (!headers || new Set(headers).size !== headers.length || headers.some(h => !h)) throw new Error('CSV 需要不重复的列标题。');
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`CSV 第 ${index + 2} 行的列数与标题不一致。`);
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

function unwrapJSON(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ['messages', 'data', 'chat', 'records', 'items', 'rows']) if (Array.isArray(row[key])) return row[key] as unknown[];
  if (valueOf(row, TIME_KEYS) !== undefined) return [row];
  throw new Error('JSON 需要消息数组或 messages/data/chat 数组，并保留每条消息的时间戳。');
}

export function parseChat(source: string, filename: string): Message[] {
  const text = source.replace(/^\uFEFF/, '').trim();
  if (!text) throw new Error('文件为空。');
  const extension = filename.split('.').pop()?.toLowerCase();
  let raw: unknown[];
  if (extension === 'csv') raw = csvRows(text);
  else if (extension === 'json' || extension === 'jsonl' || extension === 'ndjson') {
    if (extension === 'json') {
      try { raw = unwrapJSON(JSON.parse(text)); }
      catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        throw new Error('JSON 格式无效；每行一个对象的文件请使用 .jsonl 后缀。');
      }
    } else raw = text.split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
      try { return JSON.parse(line); } catch { throw new Error(`JSONL 第 ${i + 1} 行不是有效 JSON。`); }
    });
  } else if (extension === 'txt') {
    raw = text.split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
      const match = line.match(/^\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}[ T]\d{1,2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\s+([^:：]+)[:：]\s*(.*)$/);
      if (!match) throw new Error(`TXT 第 ${i + 1} 行无法解析；请使用 时间 发送者: 正文。`);
      return { timestamp: match[1], sender: match[2], message: match[3] };
    });
  } else throw new Error('支持 CSV、JSON、JSONL 和 TXT 文件。');
  if (!raw.length) throw new Error('没有可解析的消息。');
  return raw.map((r, i) => messageRow(r, i + 1))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((r, i) => ({ ...r, id: i + 1 }));
}

function scoreRow(value: unknown, id: number): Score {
  const row = record(value);
  const a = row.delta_vs_prior, b = row.delta_vs_atmosphere;
  if (typeof a !== 'number' || !Number.isFinite(a) || typeof b !== 'number' || !Number.isFinite(b)) throw new Error(`第 ${id} 条记录缺少有效的两项 v3 相对评分。`);
  if (Math.abs(a) > 15 || Math.abs(b) > 15) throw new Error(`第 ${id} 条相对评分超出 -15 到 15 的支持范围。`);
  return { id, delta_vs_prior: a, delta_vs_atmosphere: b,
    primary_dim: typeof row.primary_dim === 'string' ? row.primary_dim : 'engagement',
    rationale: typeof row.rationale === 'string' ? row.rationale : '',
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  };
}

const round4 = (n: number) => Number(n.toFixed(4));

/** Keep full internal precision; round only emitted indices to match the Python engine. */
export function scoreMessages(messages: Message[], scores: Score[]): ScoredMessage[] {
  if (!messages.length) throw new Error('没有可计算的消息。');
  if (scores.length !== messages.length) throw new Error('消息与评分数量不一致；请等待所有批次完成。');
  const byId = new Map<number, Score>();
  for (const s of scores) {
    if (!Number.isSafeInteger(s.id) || s.id < 0 || byId.has(s.id)) throw new Error('评分 ID 重复或无效。');
    byId.set(s.id, scoreRow(s, s.id));
  }
  const ids = new Set<number>();
  const normalized = messages.map(m => {
    if (!Number.isSafeInteger(m.id) || m.id < 0 || ids.has(m.id)) throw new Error('消息 ID 重复或无效。');
    ids.add(m.id);
    return messageRow(m, m.id);
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  let index = 50, previous: number | undefined;
  return normalized.map(message => {
    const score = byId.get(message.id);
    if (!score) throw new Error(`缺少消息 ${message.id} 的评分。`);
    const time = Date.parse(message.timestamp);
    const gapHours = previous === undefined ? 0 : Math.max(0, (time - previous) / HOUR);
    const decay = 1 - Math.exp(-gapHours / 72);
    index = index * (1 - decay) + 50 * decay + .5 * score.delta_vs_prior + .5 * score.delta_vs_atmosphere;
    previous = time;
    return { ...message, ...score, relationship_index: round4(index) };
  });
}

export function loadScored(rows: unknown[]): ScoredMessage[] {
  if (!Array.isArray(rows) || !rows.length) throw new Error('评分文件需要非空消息数组。');
  const messages: Message[] = [], scores: Score[] = [];
  rows.forEach((value, i) => {
    const row = record(value), hasId = own(row, 'id'), hasLegacyId = own(row, 'i');
    const id = hasId ? row.id : hasLegacyId ? row.i : i + 1;
    if (hasId && hasLegacyId && row.id !== row.i) {
      throw new Error(`第 ${i + 1} 条记录的 id 与 i 冲突。`);
    }
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) throw new Error(`第 ${i + 1} 条记录的 ID 无效。`);
    messages.push(messageRow(row, id)); scores.push(scoreRow(row, id));
  });
  return scoreMessages(messages, scores);
}

function bucket(milliseconds: number, timeframe: string): number {
  const local = milliseconds + OFFSET;
  const lengths: Record<string, number> = { '5min': 5 * 60_000, '15min': 15 * 60_000, '30min': 30 * 60_000, '1h': HOUR, '2h': 2 * HOUR, '4h': 4 * HOUR, '1d': DAY };
  if (lengths[timeframe]) return Math.floor(local / lengths[timeframe]) * lengths[timeframe] - OFFSET;
  const date = new Date(local), year = date.getUTCFullYear(), month = date.getUTCMonth();
  if (timeframe === '1w') {
    // Pandas W-SUN: label is Sunday 00:00, covering Monday through Sunday.
    return Date.UTC(year, month, date.getUTCDate() + (7 - date.getUTCDay()) % 7) - OFFSET;
  }
  if (timeframe === '1mo') return Date.UTC(year, month, 1) - OFFSET;
  if (timeframe === '1q') return Date.UTC(year, Math.floor(month / 3) * 3, 1) - OFFSET;
  if (timeframe === '1y') return Date.UTC(year, 0, 1) - OFFSET;
  throw new Error('不支持的 K 线周期。');
}

export function aggregate(rows: ScoredMessage[], timeframe: string): Candle[] {
  if (!TIMEFRAMES.some(tf => tf.id === timeframe)) throw new Error('不支持的 K 线周期。');
  const ordered = [...rows].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const buckets = new Map<number, Candle>();
  let previous: number | undefined;
  for (const row of ordered) {
    const ms = Date.parse(row.timestamp), value = row.relationship_index;
    if (!Number.isFinite(ms) || !Number.isFinite(value)) throw new Error('聚合数据包含无效时间或指数。');
    const time = bucket(ms, timeframe) / 1000;
    const seconds = previous === undefined ? 0 : (ms - previous) / 1000;
    const volume = 1 + Array.from(row.message).length * .05 + (seconds > 0 && seconds <= 60 ? 1.5 : 0);
    const candle = buckets.get(time);
    if (candle) {
      candle.high = Math.max(candle.high, value); candle.low = Math.min(candle.low, value);
      candle.close = value; candle.volume += volume; candle.message_count++; candle.events.push(row);
    } else buckets.set(time, { time, open: value, high: value, low: value, close: value, volume, message_count: 1, events: [row] });
    previous = ms;
  }
  return [...buckets.values()].map(c => ({ ...c, volume: round4(c.volume) }));
}

function ema(values: number[], alpha: number): number[] {
  let last = NaN;
  return values.map(value => {
    if (!Number.isFinite(value)) return NaN;
    last = Number.isFinite(last) ? alpha * value + (1 - alpha) * last : value;
    return last;
  });
}
function average(values: number[], period: number): number[] {
  return values.map((_, i) => i < period - 1 ? NaN : values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
}

/** Fixed indicator parameters match the desktop defaults. Missing warm-up values are omitted. */
export function lineIndicator(candles: Candle[], kind: IndicatorKind): IndicatorLine[] {
  if (!candles.length) return [];
  const closes = candles.map(c => c.close);
  const line = (name: string, values: number[], validFrom: number, pane: 'main' | 'lower'): IndicatorLine => ({ name, pane,
    data: values.flatMap((value, i) => i >= validFrom && Number.isFinite(value) ? [{ time: candles[i].time, value: round4(value) }] : []),
  });
  if (kind === 'ma') return [5, 10, 20].map(period => line(`MA${period}`, average(closes, period), period - 1, 'main'));
  if (kind === 'ema') return [12, 26].map(period => line(`EMA${period}`, ema(closes, 2 / (period + 1)), period - 1, 'main'));
  if (kind === 'bb') {
    const middle = average(closes, 20), deviation = closes.map((_, i) => i < 19 ? NaN : Math.sqrt(closes.slice(i - 19, i + 1).reduce((s, v) => s + (v - middle[i]) ** 2, 0) / 20));
    return [line('BOLL上轨(20,2)', middle.map((v, i) => v + 2 * deviation[i]), 19, 'main'), line('BOLL中轨(20)', middle, 19, 'main'), line('BOLL下轨(20,2)', middle.map((v, i) => v - 2 * deviation[i]), 19, 'main')];
  }
  if (kind === 'macd') {
    const fast = ema(closes, 2 / 13), slow = ema(closes, 2 / 27);
    const dif = closes.map((_, i) => i < 25 ? NaN : fast[i] - slow[i]), dea = ema(dif, 2 / 10);
    return [line('MACD DIF(12,26)', dif, 25, 'lower'), line('MACD DEA(9)', dea, 33, 'lower'), line('MACD柱(×2)', dif.map((v, i) => (v - dea[i]) * 2), 33, 'lower')];
  }
  if (kind === 'rsi') {
    const differences = closes.map((v, i) => i ? v - closes[i - 1] : NaN);
    const gains = ema(differences.map(v => Math.max(v, 0)), 1 / 14), losses = ema(differences.map(v => Math.max(-v, 0)), 1 / 14);
    return [line('RSI(14)', gains.map((gain, i) => losses[i] === 0 ? 100 : 100 - 100 / (1 + gain / losses[i])), 14, 'lower')];
  }
  if (kind === 'kdj') {
    const k: number[] = [], d: number[] = [], j: number[] = [];
    let pk = 50, pd = 50;
    candles.forEach((c, i) => {
      const slice = candles.slice(Math.max(0, i - 8), i + 1);
      const low = Math.min(...slice.map(v => v.low)), high = Math.max(...slice.map(v => v.high));
      const rsv = i < 8 || high === low ? 50 : (c.close - low) / (high - low) * 100;
      pk = (2 * pk + rsv) / 3; pd = (2 * pd + pk) / 3;
      k.push(pk); d.push(pd); j.push(3 * pk - 2 * pd);
    });
    return [line('KDJ K(9,3,3)', k, 8, 'lower'), line('KDJ D(9,3,3)', d, 8, 'lower'), line('KDJ J(9,3,3)', j, 8, 'lower')];
  }
  throw new Error('不支持的技术指标。');
}
