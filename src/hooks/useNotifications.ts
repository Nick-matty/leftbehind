/**
 * Notification helpers.
 *
 * Intentionally does NOT import `expo-notifications`. In Expo Go (SDK 53+)
 * that package logs a hard console.error on Android as soon as it loads, which
 * blocks the UI (including Profile). Local/push reminders are re-enabled in a
 * development or production build via `./notifications.native` when needed.
 */
import { useEffect } from 'react';

export function useNotifications() {
  useEffect(() => {}, []);
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleCheckoutReminder(
  _tripId: string,
  _destinationLabel: string,
  _minutesFromNow: number = 30,
): Promise<string | null> {
  return null;
}

export async function cancelReminder(_notificationId: string | null | undefined) {}

export async function sendImmediateReminder(_destinationLabel: string) {}
