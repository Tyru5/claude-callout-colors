import { OPENER } from './split'

// Inline run: bold, `code`, or plain.
export type Span = { text: string; bold?: boolean; code?: boolean }
export type Block =
  | { type: 'para'; spans: Span[]; heading?: boolean }
  | { type: 'item'; marker: string; ordered: boolean; depth: number; spans: Span[] }
  | { type: 'code'; text: string }
  | { type: 'gap' }
export type Layout = { label?: string; blocks: Block[] }

const BULLET = /^(\s*)[-*+]\s+(?:\[([ xX])\]\s+)?(.*)$/
const ORDERED = /^(\s*)(\d+|[a-zA-Z])[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/
const FENCE = /^\s*(```|~~~)/

export function spans(md: string): Span[] {
  const out: Span[] = []
  for (const tok of md.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/)) {
    if (!tok) continue
    if (/^(\*\*|__)/.test(tok)) out.push({ text: tok.slice(2, -2), bold: true })
    else if (tok.startsWith('`')) out.push({ text: tok.slice(1, -1), code: true })
    else out.push({ text: tok })
  }
  return out
}

// Callout text -> label (from its opener line) and structured body blocks.
export function layout(text: string, withLabel = true): Layout {
  const lines = text.split('\n')
  let label: string | undefined
  const blocks: Block[] = []

  if (withLabel) {
    const m = OPENER.exec(lines[0] ?? '')
    if (m) {
      label = m[1]
      // Whatever follows the label on its line opens the body.
      lines[0] = (lines[0] ?? '').slice(m.index + m[0].length).replace(/^\s*(?:\*\*|__)?\s*:?\s*(?:\*\*|__)?\s*:?\s*/, '')
    }
  }

  let fence: string[] | undefined
  const gap = () => {
    if (blocks.length && blocks[blocks.length - 1]?.type !== 'gap') blocks.push({ type: 'gap' })
  }

  for (const line of lines) {
    if (FENCE.test(line)) {
      if (fence) {
        blocks.push({ type: 'code', text: fence.join('\n') })
        fence = undefined
      } else fence = []
      continue
    }
    if (fence) {
      fence.push(line)
      continue
    }
    if (!line.trim()) {
      gap()
      continue
    }
    const b = BULLET.exec(line)
    const o = b ? undefined : ORDERED.exec(line)
    const h = HEADING.exec(line)
    const prev = blocks[blocks.length - 1]
    if (b) {
      const marker = b[2] === undefined ? '•' : b[2] === ' ' ? '☐' : '☑'
      blocks.push({ type: 'item', marker, ordered: false, depth: depth(b[1]), spans: spans(b[3] ?? '') })
    } else if (o) {
      blocks.push({ type: 'item', marker: `${o[2]}.`, ordered: true, depth: depth(o[1]), spans: spans(o[3] ?? '') })
    } else if (h) {
      blocks.push({ type: 'para', heading: true, spans: spans(h[1] ?? '') })
    } else if (prev && prev.type !== 'gap' && prev.type !== 'code' && !('heading' in prev && prev.heading)) {
      // Wrapped continuation line joins the block above.
      prev.spans.push(...spans(' ' + line.trim()))
    } else {
      blocks.push({ type: 'para', spans: spans(line.trim()) })
    }
  }
  if (fence) blocks.push({ type: 'code', text: fence.join('\n') })
  while (blocks[blocks.length - 1]?.type === 'gap') blocks.pop()
  return { label, blocks }
}

const depth = (indent = '') => Math.floor(indent.replace(/\t/g, '  ').length / 2)
