import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs'
import type { Logger } from '@opentelemetry/api-logs'

const exporter = new OTLPLogExporter({
  url: 'https://us.i.posthog.com/otlp/v1/logs',
  headers: {
    Authorization: 'Bearer phc_z4eXUY3op3B93RcMzhvCPbUN8c8cACFB92XW3VuBVbCq',
  },
})

const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ 'service.name': 'ksyk-maps' }),
  processors: [new SimpleLogRecordProcessor({ exporter })],
})

export const posthogLogger: Logger = loggerProvider.getLogger('ksyk-maps')
