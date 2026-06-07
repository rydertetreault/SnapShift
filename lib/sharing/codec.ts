// lib/sharing/codec.ts
// Portable base64url codec (RN/Hermes, Node/jest, browser) + payload encode/decode.
import { SharedWeekPayload, SHARE_SCHEMA_VERSION } from "./types";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function utf8Bytes(str: string): number[] {
  return Array.from(unescape(encodeURIComponent(str))).map((c) =>
    c.charCodeAt(0)
  );
}
function bytesToUtf8(bytes: number[]): string {
  return decodeURIComponent(escape(String.fromCharCode(...bytes)));
}

export function base64urlEncode(input: string): string {
  const bytes = utf8Bytes(input);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "" : ALPHABET[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "" : ALPHABET[b2 & 63];
  }
  return out;
}

export function base64urlDecode(input: string): string {
  const lookup: Record<string, number> = {};
  for (let i = 0; i < ALPHABET.length; i++) lookup[ALPHABET[i]] = i;
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 4) {
    const c0 = lookup[input[i]];
    const c1 = lookup[input[i + 1]];
    const c2 = lookup[input[i + 2]];
    const c3 = lookup[input[i + 3]];
    if (c0 === undefined || c1 === undefined) {
      if (input[i] !== undefined) throw new Error("invalid base64url");
      break;
    }
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== undefined) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== undefined) bytes.push(((c2 & 3) << 6) | c3);
  }
  return bytesToUtf8(bytes);
}

export function encodeWeek(payload: SharedWeekPayload): string {
  return base64urlEncode(JSON.stringify(payload));
}

export function decodeWeek(encoded: string): SharedWeekPayload {
  const json = base64urlDecode(encoded);
  const parsed = JSON.parse(json) as SharedWeekPayload;
  if (parsed.v !== SHARE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported share version ${parsed.v}; update SnapShift to view this.`
    );
  }
  return {
    ...parsed,
    shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
    busy: Array.isArray(parsed.busy) ? parsed.busy : [],
  };
}
