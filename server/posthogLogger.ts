/**
 * PostHog Logs exporter for KSYK Maps API — OpenTelemetry OTLP over HTTP.
 *
 * The wizard-installed baseline uses SimpleLogRecordProcessor (fire per
 * log). We add:
 *   - emitLog(...) : safe helper that never throws
 *   - flushLogs()  : must be called before a Vercel serverless function
 *                    returns so the buffered exports actually leave the
 *                    process (Vercel freezes the runtime between calls)
 *   - severity mapping so `emitLog(msg, { severity: 'error' })` shows up
 *     with the right level in PostHog's Logs view.
 *
 * Public phc_ token baked as default — override with env
 * `POSTHOG_API_KEY` + `POSTHOG_HOST` if the project rotates keys.
 */
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { logs, SeverityNumber, type Logger } from '@opentelemetry/api-logs'

const DEFAULT_KEY = 'phc_z4eXUY3op3B93RcMzhvCPbUN8c8cACFB92XW3VuBVbCq'
const DEFAULT_HOST = 'https://us.i.posthog.com'

const apiKey = process.env.POSTHOG_API_KEY || DEFAULT_KEY
const host = process.env.POSTHOG_HOST || DEFAULT_HOST

/** True when we should skip sending logs to PostHog (dev without explicit key). */
const isDevWithoutKey =
  process.env.NODE_ENV !== 'production' &&
  process.env.VERCEL_ENV !== 'production' &&
  !process.env.POSTHOG_API_KEY

const exporter = new OTLPLogExporter({
  url: `${host}/otlp/v1/logs`,
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
})

const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'ksyk-maps-api',
    'service.version': process.env.npm_package_version ?? 'unknown',
    deployment: process.env.VERCEL_ENV ?? 'local',
  }),
  processors: [new SimpleLogRecordProcessor({ exporter })],
})

logs.setGlobalLoggerProvider(loggerProvider)

export const posthogLogger: Logger = loggerProvider.getLogger('ksyk-maps')

export type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical'

function severityNumber(level: LogSeverity | undefined): SeverityNumber {
  switch (level) {
    case 'critical': return SeverityNumber.FATAL
    case 'error':    return SeverityNumber.ERROR
    case 'warn':     return SeverityNumber.WARN
    case 'debug':    return SeverityNumber.DEBUG
    default:         return SeverityNumber.INFO
  }
}

export function emitLog(
  body: string,
  opts: { severity?: LogSeverity; attributes?: Record<string, unknown> } = {},
): void {
  if (isDevWithoutKey) return; // Don't send real events in dev without explicit key
  try {
    posthogLogger.emit({
      body: body.slice(0, 2000),
      severityNumber: severityNumber(opts.severity),
      severityText: opts.severity ?? 'info',
      attributes: (opts.attributes ?? {}) as Record<string, string | number | boolean>,
    })
  } catch { /* observability is best-effort */ }
}

export async function flushLogs(): Promise<void> {
  if (isDevWithoutKey) return; // Don't send real events in dev without explicit key
  try {
    await loggerProvider.forceFlush()
  } catch { /* ignore */ }
}
