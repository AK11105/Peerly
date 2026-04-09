const PEERLY_BASE = 'https://cary-funnier-lauryn.ngrok-free.dev'

// Firefox uses `browser`, Chrome uses `chrome`
const ext = typeof browser !== 'undefined' ? browser : chrome

// Clicking the extension icon looms the current tab
ext.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.id) return
  const loomUrl = `${PEERLY_BASE}/loom?url=${encodeURIComponent(tab.url)}`
  try {
    await ext.tabs.update(tab.id, { url: loomUrl })
  } catch (e) {
    console.error('[Loom] Icon click redirect failed:', e)
  }
})

ext.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return

  const url = details.url
  let parsed
  try { parsed = new URL(url) } catch { return }

  if (!parsed.hostname.startsWith('loom.')) return

  const realHost = parsed.hostname.slice('loom.'.length)

  // "loom.machine learning" won't parse as a valid hostname — treat as query
  const isQuery = !realHost.includes('.')
  let loomUrl

  if (isQuery) {
    const query = (realHost + parsed.pathname).replace(/^\//, '').replace(/-/g, ' ')
    loomUrl = `${PEERLY_BASE}/loom?q=${encodeURIComponent(query)}`
  } else {
    const realUrl = `${parsed.protocol}//${realHost}${parsed.pathname}${parsed.search}`
    loomUrl = `${PEERLY_BASE}/loom?url=${encodeURIComponent(realUrl)}`
  }

  try {
    await ext.tabs.update(details.tabId, { url: loomUrl })
  } catch (e) {
    console.error('[Loom] Failed to redirect tab:', e)
  }
})
