import { useEffect } from 'react';

/** Web stub: push/local notifications are native-only. */
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
  _minutesFromNow: number = 30
): Promise<string | null> {
  return null;
}

export async function cancelReminder(_notificationId: string | null | undefined) {}

export async function sendImmediateReminder(_destinationLabel: string) {}
