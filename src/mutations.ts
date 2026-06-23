import { default_avatar } from "./util.js";

/**
 * Chat-mutation primitives shared by the toolbar buttons and the slash commands.
 * Each mutates `ctx.chat` in place, then re-renders and persists.
 */

export async function applyParagraphSplit(
  ctx: STContext,
  messageId: number,
  msg: ChatMessage,
  segments: string[],
  bounds: number[],
  charOverrides?: (string | null)[],
): Promise<void> {
  const sorted = [...bounds].sort((a, b) => a - b);
  // region edges: 0, b1, b2, ..., bK, N  → K+1 regions
  const edges = [0, ...sorted, segments.length];
  const regions: string[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    regions.push(segments.slice(edges[i], edges[i + 1]).join('\n\n'));
  }

  // region 0 stays in the original message
  msg.mes = regions[0];
  delete msg.swipes;
  delete msg.swipe_id;
  delete msg.swipe_info;
  if (msg.extra) delete msg.extra.token_count;

  // remaining regions → new messages cloned from the original
  const newMsgs: ChatMessage[] = [];
  for (let i = 1; i < regions.length; i++) {
    const m = structuredClone(msg) as ChatMessage;
    m.mes = regions[i];
    delete m.swipes;
    delete m.swipe_id;
    delete m.swipe_info;
    if (m.extra) delete m.extra.token_count;
    // reattribution
    const override = charOverrides?.[i - 1];
    if (override === '__user__') {
      m.is_user = true;
      m.name = ctx.name1 || 'You';
      delete m.force_avatar;
      delete m.original_avatar;
    } else if (override && ctx.characters) {
      const ch = ctx.characters.find((c : Character) => c.avatar === override);
      if (ch) {
        m.name = ch.name;
        m.is_user = false;
        m.force_avatar = ch.avatar != "none" ? ctx.getThumbnailUrl("avatar", ch.avatar) : default_avatar;
      }
    }
    newMsgs.push(m);
  }
  ctx.chat.splice(messageId + 1, 0, ...newMsgs);

  await ctx.printMessages();
  await ctx.saveChat();
}

export async function mergeRange(ctx: STContext, lo: number, hi: number): Promise<void> {
  const target = ctx.chat[lo];
  if (!target || typeof target.mes !== 'string') return;

  const parts = [target.mes];
  for (let i = lo + 1; i <= hi; i++) {
    const m = ctx.chat[i];
    if (m && typeof m.mes === 'string') parts.push(m.mes);
  }
  target.mes = parts.join('\n\n');
  delete target.swipes;
  delete target.swipe_id;
  delete target.swipe_info;
  if (target.extra) delete target.extra.token_count;

  ctx.chat.splice(lo + 1, hi - lo);

  await ctx.printMessages();
  await ctx.saveChat();
}

// mirror of ST core stringToRange (not exposed via getContext); inclusive, start <= end
export function parseIdRange(input: string, min: number, max: number): { start: number; end: number } | null {
  let start: number;
  let end: number;
  if (input.includes('-')) {
    const parts = input.split('-');
    start = parts[0] ? parseInt(parts[0], 10) : NaN;
    end = parts[1] ? parseInt(parts[1], 10) : NaN;
  } else {
    start = end = parseInt(input, 10);
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < min || end > max) {
    return null;
  }
  return { start, end };
}
