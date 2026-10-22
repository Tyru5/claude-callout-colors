import { describe, expect, test } from 'claude-code/testing'

import { layout, spans } from './layout'

describe('layout', () => {
  test('label from bold opener, rest of line opens body', async () => {
    const l = layout('**Decision for you:** ship now or wait?')
    expect(l.label).toBe('Decision for you')
    expect(l.blocks).toEqual([{ type: 'para', spans: [{ text: 'ship now or wait?' }] }])
  })

  test('heading and plain labels', async () => {
    expect(layout('## Summary\nfixed X').label).toBe('Summary')
    expect(layout('TL;DR: done').blocks).toEqual([{ type: 'para', spans: [{ text: 'done' }] }])
  })

  test('bullets, numbers, depth, checkboxes', async () => {
    const { blocks } = layout('**Summary:**\n- a\n  - b\n1. one\n10) ten\n- [x] done\n- [ ] todo')
    expect(blocks.map(b => (b.type === 'item' ? [b.marker, b.depth] : b.type))).toEqual([
      ['•', 0],
      ['•', 1],
      ['1.', 0],
      ['10.', 0],
      ['☑', 0],
      ['☐', 0],
    ])
  })

  test('wrapped line joins item, blank line is one gap, trailing gaps dropped', async () => {
    const { blocks } = layout('**Summary:**\n- first\n  more\n\n\npara\n\n')
    expect(blocks.map(b => b.type)).toEqual(['item', 'gap', 'para'])
    expect(blocks[0]).toMatchObject({ spans: [{ text: 'first' }, { text: ' more' }] })
  })

  test('code fence kept as one block', async () => {
    const { blocks } = layout('**Summary:**\n```\nx = 1\n- not a bullet\n```')
    expect(blocks).toEqual([{ type: 'code', text: 'x = 1\n- not a bullet' }])
  })

  test('no label when asked', async () => {
    expect(layout('Summary of logs', false).label).toBeUndefined()
  })

  test('spans: bold and code', async () => {
    expect(spans('**A:** run `x` now')).toEqual([
      { text: 'A:', bold: true },
      { text: ' run ' },
      { text: 'x', code: true },
      { text: ' now' },
    ])
  })
})
