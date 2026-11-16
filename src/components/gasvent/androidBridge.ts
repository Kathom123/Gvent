type ExportStatus = 'saved' | 'cancelled' | 'error' | 'busy'

declare global {
  interface Window {
    GasVentAndroid?: {
      postMessage: (message: string) => void
      onmessage: ((event: MessageEvent<string>) => void) | null
    }
  }
}

export function isAndroidApp() {
  return typeof window !== 'undefined' && typeof window.GasVentAndroid?.postMessage === 'function'
}

export function exportCsvToAndroid(csv: string) {
  if (!isAndroidApp()) return false
  window.GasVentAndroid!.postMessage(
    JSON.stringify({ type: 'exportCsv', filename: 'Gvent-activity.csv', csv }),
  )
  return true
}

export function subscribeToAndroidExports(onResult: (status: ExportStatus) => void) {
  const bridge = window.GasVentAndroid
  if (!bridge) return () => {}
  bridge.onmessage = (event) => {
    try {
      const result = JSON.parse(event.data)
      if (
        result.type === 'exportResult' &&
        ['saved', 'cancelled', 'error', 'busy'].includes(result.status)
      ) {
        onResult(result.status)
      }
    } catch {}
  }
  return () => {
    bridge.onmessage = null
  }
}
