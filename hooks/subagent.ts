// Subagent identity and outcome, from the Agent tool's input and stored result.

type Input = {
  description?: string
  subagent_type?: string
  model?: string
  effort?: string
  name?: string
  isolation?: string
}
type Output = {
  status?: string
  resolvedModel?: string
  totalToolUseCount?: number
  totalTokens?: number
  totalDurationMs?: number
  toolStats?: { linesAdded?: number; linesRemoved?: number }
  content?: { type: string; text?: string }[]
  worktreeBranch?: string
}

export type Identity = { type: string; description: string; tags: string[] }
export type Outcome = { icon: string; stats: string[]; report?: string }

// Theme keys an agent's rail cycles through; warning/suggestion stay with the callouts.
const HUES = ['merged', 'permission', 'autoAccept', 'claude', 'ide', 'remember', 'planMode', 'success']

export function hue(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length] ?? 'merged'
}

// `claude-haiku-5-5[1m]` -> `haiku 5.5`
export function shortModel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(id)
  return m ? `${m[1]} ${m[2]}.${m[3]}` : id
}

export function identity(input: unknown, output?: unknown): Identity {
  const i = (input ?? {}) as Input
  const o = (output ?? {}) as Output
  const tags = [
    o.resolvedModel ? shortModel(o.resolvedModel) : i.model,
    i.effort,
    i.isolation === 'worktree' ? `worktree${o.worktreeBranch ? ` ${o.worktreeBranch}` : ''}` : i.isolation,
    i.name && `@${i.name}`,
  ].filter((t): t is string => !!t)
  return { type: i.subagent_type || 'general-purpose', description: i.description ?? '', tags }
}

export function tokens(n: number): string {
  return n < 1000 ? `${n} tok` : `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k tok`
}

export function duration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s % 60)}s`
}

// Compact outcome for a finished or backgrounded agent; undefined leaves the engine's.
export function outcome(output: unknown): Outcome | undefined {
  const o = (output ?? {}) as Output
  if (o.status === 'async_launched') return { icon: '↻', stats: ['running in background'] }
  if (o.status !== 'completed') return undefined
  const stats: string[] = []
  if (o.totalToolUseCount !== undefined) stats.push(`${o.totalToolUseCount} tool${o.totalToolUseCount === 1 ? '' : 's'}`)
  if (o.totalTokens) stats.push(tokens(o.totalTokens))
  if (o.totalDurationMs) stats.push(duration(o.totalDurationMs))
  const { linesAdded = 0, linesRemoved = 0 } = o.toolStats ?? {}
  if (linesAdded || linesRemoved) stats.push(`+${linesAdded} −${linesRemoved}`)
  const text = (o.content ?? []).map(c => c.text ?? '').join('\n')
  const report = text
    .split('\n')
    .map(l => l.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/, '').replace(/\*\*|__|`/g, '').trim())
    .find(Boolean)
  return { icon: '✓', stats, report }
}
