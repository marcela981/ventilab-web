// frontend/src/utils/requestId.ts

export function newRequestId() {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${buf[0].toString(16)}-${buf[1].toString(16)}-${Date.now()}`;
}

