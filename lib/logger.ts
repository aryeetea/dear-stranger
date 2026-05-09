type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const DEBUG_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === 'true'

function shouldLog(level: LogLevel) {
  if (level === 'debug') return DEBUG_ENABLED
  return true
}

function formatScope(scope: string) {
  return `[${scope}]`
}

export function createLogger(scope: string) {
  const prefix = formatScope(scope)

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) console.debug(prefix, ...args)
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) console.info(prefix, ...args)
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) console.warn(prefix, ...args)
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) console.error(prefix, ...args)
    },
  }
}
