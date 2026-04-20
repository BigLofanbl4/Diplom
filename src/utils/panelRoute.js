import { getAuthState } from "../core/auth/state.js";

export function getCurrentPanelRole() {
  const { role } = getAuthState();
  return role === "manager" ? "manager" : "admin";
}

export function getPanelBasePath(role = getCurrentPanelRole()) {
  return role === "manager" ? "/manager" : "/admin";
}

export function getPanelPath(pathname = "", role = getCurrentPanelRole()) {
  const basePath = getPanelBasePath(role);
  if (!pathname) return basePath;
  return `${basePath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function isAdminRole(role = getCurrentPanelRole()) {
  return role === "admin";
}

export function getPanelRoleLabel(role = getCurrentPanelRole()) {
  return role === "manager" ? "Менеджер" : "Администратор";
}
