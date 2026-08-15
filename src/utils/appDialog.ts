export async function showAppMessage(title: string, message: string): Promise<void> {
  const api = window.bocasoft;
  try {
    if (api?.showAppMessage) {
      await api.showAppMessage({ title, message });
      return;
    }
    window.alert(message);
  } finally {
    await api?.restoreAppFocus?.();
  }
}

export async function restoreAppFocus(): Promise<void> {
  await window.bocasoft?.restoreAppFocus?.();
}
