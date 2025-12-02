import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEY = 'syncQueue';

type SyncEventType = 'START' | 'END';

type SyncEvent = {
  id: string;
  interventionId: string;
  siteId: string;
  type: SyncEventType;
  timestamp: string;
  coordinates?: { latitude: number; longitude: number } | null;
};

type QueueInput = {
  interventionId: string;
  siteId: string;
  type: SyncEventType;
  timestamp: string;
  coordinates?: { latitude: number; longitude: number } | null;
};

type SyncContextValue = {
  isOnline: boolean;
  pendingEvents: SyncEvent[];
  queueEvent: (input: QueueInput) => Promise<void>;
  flush: () => Promise<void>;
  clearQueue: () => void;
  removeEvent: (id: string) => void;
  pendingStarts: SyncEvent[];
  pendingEnds: SyncEvent[];
  lastError: string | null;
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingEvents, setPendingEvents] = useState<SyncEvent[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          setPendingEvents(JSON.parse(value));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pendingEvents)).catch(() => {});
  }, [pendingEvents]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  const mockUpload = useCallback(async (event: SyncEvent) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return event;
  }, []);

  const flush = useCallback(async () => {
    if (!isOnline || pendingEvents.length === 0) {
      return;
    }
    for (const event of pendingEvents) {
      try {
        await mockUpload(event);
        setPendingEvents((prev) => prev.filter((item) => item.id !== event.id));
        setLastError(null);
      } catch (error) {
        setLastError(error instanceof Error ? error.message : 'Synchronisation impossible');
        break;
      }
    }
  }, [isOnline, pendingEvents, mockUpload]);

  useEffect(() => {
    if (isOnline) {
      flush();
    }
  }, [isOnline, flush]);

  const queueEvent = useCallback(
    async (input: QueueInput) => {
      const event: SyncEvent = {
        id: `sync-${Date.now()}`,
        ...input,
      };

      if (isOnline) {
        try {
          await mockUpload(event);
          setLastError(null);
          return;
        } catch (error) {
          setLastError(error instanceof Error ? error.message : 'Synchronisation impossible');
          // fallthrough to queueing locally
        }
      }

      setPendingEvents((prev) => [event, ...prev]);
    },
    [isOnline, mockUpload],
  );

  const clearQueue = useCallback(() => {
    setPendingEvents([]);
    setLastError(null);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setPendingEvents((prev) => prev.filter((evt) => evt.id !== id));
  }, []);

  const pendingStarts = useMemo(() => pendingEvents.filter((e) => e.type === 'START'), [pendingEvents]);
  const pendingEnds = useMemo(() => pendingEvents.filter((e) => e.type === 'END'), [pendingEvents]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingEvents,
      queueEvent,
      flush,
      clearQueue,
      removeEvent,
      pendingStarts,
      pendingEnds,
      lastError,
    }),
    [isOnline, pendingEvents, queueEvent, flush, clearQueue, removeEvent, pendingStarts, pendingEnds, lastError],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSyncContext = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return ctx;
};
