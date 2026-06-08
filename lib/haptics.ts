// Thin wrapper around @capacitor/haptics so calls are no-ops in the browser
// (and don't throw on plain web). On iOS Capacitor the Haptics plugin maps
// these to UIImpactFeedbackGenerator / UINotificationFeedbackGenerator.

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type Style = 'light' | 'medium' | 'heavy';

function inCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform?.() === true;
}

/** Single tap. Use on tab change, primary button presses. */
export function tap(style: Style = 'light'): void {
  if (!inCapacitor()) return;
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  void Haptics.impact({ style: map[style] }).catch(() => {});
}

/** Success notification — heavier, double-tap "done" feeling. */
export function success(): void {
  if (!inCapacitor()) return;
  void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

/** Warning / error notification. */
export function warn(): void {
  if (!inCapacitor()) return;
  void Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}
