import type { Register } from 'claude-code'

import { plain, split, type Kind } from './split'

// Theme keys, so colors follow the person's theme.
const COLOR: Record<Kind, string> = { decision: 'warning', summary: 'suggestion' }

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { Box, Text, Markdown } = $.ui.resolve(e)

    const callout = (kind: Kind, text: string, key: string) => (
      <Box key={key} borderStyle="round" borderColor={COLOR[kind]} paddingX={1}>
        <Text color={COLOR[kind]}>{plain(text)}</Text>
      </Box>
    )

    // Between-tool-call summaries: whole block is a summary.
    if (e.props.isSummary) {
      return <Box flexDirection="column">{callout('summary', e.props.text, 's')}</Box>
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
          p.kind === 'plain' ? <Markdown key={`p${i}`} text={p.text} /> : callout(p.kind, p.text, `c${i}`),
        )}
      </Box>
    )
  })
}
