
export interface NativeBridge { isNative(): boolean; showInterstitial(): Promise<void>; showRewarded(): Promise<boolean>; purchase(id: string): Promise<boolean>; restore(): Promise<boolean>; haptic(kind: "light" | "medium" | "heavy" | "success"): void; }
export function getNative(): NativeBridge | null { const n = (window as unknown as { __moonvaneNative?: NativeBridge }).__moonvaneNative; return n && n.isNative() ? n : null; }
export function isNative(): boolean { return getNative() !== null; }
