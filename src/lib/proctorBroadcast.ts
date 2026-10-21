type ProctorCallback = (data: string) => void;

const proctorListeners = new Map<string, Set<ProctorCallback>>();

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
