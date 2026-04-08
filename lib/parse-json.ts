export function parseJSON(raw: string): any {
  const c = raw.trim()
  try { return JSON.parse(c) } catch {}
  const fence = c.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) try { return JSON.parse(fence[1].trim()) } catch {}
  const obj = c.match(/(\{[\s\S]*\})|(\[[\s\S]*\])/)
  if (obj) try { return JSON.parse(obj[0]) } catch {}
  throw new Error('Could not parse JSON from AI response')
}
