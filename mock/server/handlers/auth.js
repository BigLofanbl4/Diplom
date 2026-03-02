import { db } from "../db.js";
import { parseUrlEncodedBody, parseCookies, sendJson } from "../utils/http.js";


const refreshMap = new Map();
const accessMap = new Map();

export async function loginUser(req, res) {
  const userData = await parseUrlEncodedBody(req);

  const userRecord = db.users
    .find((user) => user.login === userData.username && user.password === userData.password);

  if (!userRecord) {
    return sendJson(res, 401, { detail: "Invalid login or password" });
  }

  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();

  refreshMap.set(refreshToken, { userId: userRecord.id });
  accessMap.set(accessToken, { userId: userRecord.id });

  res.setHeader("Set-Cookie", `refresh_token=${refreshToken}; HttpOnly; Path=/api/v1/auth/refresh; SameSite=Lax; Max-Age=2592000`);

  return sendJson(res, 200, { access_token: accessToken, token_type: "bearer" });
}

export function refreshToken(req, res) {
  if (!req.headers.cookie) return sendJson(res, 401, { detail: "Cookie not found" });

  const cookies = parseCookies(req.headers.cookie);

  const refreshTokenValue = cookies.refresh_token;

  if (!refreshTokenValue) {
    return sendJson(res, 401, { detail: "No refresh token found" });
  }

  const session = refreshMap.get(refreshTokenValue);
  if (!session) {
    return sendJson(res, 401, { detail: "Invalid refresh token" });
  }

  const newAccessToken = crypto.randomUUID();
  accessMap.set(newAccessToken, { userId: session.userId });

  return sendJson(res, 200, { access_token: newAccessToken, token_type: "bearer" });
}

export function requireAuth(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendJson(res, 401, { detail: "Not authenticated" });
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!accessMap.has(token) || !token) {
    sendJson(res, 401, { detail: "Invalid access token" });
    return false;
  }

  return true;
}