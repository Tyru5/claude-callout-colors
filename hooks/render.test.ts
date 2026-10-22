import { expect, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'

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
    expect(await ui.find({ type: 'Text', text: /^◆ Decision for you$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^ship now or wait\?$/ })).toBeDefined()
    await ui.unmount()
  }
})

test('decision options: numbered rows, bold key colored', async $ => {
  const ui = await $.ui.mount({
    surface: 'terminal',
    ...msg('**Decision for you:**\n1. **Ship:** now\n2. **Wait:** for CI'),
  })
  expect(await ui.find({ type: 'Text', text: '2.' })).toBeDefined()
  const row = (await ui.find({ type: 'Text', text: 'Wait: for CI' })) as { children: { props: object }[] }
  expect(row.children[0]?.props).toMatchObject({ bold: true, color: 'warning' })
  await ui.unmount()
})

test('summary block colored whole', async $ => {
  const ui = await $.ui.mount({ surface: 'terminal', ...msg('Read 3 files, edited 1', { isSummary: true }) })
  expect(await ui.find({ type: 'Text', text: /Read 3 files/ })).toBeDefined()
  await ui.unmount()
})

const engineRows = (on: On) => {
  // stands in for the engine's own tool rows
  on('ui.render', { component: 'ToolUse' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, `engine:${e.props.tool}`) as RenderElement
  })
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, `engine:${e.props.tool}`) as RenderElement
  })
}

const use = (tool: string, extra: object = {}) => ({
  plugin: 'callout-colors',
  component: 'ToolUse' as const,
  requestId: 't1',
  props: {
    tool_use_id: 't1',
    tool,
    input: { description: 'find auth', subagent_type: 'Explore', model: 'haiku' },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
    ...extra,
  },
})
const result = (output: object, extra: object = {}) => ({
  plugin: 'callout-colors',
  component: 'ToolResult' as const,
  requestId: 't1',
  props: { tool_use_id: 't1', tool: 'Agent', output, isErrored: false, ...extra },
})
const done = { status: 'completed', totalToolUseCount: 3, totalTokens: 4200, totalDurationMs: 3197, content: [{ type: 'text', text: 'Found it.' }] }

test('subagent call: identity header on a rail, engine row only while running', async ($, on) => {
  engineRows(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ surface, ...use('Agent') })
    expect((await ui.find({ type: 'Box' }))?.props).toMatchObject({ marginLeft: 2, paddingLeft: 2 })
    expect(await ui.find({ type: 'Text', text: /^▎\n▎/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^◈ Explore find auth  haiku$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'engine:Agent' })).toBeUndefined()
    await ui.unmount()

    const running = await $.ui.mount({ surface, ...use('Task', { isRunning: true }) })
    expect(await running.find({ type: 'Text', text: 'engine:Task' })).toBeDefined()
    await running.unmount()

    const expanded = await $.ui.mount({ surface, ...use('Agent', { isExpanded: true }) })
    expect(await expanded.find({ type: 'Text', text: /◈/ })).toBeUndefined()
    await expanded.unmount()
  }
})

test('subagent result: compact outcome, engine for errors and expanded', async ($, on) => {
  engineRows(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ surface, ...result(done) })
    expect(await ui.find({ type: 'Text', text: '✓ 3 tools · 4.2k tok · 3.2s' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Found it.' })).toBeDefined()
    await ui.unmount()

    const bg = await $.ui.mount({ surface, ...result({ status: 'async_launched' }) })
    expect(await bg.find({ type: 'Text', text: '↻ running in background' })).toBeDefined()
    await bg.unmount()

    for (const extra of [{ isErrored: true }, { isExpanded: true }]) {
      const r = await $.ui.mount({ surface, ...result(done, extra) })
      expect(await r.find({ type: 'Text', text: 'engine:Agent' })).toBeDefined()
      await r.unmount()
    }
  }
})

test('other tools untouched', async ($, on) => {
  engineRows(on)
  const bash = await $.ui.mount({ surface: 'terminal', ...use('Bash') })
  expect(await bash.find({ type: 'Box' })).toBeUndefined()
  expect(await bash.find({ type: 'Text', text: 'engine:Bash' })).toBeDefined()
  await bash.unmount()
})
