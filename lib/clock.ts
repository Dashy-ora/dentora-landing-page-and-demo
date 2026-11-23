/** The request's "now" in epoch milliseconds. Components call this after `await connection()`, so it is per request, never prerendered. */
export const requestNow = (): number => Date.now();
