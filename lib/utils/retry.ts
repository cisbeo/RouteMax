export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export interface RetryableError {
  status?: number;
  message: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 8000,
    backoffMultiplier = 2,
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries - 1) {
        break;
      }

      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Retry exhausted');
}

export function isRetryableError(status?: number): boolean {
  if (!status) return true;

  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(status);
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);

    if (!response.ok && !isRetryableError(response.status)) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, config);
}
