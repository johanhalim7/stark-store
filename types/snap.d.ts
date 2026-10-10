/**
 * Deklarasi tipe untuk Midtrans Snap.js (dimuat dinamis dari snapJsUrl).
 */
interface SnapPayCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapPayCallbacks) => void;
    };
  }
}

export {};
