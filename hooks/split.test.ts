import { describe, expect, test } from 'claude-code/testing'

import { plain, split } from './split'

describe('split', () => {
  test('no callout leaves text whole', async () => {
    expect(split('just some text\n\nmore')).toEqual([{ kind: 'plain', text: 'just some text\n\nmore' }])
  })

  test('decision heading runs until next heading', async () => {
    const parts = split('Intro.\n\n## Decision for you\n- A or B?\n\n## Notes\nrest')
    expect(parts.map(p => p.kind)).toEqual(['plain', 'decision', 'plain'])
    expect(parts[1]?.text).toBe('## Decision for you\n- A or B?')
  })

  test('bold summary label to end', async () => {
    const parts = split('Did stuff.\n\n**Summary:** fixed X, added Y.\n- detail')
    expect(parts.map(p => p.kind)).toEqual(['plain', 'summary'])
  })

  test('tl;dr counts as summary, needs your input as decision', async () => {
    expect(split('TL;DR: done')[0]?.kind).toBe('summary')
    expect(split('**Needs your input:** pick one')[0]?.kind).toBe('decision')
  })

  test('ignores labels inside code fences', async () => {
    expect(split('```\nSummary of logs\n```').map(p => p.kind)).toEqual(['plain'])
  })

  test('plain strips bold and heading markers', async () => {
    expect(plain('## Summary\n**bold** x')).toBe('Summary\nbold x')
  })
})
