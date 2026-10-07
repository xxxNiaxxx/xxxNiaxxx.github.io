import { useEffect, useState } from 'react';
import { useAppStore } from './appStore';
import { useNotificationStore } from './notificationStore';
import { useProfileStore } from './profileStore';
import { useTaskStore } from './taskStore';

const stores = [useAppStore, useProfileStore, useTaskStore, useNotificationStore];

function allHydrated() {
  return stores.every((s) => s.persist.hasHydrated());
}

/** True once every persisted store has been restored from AsyncStorage. */
export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);
  useEffect(() => {
    if (hydrated) return;
    const unsubs = stores.map((s) => s.persist.onFinishHydration(() => setHydrated(allHydrated())));
    setHydrated(allHydrated());
    return () => unsubs.forEach((u) => u());
  }, [hydrated]);
  return hydrated;
}
