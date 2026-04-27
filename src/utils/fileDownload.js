import { refresh } from "../core/auth/api.js";
import { getAccessToken } from "../core/auth/state.js";

let refreshPromise = null;

async function refreshWithLock() {
  if (!refreshPromise) {
    refreshPromise = refresh().finally(() => refreshPromise = null);
  }
  return refreshPromise;
}

function getDownloadFilename(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback || "download";
}

async function fetchFile(url, attempt = 0) {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    credentials: "include",
    headers,
  });

  if (response.status === 401 && attempt === 0) {
    await refreshWithLock();
    return fetchFile(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

export async function downloadAuthenticatedFile(url, fallbackName) {
  const response = await fetchFile(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = getDownloadFilename(response, fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function handleAuthenticatedFileLinkClick(event) {
  const link = event.target.closest("[data-auth-download]");
  if (!link) return false;

  event.preventDefault();
  await downloadAuthenticatedFile(link.href, link.dataset.downloadName || link.textContent.trim());
  return true;
}
