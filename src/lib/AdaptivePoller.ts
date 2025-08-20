/**
 * Poll a callback indefinitely with exponential-backoff on error and optional
 * jittering to avoid herd effects.
 */
export class AdaptivePoller {
  private minInterval: number;
  private maxInterval: number;
  private backoffMultiplier: number;
  private jitter: number;
  private currentInterval: number;
  private abortController: AbortController | null = null;
  private isPolling = false;

  constructor(
    /**
     * Callback to run - should return true on success, false or error
     */
    private callback: () => Promise<boolean>,
    options: {
      /** Interval to use on success */
      minInterval?: number;
      /** Maximum interval when increased through exponential backoff */
      maxInterval?: number;
      /** Multiplier for exponential backoff */
      backoffMultiplier?: number;
      /** Amount of jitter (in MS) to avoid thundering herd effects */
      jitter?: number;
    } = {},
  ) {
    this.minInterval = options.minInterval ?? 1000;
    this.maxInterval = options.maxInterval ?? 30000;
    this.backoffMultiplier = options.backoffMultiplier ?? 1.5;
    this.jitter = options.jitter ?? 50;
    this.currentInterval = this.minInterval;
  }

  private getJitter() {
    return Math.random() * (this.jitter * 2) - this.jitter;
  }

  private async poll() {
    if (!this.isPolling) {
      return;
    }

    this.abortController = new AbortController();

    let isSuccess: boolean;
    try {
      isSuccess = await this.callback();
    } catch (error) {
      const isAbortError =
        !!error &&
        typeof error === "object" &&
        "name" in error &&
        error.name !== "AbortError";
      isSuccess = isAbortError;
    }
    if (isSuccess) {
      this.currentInterval = this.minInterval;
      setTimeout(() => void this.poll(), this.currentInterval + this.getJitter());
    } else {
      this.currentInterval = Math.min(
        this.currentInterval * this.backoffMultiplier,
        this.maxInterval,
      );
      setTimeout(() => void this.poll(), this.currentInterval);
    }
  }

  start() {
    if (!this.isPolling) {
      this.isPolling = true;
      void this.poll();
    }
  }

  stop() {
    this.isPolling = false;
    this.abortController?.abort();
  }
}
