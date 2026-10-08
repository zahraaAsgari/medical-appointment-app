/* Client-side wrappers around the Telegram WebApp JS SDK. */

export interface TgMainButton {
  text: string;
  isVisible: boolean;
  isEnabled: boolean;
  setText(text: string): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

export interface TgBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

export interface TgHaptics {
  impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
  notificationOccurred(type: "error" | "success" | "warning"): void;
  selectionChanged(): void;
}

export interface TgThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  colorScheme?: "light" | "dark";
  themeParams: TgThemeParams;
  isExpanded: boolean;
  version: string;
  platform: string;
  ready(): void;
  expand(): void;
  close(): void;
  enableClosingConfirmation(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  showAlert(message: string): void;
  MainButton: TgMainButton;
  BackButton: TgBackButton;
  HapticFeedback: TgHaptics;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function twa(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light"): void {
  try {
    twa()?.HapticFeedback.impactOccurred(style);
  } catch {
    /* noop */
  }
}

export function hapticNotify(type: "error" | "success" | "warning"): void {
  try {
    twa()?.HapticFeedback.notificationOccurred(type);
  } catch {
    /* noop */
  }
}

export function hapticSelect(): void {
  try {
    twa()?.HapticFeedback.selectionChanged();
  } catch {
    /* noop */
  }
}
