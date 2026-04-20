import { db } from "../db.js";
import { parseUrlEncodedBody, parseCookies, sendJson } from "../utils/http.js";


const refreshMap = new Map();
const accessMap = new Map();

export async function loginUser(req, res) {
  const credentials = await parseUrlEncodedBody(req);

  const user = db.users
    .find((dbUser) => dbUser.login === credentials.username && dbUser.password === credentials.password);

  if (!user) {
    return sendJson(res, 401, { detail: "Invalid login or password" });
  }

  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();

  refreshMap.set(refreshToken, user.id);
  accessMap.set(accessToken, user.id);

  res.setHeader("Set-Cookie", `refresh_token=${refreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);

  return sendJson(res, 200, { access_token: accessToken, token_type: "bearer" });
}

export async function logoutUser(req, res) {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookieMap = parseCookies(req.headers.cookie);
    const refreshToken = cookieMap.refresh_token;

    if (refreshToken) {
      refreshMap.delete(refreshToken);
    }
  }

  res.setHeader("Set-Cookie", `refresh_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  return sendJson(res, 200, { detail: "Logged out" })
}

export function refreshToken(req, res) {
  if (!req.headers.cookie) return sendJson(res, 401, { detail: "Cookie not found" });

  const cookieMap = parseCookies(req.headers.cookie);

  const refreshTokenValue = cookieMap.refresh_token;

  if (!refreshTokenValue) {
    return sendJson(res, 401, { detail: "No refresh token found" });
  }

  const userId = refreshMap.get(refreshTokenValue);
  if (!userId) {
    return sendJson(res, 401, { detail: "Invalid refresh token" });
  }

  const newAccessToken = crypto.randomUUID();
  accessMap.set(newAccessToken, userId);

  return sendJson(res, 200, { access_token: newAccessToken, token_type: "bearer" });
}

export function requireAuth(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendJson(res, 401, { detail: "Not authenticated" });
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!accessMap.has(token) || !token) {
    sendJson(res, 401, { detail: "Invalid access token" });
    return null;
  }

  return { token, userId: accessMap.get(token) };
}

export function getAuthenticatedUser(req, res) {
  const authContext = requireAuth(req, res);
  if (!authContext) return null;

  const user = db.users.find((dbUser) => dbUser.id === authContext.userId);
  if (!user) {
    sendJson(res, 500, { detail: "User not found" });
    return null;
  }

  return user;
}

export function requireRole(req, res, roles = []) {
  const user = getAuthenticatedUser(req, res);
  if (!user) return null;

  if (!roles.includes(user.role)) {
    sendJson(res, 403, { detail: "Access denied" });
    return null;
  }

  return user;
}

export function getCurrentUser(req, res) {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;

  const basePayload = {
    login: user.login,
    role: user.role,
  };

  switch (user.role) {
    case "admin":
      {
        const adminProfile = db.admins.find((admin) => admin.user_id === user.id);
        if (!adminProfile) {
          return sendJson(res, 500, { detail: "Admin profile not found" });
        }
        return sendJson(res, 200, {
          ...basePayload,
          id: adminProfile.id,
          first_name: adminProfile.first_name,
          last_name: adminProfile.last_name,
        });
      }
    case "teacher":
      {
        const teacherProfile = db.teachers.find((teacher) => teacher.user_id === user.id);
        if (!teacherProfile) {
          return sendJson(res, 500, { detail: "Teacher profile not found" });
        }
        return sendJson(res, 200, {
          ...basePayload,
          id: teacherProfile.id,
          first_name: teacherProfile.first_name,
          last_name: teacherProfile.last_name,
          is_ovz: teacherProfile.is_ovz,
          age: teacherProfile.age,
          phone: teacherProfile.phone,
        });
      }
    case "manager":
      {
        const managerProfile = db.managers.find((manager) => manager.user_id === user.id);
        if (!managerProfile) {
          return sendJson(res, 500, { detail: "Manager profile not found" });
        }
        return sendJson(res, 200, {
          ...basePayload,
          id: managerProfile.id,
          first_name: managerProfile.first_name,
          last_name: managerProfile.last_name,
          phone: managerProfile.phone,
        });
      }
    case "student":
      {
        const studentProfile = db.students.find((student) => student.user_id === user.id);
        if (!studentProfile) {
          return sendJson(res, 500, { detail: "Student profile not found" });
        }
        return sendJson(res, 200, {
          ...basePayload,
          id: studentProfile.id,
          first_name: studentProfile.first_name,
          last_name: studentProfile.last_name,
          phone: studentProfile.phone,
          birth_date: studentProfile.birth_date,
        });
      }
    default:
      return sendJson(res, 200, {
        ...basePayload,
      });
  }
}
