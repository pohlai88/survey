/// <reference types="vite/client" />

interface RetoolQueryInvoker {
  invoke<T>(operation: string, params?: unknown, options?: unknown): Promise<T>
}

interface RetoolRuntimeBridge {
  invokeQuery?: <T>(operation: string, options?: { additionalScope?: unknown }) => Promise<T>
}

declare global {
  interface Window {
    __PORTAL_BACKEND__?: RetoolQueryInvoker
    Retool?: RetoolRuntimeBridge
  }
}

export {}
