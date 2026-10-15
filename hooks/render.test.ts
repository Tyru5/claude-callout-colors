import { expect, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

const msg = (text: string, extra: object = {}) => ({
  plugin: 'callout-colors',
  component: 'AssistantMessage' as const,
  requestId: 'm1',
  props: { text, isFirstOfReply: true, ...extra },
})

test('decision drawn as colored callout on each surface', async ($, on) => {
  // stands in for the engine's own drawing of the leading plain text
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, `engine:${e.props.text}`) as RenderElement
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ surface, ...msg('Done.\n\n**Decision for you:** ship now or wait?') })
    expect(await ui.find({ type: 'Text', text: /^engine:Done\.$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Decision for you: ship now/ })).toBeDefined()
    await ui.unmount()
  }
})

test('summary block colored whole', async $ => {
  const ui = await $.ui.mount({ surface: 'terminal', ...msg('Read 3 files, edited 1', { isSummary: true }) })
  expect(await ui.find({ type: 'Text', text: /Read 3 files/ })).toBeDefined()
  await ui.unmount()
})
