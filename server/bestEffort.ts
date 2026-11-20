/**
 * Runs a side effect (alerts, Slack, push) that must never decide the outcome
 * of the request that triggered it. A failed import, a thrown error or a slow
 * third party is logged and swallowed; the wait is capped because serverless
 * freezes the function once the response is sent.
 */
export async function bestEffort(task: () => Promise<unknown>, ms: number, label = "side effect"): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const done = Promise.resolve().then(task).then(() => true);
    done.catch(() => undefined); // a rejection after the timeout is not unhandled
    const timeout = new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
    return await Promise.race([done, timeout]);
  } catch (e) {
    console.warn(`[${label}] failed:`, (e as Error)?.message ?? e);
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
