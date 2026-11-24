export function getNative() { const n = window.__moonvaneNative; return n && n.isNative() ? n : null; }
export function isNative() { return getNative() !== null; }
