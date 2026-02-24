export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function sendNoContent(res, status = 204) {
  res.statusCode = status;
  res.end();
}

export async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks);
  if (raw.length === 0) return {};

  try {
    return JSON.parse(raw.toString("utf-8"));
  } catch {
    return {};
  }
}
