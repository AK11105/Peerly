const STORAGE_KEY = 'peerly_my_weave_ids'

export function getMyWeaveIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addMyWeaveId(id: string) {
  if (typeof window === 'undefined') return
  const ids = getMyWeaveIds()
  if (!ids.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([id, ...ids]))
  }
}

export function removeMyWeaveId(id: string) {
  if (typeof window === 'undefined') return
  const ids = getMyWeaveIds().filter((i) => i !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}
