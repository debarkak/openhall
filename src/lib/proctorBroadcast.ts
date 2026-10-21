type ProctorCallback = (data: string) => void;
type ProctorListeners = Map<string, Set<ProctorCallback>>;

const globalForOpenHall = globalThis as typeof globalThis & {
  __openhallProctorListeners?: ProctorListeners;
};

// Next can load route handlers from separate bundles and reload modules in
// development. Keep the single-process subscription registry on the shared
// runtime global so event publishers and SSE subscribers use the same map.
const proctorListeners = globalForOpenHall.__openhallProctorListeners ??=
  new Map<string, Set<ProctorCallback>>();

export function subscribeProctor(
  examId: string,
  callback: ProctorCallback
): () => void {
  if (!proctorListeners.has(examId)) {
    proctorListeners.set(examId, new Set());
  }

  const set = proctorListeners.get(examId)!;
  set.add(callback);

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      proctorListeners.delete(examId);
    }
  };
}

export function broadcastProctorEvent(
  examId: string,
  event: Record<string, unknown>
): void {
  const set = proctorListeners.get(examId);
  if (!set || set.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  set.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // Listener dropped
    }
  });
}
