import { describe, test, expect } from 'bun:test';
import { applyParagraphSplit, mergeRange, parseIdRange } from '../src/mutations';
import { msg } from './helpers';

function fakeCtx(
): {
  ctx: STContext;
  counts: { print: number; save: number };
} {
  const counts = { print: 0, save: 0 };
  const ctx = {
    chat,
    async printMessages(): Promise<void> {
      counts.print++;
    },
    async saveChat(): Promise<void> {
      counts.save++;
    },
  } as unknown as STContext;
  return { ctx, counts };
}

describe('parseIdRange', () => {
  test('single id', () => {
    expect(parseIdRange('3', 0, 5)).toEqual({ start: 3, end: 3 });
  });
  test('range', () => {
    expect(parseIdRange('2-4', 0, 5)).toEqual({ start: 2, end: 4 });
  });
  test('reversed range is null', () => {
    expect(parseIdRange('4-2', 0, 5)).toBeNull();
  });
  test('non-numeric is null', () => {
    expect(parseIdRange('abc', 0, 5)).toBeNull();
  });
  test('above max is null', () => {
    expect(parseIdRange('9', 0, 5)).toBeNull();
  });
  test('open-ended end is null', () => {
    expect(parseIdRange('2-', 0, 5)).toBeNull();
  });
  test('open-ended start is null', () => {
    expect(parseIdRange('-3', 0, 5)).toBeNull();
  });
  test('lower boundary', () => {
    expect(parseIdRange('0', 0, 5)).toEqual({ start: 0, end: 0 });
  });
  test('upper boundary', () => {
    expect(parseIdRange('5', 0, 5)).toEqual({ start: 5, end: 5 });
  });
});

describe('mergeRange', () => {
  test('merges two messages', async () => {
    const chat = [msg('A'), msg('B')];
    const { ctx, counts } = fakeCtx(chat);
    await mergeRange(ctx, 0, 1);
    expect(chat).toHaveLength(1);
    expect(chat[0].mes).toBe('A\n\nB');
    expect(counts.print).toBe(1);
    expect(counts.save).toBe(1);
  });

  test('merges a range', async () => {
    const chat = [msg('A'), msg('B'), msg('C'), msg('D')];
    const { ctx } = fakeCtx(chat);
    await mergeRange(ctx, 0, 2);
    expect(chat).toHaveLength(2);
    expect(chat[0].mes).toBe('A\n\nB\n\nC');
    expect(chat[1].mes).toBe('D');
  });

  test('clears swipe/token fields on target but keeps unrelated extra', async () => {
    const chat = [
      msg('A', { swipes: ['x'], swipe_id: 1, swipe_info: [{}], extra: { token_count: 5, foo: 1 } }),
      msg('B'),
    ];
    const { ctx } = fakeCtx(chat);
    await mergeRange(ctx, 0, 1);
    expect(chat[0].swipes).toBeUndefined();
    expect(chat[0].swipe_id).toBeUndefined();
    expect(chat[0].swipe_info).toBeUndefined();
    expect(chat[0].extra?.token_count).toBeUndefined();
    expect(chat[0].extra?.foo).toBe(1);
  });

  test('skips non-string middle message from text but still removes it', async () => {
    const chat = [msg('A'), { mes: undefined }, msg('C')] as ChatMessage[];
    const { ctx } = fakeCtx(chat);
    await mergeRange(ctx, 0, 2);
    expect(chat).toHaveLength(1);
    expect(chat[0].mes).toBe('A\n\nC');
  });

  test('no-op when target is not a string', async () => {
    const chat = [{ mes: undefined }, msg('B')] as ChatMessage[];
    const { ctx, counts } = fakeCtx(chat);
    await mergeRange(ctx, 0, 1);
    expect(chat).toHaveLength(2);
    expect(counts.print).toBe(0);
    expect(counts.save).toBe(0);
  });
});

describe('applyParagraphSplit', () => {
  test('single bound', async () => {
    const m = msg('orig');
    const chat = [m];
    const { ctx, counts } = fakeCtx(chat);
    await applyParagraphSplit(ctx, 0, m, ['p0', 'p1', 'p2'], [1]);
    expect(chat).toHaveLength(2);
    expect(chat[0].mes).toBe('p0');
    expect(chat[1].mes).toBe('p1\n\np2');
    expect(counts.print).toBe(1);
    expect(counts.save).toBe(1);
  });

  test('multiple bounds', async () => {
    const m = msg('orig');
    const chat = [m];
    const { ctx } = fakeCtx(chat);
    await applyParagraphSplit(ctx, 0, m, ['p0', 'p1', 'p2'], [1, 2]);
    expect(chat).toHaveLength(3);
    expect(chat.map((c) => c.mes)).toEqual(['p0', 'p1', 'p2']);
  });

  test('unsorted bounds are sorted', async () => {
    const m = msg('orig');
    const chat = [m];
    const { ctx } = fakeCtx(chat);
    await applyParagraphSplit(ctx, 0, m, ['p0', 'p1', 'p2'], [2, 1]);
    expect(chat.map((c) => c.mes)).toEqual(['p0', 'p1', 'p2']);
  });

  test('new messages clone author and clear volatile fields', async () => {
    const m = msg('orig', { is_user: true, swipes: ['s'], extra: { token_count: 9 } });
    const chat = [m];
    const { ctx } = fakeCtx(chat);
    await applyParagraphSplit(ctx, 0, m, ['p0', 'p1'], [1]);
    expect(chat[1].is_user).toBe(true);
    expect(chat[1].name).toBe(m.name);
    expect(chat[1].swipes).toBeUndefined();
    expect(chat[1].extra?.token_count).toBeUndefined();
    expect(chat[0].swipes).toBeUndefined();
    expect(chat[0].extra?.token_count).toBeUndefined();
  });

  test('insertion respects messageId', async () => {
    const m = msg('orig');
    const chat = [msg('x'), msg('y'), m];
    const { ctx } = fakeCtx(chat);
    await applyParagraphSplit(ctx, 2, m, ['p0', 'p1'], [1]);
    expect(chat).toHaveLength(4);
    expect(chat[2].mes).toBe('p0');
    expect(chat[3].mes).toBe('p1');
  });
});
