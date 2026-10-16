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

test('subagent rows wrapped, other tools untouched', async ($, on) => {
  // stands in for the engine's own tool rows
  on('ui.render', { component: 'ToolUse' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, `engine:${e.props.tool}`) as RenderElement
  })
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, `engine:${e.props.tool}`) as RenderElement
  })

  const use = (tool: string) => ({
    plugin: 'callout-colors',
    component: 'ToolUse' as const,
    requestId: 't1',
    props: { tool_use_id: 't1', tool, input: {}, isRunning: false, isErrored: false, isInterrupted: false },
  })
  const result = {
    plugin: 'callout-colors',
    component: 'ToolResult' as const,
    requestId: 't2',
    props: { tool_use_id: 't2', tool: 'Agent', output: {}, isErrored: false },
  }
  for (const surface of ['terminal', 'desktop'] as const) {
    for (const target of [use('Agent'), use('Task'), result]) {
      const ui = await $.ui.mount({ surface, ...target })
      const box = await ui.find({ type: 'Box' })
      expect(box?.props).toMatchObject({ borderColor: 'merged', marginLeft: 2 })
      expect(await ui.find({ type: 'Text', text: /^engine:(Agent|Task)$/ })).toBeDefined()
      await ui.unmount()
    }
    const bash = await $.ui.mount({ surface, ...use('Bash') })
    expect(await bash.find({ type: 'Box' })).toBeUndefined()
    expect(await bash.find({ type: 'Text', text: 'engine:Bash' })).toBeDefined()
    await bash.unmount()
  }
})
