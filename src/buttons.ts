import { segmentParagraphs } from './segment';
import { mergeRange } from './mutations';
import { getActiveSession, openSplitSession } from './session';

export function onSplitButtonClick(this: HTMLElement): void {
  const ctx = SillyTavern.getContext();
  const mesEl = this.closest('.mes') as HTMLElement | null;
  if (!mesEl) return;
  const messageId = Number(mesEl.getAttribute('mesid'));
  if (!Number.isInteger(messageId)) return;

  if (mesEl.querySelector('.edit_textarea')) {
    toastr.info('Finish editing before splitting.');
    return;
  }

  const active = getActiveSession();
  if (active) {
    const wasSameMessage = active.targetId === messageId;
    active.cancel();
    if (wasSameMessage) return;
  }

  const msg = ctx.chat[messageId];
  if (!msg || typeof msg.mes !== 'string') return;

  const segments = segmentParagraphs(msg.mes);
  if (segments.length < 2) {
    toastr.info('Message has no paragraph breaks to split on.');
    return;
  }

  openSplitSession(ctx, mesEl, messageId, msg, segments);
}

export async function onMergeButtonClick(this: HTMLElement): Promise<void> {
  const ctx = SillyTavern.getContext();
  const mesEl = this.closest('.mes') as HTMLElement | null;
  if (!mesEl) return;
  const messageId = Number(mesEl.getAttribute('mesid'));
  if (!Number.isInteger(messageId)) return;

  if (messageId <= 0) {
    toastr.warning('No previous message to merge into.');
    return;
  }

  if (mesEl.querySelector('.edit_textarea')) {
    toastr.warning('Finish editing before merging.');
    return;
  }

  // a split session leaves the DOM re-rendered and holds stale indices; clear it first
  getActiveSession()?.cancel();

  await mergeRange(ctx, messageId - 1, messageId);
}
