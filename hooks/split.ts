export type Kind = 'decision' | 'summary'
export type Part = { kind: 'plain' | Kind; text: string }

// A line opening a callout: heading, bold label, or plain label.
export const OPENER =
  /^\s*(?:#{1,6}\s+|\*\*|__)?\s*(decisions? (?:for you|needed|required)|needs? your (?:decision|input|call)|your (?:call|decision)|summary|tl;?dr|recap)\b/i

// A line that starts a new section, ending the callout before it.
const SECTION = /^\s*(?:#{1,6}\s+\S|(?:\*\*|__)[^*_]+(?:\*\*|__)\s*:?\s*$|(?:\*\*|__)[^*_]+:(?:\*\*|__))/

function kindOf(line: string): Kind | undefined {
  const m = OPENER.exec(line)
  if (!m) return undefined
  return /summary|tl;?dr|recap/i.test(m[1] ?? '') ? 'summary' : 'decision'
}

export function split(text: string): Part[] {
  const parts: Part[] = []
  let cur: Part = { kind: 'plain', text: '' }
  let inFence = false

  const push = () => {
    if (cur.text.trim()) parts.push({ kind: cur.kind, text: cur.text.replace(/^\n+|\n+$/g, '') })
  }

  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    const opens = inFence ? undefined : kindOf(line)
    if (opens) {
      push()
      cur = { kind: opens, text: '' }
    } else if (!inFence && cur.kind !== 'plain' && SECTION.test(line)) {
      push()
      cur = { kind: 'plain', text: '' }
    }
    cur.text += line + '\n'
  }
  push()
  return parts
}
