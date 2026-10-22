import type { Elements, Register, RenderChildren } from 'claude-code'

import { layout, type Block, type Span } from './layout'
import { split, type Kind } from './split'
import { hue, identity, outcome } from './subagent'

// Theme keys, so colors follow the person's theme.
const COLOR: Record<Kind, string> = { decision: 'warning', summary: 'suggestion' }
// Inline code, as the engine draws it.
const CODE_COLOR = 'permission'
const ICON: Record<Kind, string> = { decision: '◆', summary: '≡' }

// Subagent calls: the Agent tool (`Task` in older transcripts).
const SUBAGENT_TOOLS = new Set(['Agent', 'Task'])
// Left rail: an absolute column of bars spanning the row's height (a border
// style would add empty top/bottom rows and split call from result).
const RAIL_BARS = Array(400).fill('▎').join('\n')

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { Box, Text, Markdown } = $.ui.resolve(e)

    const run = (s: Span, color: string, i: number) => (
      <Text key={`s${i}`} bold={s.bold} color={s.bold ? color : s.code ? CODE_COLOR : undefined}>
        {s.text}
      </Text>
    )
    const runs = (spans: Span[], color: string) => <Text>{spans.map((s, i) => run(s, color, i))}</Text>

    // Header row (icon + label), then body: paragraphs, hanging-indent list rows, code.
    const callout = (kind: Kind, text: string, key: string, withLabel = true, top = 0) => {
      const color = COLOR[kind]
      const { label, blocks } = layout(text, withLabel)
      const markerWidth = Math.max(1, ...blocks.map(b => (b.type === 'item' ? b.marker.length : 0))) + 1
      const block = (b: Block, i: number) => {
        const k = `b${i}`
        switch (b.type) {
          case 'gap':
            return <Text key={k}> </Text>
          case 'code':
            return (
              <Box key={k} marginLeft={2}>
                <Text color={CODE_COLOR}>{b.text}</Text>
              </Box>
            )
          case 'para':
            return b.heading ? (
              <Text key={k} bold color={color}>
                {b.spans.map(s => s.text).join('')}
              </Text>
            ) : (
              <Box key={k}>{runs(b.spans, color)}</Box>
            )
          case 'item':
            return (
              <Box key={k} flexDirection="row" marginLeft={b.depth * 2}>
                <Box flexShrink={0} width={b.ordered ? markerWidth : 2}>
                  <Text color={color} bold={b.ordered}>
                    {b.marker}
                  </Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  {runs(b.spans, color)}
                </Box>
              </Box>
            )
        }
      }
      return (
        <Box key={key} borderStyle="round" borderColor={color} paddingX={1} flexDirection="column" marginTop={top}>
          {label && (
            <Text bold color={color}>
              {ICON[kind]} {label}
            </Text>
          )}
          {blocks.map(block)}
        </Box>
      )
    }

    // Between-tool-call summaries: whole block is a summary.
    if (e.props.isSummary) {
      return <Box flexDirection="column">{callout('summary', e.props.text, 's', false)}</Box>
    }

    const parts = split(e.props.text)
    if (!parts.some(p => p.kind !== 'plain')) return next(e)

    // Leading plain text keeps the engine's own drawing (and its reply bullet).
    const [head, ...rest] = parts
    const first =
      head?.kind === 'plain' ? await next({ ...e, props: { ...e.props, text: head.text } }) : undefined
    const tail = first ? rest : parts

    return (
      <Box flexDirection="column">
        {first}
        {tail.map((p, i) =>
          p.kind === 'plain' ? (
            <Markdown key={`p${i}`} text={p.text} />
          ) : (
            callout(p.kind, p.text, `c${i}`, true, first || i > 0 ? 1 : 0)
          ),
        )}
      </Box>
    )
  })

  // Subagent rows: an indented left rail in a per-agent color, so a call pairs
  // with its result and parallel agents stay apart. Compact view draws an
  // identity header and a one-line outcome; expanded (ctrl+o) keeps the engine's.
  const railed = (
    { Box, Text }: Pick<Elements['terminal'], 'Box' | 'Text'>,
    color: string,
    children: RenderChildren,
    top = 0,
  ) => (
    <Box marginLeft={2} marginTop={top} paddingLeft={2} flexDirection="column">
      <Box position="absolute" top={0} bottom={0} left={0} width={1} overflow="hidden">
        <Text color={color}>{RAIL_BARS}</Text>
      </Box>
      {children}
    </Box>
  )

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!SUBAGENT_TOOLS.has(e.props.tool)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const color = hue(e.props.tool_use_id)
    if (e.props.isExpanded) return railed({ Box, Text }, color, await next(e), 1)

    const id = identity(e.props.input, e.props.output)
    const state = e.props.isInterrupted ? 'interrupted' : e.props.isErrored ? 'failed' : undefined
    return railed({ Box, Text }, color, [
        <Text key="id">
          <Text bold color={color}>
            ◈ {id.type}
          </Text>
          {id.description ? <Text> {id.description}</Text> : null}
          {id.tags.length ? <Text dimColor>  {id.tags.join(' · ')}</Text> : null}
          {state ? <Text color="error">  {state}</Text> : null}
        </Text>,
        // live progress (sub-tool calls) while it runs
        e.props.isRunning ? await next(e) : null,
      ], 1)
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!SUBAGENT_TOOLS.has(e.props.tool)) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const color = hue(e.props.tool_use_id)
    const o = e.props.isExpanded || e.props.isErrored ? undefined : outcome(e.props.output)
    if (!o) return railed({ Box, Text }, color, await next(e))
    return railed({ Box, Text }, color, [
      <Text key="o">
        <Text color={color}>{o.icon}</Text>
        <Text dimColor> {o.stats.join(' · ')}</Text>
      </Text>,
      o.report ? (
        <Text key="r" dimColor wrap="truncate-end">
          {o.report}
        </Text>
      ) : null,
    ])
  })
}
