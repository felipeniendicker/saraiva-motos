function fallbackUuid() {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createOperationKey() {
  return globalThis.crypto?.randomUUID?.() || fallbackUuid();
}

export function operationFingerprint(payload) {
  return JSON.stringify(payload);
}

export function getOperationAttempt(current, payload, keyFactory = createOperationKey) {
  const fingerprint = operationFingerprint(payload);
  if (current?.fingerprint === fingerprint) return current;
  return { key: keyFactory(), fingerprint };
}
