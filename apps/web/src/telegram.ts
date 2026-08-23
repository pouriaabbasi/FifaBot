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

// The Telegram bridge script loads with `defer` so it never blocks page
// render. That means window.Telegram can still be unset for a brief moment
// after mount even when we genuinely are inside Telegram. Give it a short,
// fixed window to show up before treating the app as opened outside Telegram.
const TELEGRAM_SCRIPT_GRACE_MS = 300;

export function waitForTelegramWebApp(): Promise<TelegramWebApp | null> {
  const existing = getTelegramWebApp();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const started = Date.now();
    const interval = setInterval(() => {
      const webApp = getTelegramWebApp();
      if (webApp || Date.now() - started >= TELEGRAM_SCRIPT_GRACE_MS) {
        clearInterval(interval);
        resolve(webApp);
      }
    }, 20);
  });
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  webApp.ready();
  webApp.expand();
  webApp.setHeaderColor("#0a2016");
  webApp.setBackgroundColor("#0a2016");
}
