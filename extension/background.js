const PEERLY_BASE ='https://cary-funnier-lauryn.ngrok-free.dev' // change to localhost:3000 for dev

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return

  const url = details.url
  let parsed
  try { parsed = new URL(url) } catch { return }

  // Match loom.<anything> e.g. loom.reddit.com/r/india
  if (!parsed.hostname.startsWith('loom.')) return

  // Reconstruct the real target URL
  const realHost = parsed.hostname.slice('loom.'.length)
  const realUrl = `${parsed.protocol}//${realHost}${parsed.pathname}${parsed.search}`

  // Redirect the tab to our /loom?url= handler
  const loomUrl = `${PEERLY_BASE}/loom?url=${encodeURIComponent(realUrl)}`
  chrome.tabs.update(details.tabId, { url: loomUrl })
})
