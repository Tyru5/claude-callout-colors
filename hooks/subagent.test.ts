import { describe, expect, test } from 'claude-code/testing'

import { duration, hue, identity, outcome, shortModel, tokens } from './subagent'

describe('subagent', () => {
  test('identity: type, description, tags', async () => {
    expect(
      identity(
        { description: 'find auth', subagent_type: 'Explore', model: 'haiku', effort: 'low', name: 'scout', isolation: 'worktree' },
        { resolvedModel: 'claude-haiku-5-5', worktreeBranch: 'wt-1' },
      ),
    ).toEqual({ type: 'Explore', description: 'find auth', tags: ['haiku 5.5', 'low', 'worktree wt-1', '@scout'] })
    expect(identity({ description: 'x' })).toEqual({ type: 'general-purpose', description: 'x', tags: [] })
    expect(identity({ model: 'haiku', isolation: 'worktree' }).tags).toEqual(['haiku', 'worktree'])
  })

  test('formatting', async () => {
    expect(shortModel('claude-opus-5-5[1m]')).toBe('opus 5.5')
    expect(tokens(812)).toBe('812 tok')
    expect(tokens(24777)).toBe('25k tok')
    expect(tokens(4200)).toBe('4.2k tok')
    expect(duration(3197)).toBe('3.2s')
    expect(duration(64000)).toBe('1m 4s')
  })

  test('outcome: completed, background, other', async () => {
    expect(
      outcome({
        status: 'completed',
        totalToolUseCount: 1,
        totalTokens: 24777,
        totalDurationMs: 3197,
        toolStats: { linesAdded: 4, linesRemoved: 1 },
        content: [{ type: 'text', text: '\n## **Found** 3 files\nmore' }],
      }),
    ).toEqual({ icon: '✓', stats: ['1 tool', '25k tok', '3.2s', '+4 −1'], report: 'Found 3 files' })
    expect(outcome({ status: 'async_launched' })?.stats).toEqual(['running in background'])
    expect(outcome({ status: 'teammate_spawned' })).toBeUndefined()
  })

  test('hue stable per id', async () => {
    expect(hue('toolu_a')).toBe(hue('toolu_a'))
  })
})
