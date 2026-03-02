import { URLSearchParams } from "url";


export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function sendNoContent(res, status = 204) {
  res.statusCode = status;
  res.end();
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function parseBody(req) {
  const raw = await readRawBody(req);
  if (raw.length === 0) return {};

  try {
    return JSON.parse(raw.toString("utf-8"));
  } catch {
    return {};
  }
}

export async function parseMultipartBody(req) {
  const raw = await readRawBody(req);
  if (raw.length === 0) return { fields: {}, files: {} };

  const boundary = parseBoundary(req.headers["content-type"] || "");
  if (!boundary) throw new Error("Boundary missing");

  const text = raw.toString("latin1");
  const parts = splitMultipartParts(text, boundary);

  const result = { fields: {}, files: {} };
  for (const rawPart of parts) {
    const normalizedPart = normalizePart(rawPart);
    if (!normalizedPart) continue;

    const splitData = splitPart(normalizedPart);
    if (!splitData) continue;

    const { rawHeaders, bodyText } = splitData;
    const headers = parsePartHeaders(rawHeaders);
    const { name, filename } = parseContentDisposition(headers["content-disposition"]);
    if (!name) continue;
    const normalizedName = normalizeFieldName(name);

    if (filename !== null) {
      const buffer = Buffer.from(bodyText, "latin1");
      appendFileValue(result.files, normalizedName, {
        name: filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer,
        size: buffer.length,
      });
    } else {
      appendFieldValue(
        result.fields,
        normalizedName,
        Buffer.from(bodyText, "latin1").toString("utf-8")
      );
    }
  }
  return result;
}

export async function parseUrlEncodedBody(req) {
  const rawBody = await readRawBody(req);
  const body = rawBody.toString("utf-8");
  const params = new URLSearchParams(body);
  const json = {};

  for (const [key, value] of params) {
    json[key] = value;
  }

  return json;
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  const cookies = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, value] = pair.trim().split("=");
    cookies[key] = value;
  }
  return cookies;
}


function parseBoundary(contentType = "") {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? (match[1] || match[2]).trim() : "";
}

function splitMultipartParts(text, boundary) {
  return text.split(`--${boundary}`).slice(1, -1);
}

function normalizePart(part) {
  let normalized = part.trimStart();
  if (!normalized) return "";
  if (normalized.startsWith("--")) return "";
  if (normalized.startsWith("\r\n")) normalized = normalized.slice(2);
  if (normalized.endsWith("\r\n")) normalized = normalized.slice(0, -2);
  return normalized;
}

function splitPart(part) {
  const separatorIndex = part.indexOf("\r\n\r\n");
  if (separatorIndex === -1) return null;
  return {
    rawHeaders: part.slice(0, separatorIndex),
    bodyText: part.slice(separatorIndex + 4),
  };
}

function parsePartHeaders(rawHeaders = "") {
  const headers = {};
  for (const line of rawHeaders.split("\r\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    headers[key] = value;
  }
  return headers;
}

function normalizeFieldName(name) {
  return name.endsWith("[]") ? name.slice(0, -2) : name;
}

function appendFieldValue(fields, key, value) {
  if (fields[key] === undefined) {
    fields[key] = value;
    return;
  }
  if (Array.isArray(fields[key])) {
    fields[key].push(value);
    return;
  }
  fields[key] = [fields[key], value];
}

function appendFileValue(files, key, fileRecord) {
  if (!fileRecord.name || fileRecord.size === 0) return;
  if (!files[key]) files[key] = [];
  files[key].push(fileRecord);
}

function parseContentDisposition(value = "") {
  const name = value.match(/name="([^"]+)"/i)?.[1] ?? null;

  const filenameStar = value.match(/filename\*=([^;]+)/i)?.[1] ?? null;
  if (filenameStar) {
    try {
      const encoded = filenameStar.replace(/^UTF-8''/i, "");
      return { name, filename: decodeURIComponent(encoded) };
    } catch {
      return { name, filename: null };
    }
  }

  const rawFilename = value.match(/filename="([^"]*)"/i)?.[1] ?? null;
  if (rawFilename === null) return { name, filename: null };
  const filename = Buffer.from(rawFilename, "latin1").toString("utf-8");
  return { name, filename };
}