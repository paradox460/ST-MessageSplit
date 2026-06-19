import { describe, test, expect, afterEach } from 'bun:test';
import { onMergeCommand, onSplitCommand } from '../src/commands';
import { installSTGlobals, clearSTGlobals, msg, type STMocks } from './helpers';

afterEach(() => {
  clearSTGlobals();
});

describe('onMergeCommand', () => {
  test('no arg merges the last message into its ancestor', async () => {
    const chat = [msg('A'), msg('B'), msg('C')];
    const mocks = installSTGlobals(chat);
    await onMergeCommand({}, '');
    expect(chat).toHaveLength(2);
    expect(chat[1].mes).toBe('B\n\nC');
    expect(mocks.warnings).toEqual([]);
    expect(mocks.state.printCalls).toBe(1);
  });

  test('no arg with fewer than 2 messages warns', async () => {
    const chat = [msg('A')];
    const mocks = installSTGlobals(chat);
    await onMergeCommand({}, '');
    expect(mocks.warnings).toContain('No previous message to merge into.');
    expect(chat).toHaveLength(1);
    expect(mocks.state.printCalls).toBe(0);
  });

  test('single valid id merges into previous', async () => {
    const chat = [msg('A'), msg('B'), msg('C'), msg('D')];
    installSTGlobals(chat);
    await onMergeCommand({}, '2');
    expect(chat[1].mes).toBe('B\n\nC');
    expect(chat).toHaveLength(3);
  });

  test('single id 0 warns', async () => {
    const chat = [msg('A'), msg('B')];
    const mocks = installSTGlobals(chat);
    await onMergeCommand({}, '0');
    expect(mocks.warnings).toContain('No previous message to merge into.');
    expect(chat).toHaveLength(2);
  });

  test('range collapses into start', async () => {
    const chat = [msg('A'), msg('B'), msg('C'), msg('D')];
    installSTGlobals(chat);
    await onMergeCommand({}, '0-2');
    expect(chat[0].mes).toBe('A\n\nB\n\nC');
    expect(chat[1].mes).toBe('D');
    expect(chat).toHaveLength(2);
  });

  test('invalid token warns', async () => {
    const chat = [msg('A'), msg('B')];
    const mocks = installSTGlobals(chat);
    await onMergeCommand({}, 'abc');
    expect(mocks.warnings[0]).toStartWith('Invalid message id or range:');
    expect(chat).toHaveLength(2);
  });

  test('out of range warns', async () => {
    const chat = [msg('A'), msg('B')];
    const mocks = installSTGlobals(chat);
    await onMergeCommand({}, '5');
    expect(mocks.warnings).toContain('Invalid message id or range: "5".');
    expect(chat).toHaveLength(2);
  });
});

describe('onSplitCommand', () => {
  let mocks: STMocks;

  test('valid split at refIndex', async () => {
    const chat = [msg('p0\n\np1\n\np2')];
    mocks = installSTGlobals(chat);
    mocks.setFuseResults([{ refIndex: 2 }]);
    await onSplitCommand({ msg: '0' }, 'whatever');
    expect(chat).toHaveLength(2);
    expect(chat[0].mes).toBe('p0\n\np1');
    expect(chat[1].mes).toBe('p2');
    expect(mocks.state.printCalls).toBe(1);
  });

  test('defaults to last message when msg absent', async () => {
    const chat = [msg('skip'), msg('a\n\nb')];
    mocks = installSTGlobals(chat);
    mocks.setFuseResults([{ refIndex: 1 }]);
    await onSplitCommand({}, 'text');
    expect(chat).toHaveLength(3);
    expect(chat[1].mes).toBe('a');
    expect(chat[2].mes).toBe('b');
  });

  test('empty query warns', async () => {
    const chat = [msg('a\n\nb')];
    mocks = installSTGlobals(chat);
    await onSplitCommand({ msg: '0' }, '');
    expect(mocks.warnings).toContain('Provide text to match the split point: /split msg=[id] <text>.');
    expect(chat).toHaveLength(1);
  });

  test('invalid msg id warns', async () => {
    const chat = [msg('a\n\nb')];
    mocks = installSTGlobals(chat);
    await onSplitCommand({ msg: '9' }, 'x');
    expect(mocks.warnings).toContain('Invalid message id: "9".');
    expect(chat).toHaveLength(1);
  });

  test('fewer than 2 paragraphs warns', async () => {
    const chat = [msg('single')];
    mocks = installSTGlobals(chat);
    await onSplitCommand({ msg: '0' }, 'x');
    expect(mocks.warnings).toContain('Message has no paragraph breaks to split on.');
    expect(chat).toHaveLength(1);
  });

  test('no Fuse match warns', async () => {
    const chat = [msg('a\n\nb')];
    mocks = installSTGlobals(chat);
    mocks.setFuseResults([]);
    await onSplitCommand({ msg: '0' }, 'zzz');
    expect(mocks.warnings).toContain('No paragraph matches "zzz".');
    expect(chat).toHaveLength(1);
  });

  test('best match is first paragraph warns', async () => {
    const chat = [msg('a\n\nb')];
    mocks = installSTGlobals(chat);
    mocks.setFuseResults([{ refIndex: 0 }]);
    await onSplitCommand({ msg: '0' }, 'a');
    expect(mocks.warnings).toContain('Best-matching paragraph is the first; nothing to split before.');
    expect(chat).toHaveLength(1);
    expect(mocks.state.printCalls).toBe(0);
  });
});
