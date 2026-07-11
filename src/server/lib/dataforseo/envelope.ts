import { AppError } from "@/server/lib/errors";

// ---------------------------------------------------------------------------
// Billing envelope — the load-bearing seam that carries each call's USD cost
// out to the single metering point in client.ts. Every section fetcher returns
// DataforseoApiResponse<T>; nothing else constructs a billing object.
// ---------------------------------------------------------------------------

export type DataforseoApiCallCost = {
  path: string[];
  costUsd: number;
};

export type DataforseoApiResponse<T> = {
  data: T;
  billing: DataforseoApiCallCost;
};

/**
 * Thrown when a DataForSEO task fails *after* it was billed (cost + path are
 * present). meterDataforseoCall catches this to charge the customer for the
 * failed-but-charged call before rethrowing. Mock fetchers never throw this —
 * kept only because client.ts's catch block still checks for it.
 */
export class DataforseoChargedTaskError extends AppError {
  constructor(
    message: string,
    public readonly billing: DataforseoApiCallCost,
    /**
     * True when the task failed because OUR request was malformed (DataForSEO
     * "Invalid Field: ..."). The customer got no value, so — when the task
     * wasn't billed — meterDataforseoCall skips the charge and rethrows this as
     * a non-reportable VALIDATION_ERROR.
     */
    public readonly isInvalidField = false,
  ) {
    super("INTERNAL_ERROR", message);
    this.name = "DataforseoChargedTaskError";
  }
}
