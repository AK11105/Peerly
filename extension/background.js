const PEERLY_BASE = 'https://cary-funnier-lauryn.ngrok-free.dev/'

// Firefox uses `browser`, Chrome uses `chrome`
const ext = typeof browser !== 'undefined' ? browser : chrome

ext.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return

  const url = details.url
  let parsed
  try { parsed = new URL(url) } catch { return }

  if (!parsed.hostname.startsWith('loom.')) return

  const realHost = parsed.hostname.slice('loom.'.length)
  const realUrl = `${parsed.protocol}//${realHost}${parsed.pathname}${parsed.search}`
  const loomUrl = `${PEERLY_BASE}/loom?url=${encodeURIComponent(realUrl)}`

  try {
    await ext.tabs.update(details.tabId, { url: loomUrl })
  } catch (e) {
    console.error('[Loom] Failed to redirect tab:', e)
  }
})
