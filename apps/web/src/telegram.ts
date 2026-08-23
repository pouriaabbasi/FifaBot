import { getStoredCurrentUserId } from "./api";

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string; user?: { id: number } };
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openTelegramLink: (url: string) => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
}

export const BOT_USERNAME = "IndraFifaBot";
export const MINI_APP_SHORT_NAME = "league";

export function buildInviteLink(inviteCode: string) {
  return `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}?startapp=${inviteCode}`;
}

export function getCurrentTelegramId(): string | null {
  const stored = getStoredCurrentUserId();
  if (stored) return stored;
  const id = getTelegramWebApp()?.initDataUnsafe?.user?.id;
  return id != null ? String(id) : null;
}

export function shareInviteLink(inviteCode: string) {
  const link = buildInviteLink(inviteCode);
  const webApp = getTelegramWebApp();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("به لیگ ملحق شو!")}`;
  if (webApp) {
    webApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, "_blank");
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

// The Telegram bridge script is not in index.html — a static <script> tag
// there (even with defer) still makes the browser wait on that download
// before DOMContentLoaded/module execution, which stalls the login-form
// fallback if telegram.org is slow or blocked. We load it ourselves here and
// give it a short, fixed window to finish before deciding we're not inside
// Telegram at all.
const TELEGRAM_SCRIPT_URL = "https://telegram.org/js/telegram-web-app.js";
const TELEGRAM_SCRIPT_TIMEOUT_MS = 300;

let telegramScriptPromise: Promise<TelegramWebApp | null> | null = null;

function loadTelegramScript(): Promise<TelegramWebApp | null> {
  if (telegramScriptPromise) return telegramScriptPromise;

  telegramScriptPromise = new Promise((resolve) => {
    const existing = getTelegramWebApp();
    if (existing) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(getTelegramWebApp());
    };

    const script = document.createElement("script");
    script.src = TELEGRAM_SCRIPT_URL;
    script.onload = finish;
    script.onerror = finish;
    document.head.appendChild(script);

    setTimeout(finish, TELEGRAM_SCRIPT_TIMEOUT_MS);
  });

  return telegramScriptPromise;
}

export function waitForTelegramWebApp(): Promise<TelegramWebApp | null> {
  const existing = getTelegramWebApp();
  if (existing) return Promise.resolve(existing);
  return loadTelegramScript();
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor("#0a2016");
  webApp.setBackgroundColor("#0a2016");
}
