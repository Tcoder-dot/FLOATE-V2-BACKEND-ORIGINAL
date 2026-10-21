/**
 * Centralized Timeout & Resilience Service
 * Enforces an explicit 8-10 second timeout on every external call (Firestore, Gemini, Meilisearch, Redis, Sheets)
 * to guarantee no call ever hangs silently.
 */

export interface TimeoutOptions<T> {
  timeoutMs?: number; // Default 8500ms (between 8-10 seconds)
  fallbackValue?: T | (() => T | Promise<T>);
  serviceName: 'Firestore' | 'Gemini' | 'Meilisearch' | 'Redis' | 'GoogleSheets' | 'ExternalAPI';
  operationName: string;
  silentFallback?: boolean;
}

export class TimeoutError extends Error {
  public readonly serviceName: string;
  public readonly operationName: string;
  public readonly timeoutMs: number;

  constructor(serviceName: string, operationName: string, timeoutMs: number) {
    super(`[${serviceName} Timeout] Operation '${operationName}' timed out after ${timeoutMs}ms.`);
    this.name = 'TimeoutError';
    this.serviceName = serviceName;
    this.operationName = operationName;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Wraps an asynchronous external operation with an explicit 8-10s timeout and graceful fallback.
 */
export async function withExternalTimeout<T>(
  asyncOp: () => Promise<T>,
  options: TimeoutOptions<T>
): Promise<T> {
  const timeoutMs = options.timeoutMs || 8500; // 8.5 seconds default (within 8-10s requirement)
  const { serviceName, operationName, fallbackValue, silentFallback = false } = options;

  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new TimeoutError(serviceName, operationName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([asyncOp(), timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error: any) {
    if (timer) clearTimeout(timer);

    const isTimeout = error instanceof TimeoutError || error?.name === 'TimeoutError';
    if (!silentFallback) {
      if (isTimeout) {
        console.warn(`⚠️ [Timeout Warning] ${serviceName} call '${operationName}' exceeded ${timeoutMs}ms. Activating graceful fallback.`);
      } else {
        console.error(`❌ [External Service Error] ${serviceName} call '${operationName}' failed:`, error?.message || error);
      }
    }

    if (fallbackValue !== undefined) {
      if (typeof fallbackValue === 'function') {
        try {
          return await (fallbackValue as () => T | Promise<T>)();
        } catch (fbErr) {
          console.error(`[Fallback Error] Fallback generator failed for ${serviceName}:${operationName}:`, fbErr);
          throw fbErr;
        }
      }
      return fallbackValue;
    }

    throw error;
  }
}
