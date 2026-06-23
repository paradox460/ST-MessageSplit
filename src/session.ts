import { applyParagraphSplit } from './mutations';

/**
 * The single interactive split overlay currently mounted, or `null`.
 * Owned here because the buttons, commands, and the CHAT_CHANGED reset all
 * need to observe/cancel whatever session is live.
 */
let activeSession: SplitSession | null = null;

export function getActiveSession(): SplitSession | null {
  return activeSession;
}

export function clearActiveSession(): void {
  activeSession = null;
}

interface RuleRef {
  el: HTMLElement;       // the .mss-rule element (moved, never recreated, during drag)
  handle: HTMLElement;   // .mss-handle inside el
  addBtn: HTMLElement;   // .mss-add
  removeBtn: HTMLElement; // .mss-remove
  selectEl: HTMLSelectElement; // author re-attribution dropdown
  boundary: number;      // segment index this rule sits BEFORE; in [1, segments.length-1]
}

export class SplitSession {
  private mesText!: HTMLElement;
  private originalHtml = '';
  private rules: RuleRef[] = [];
  private actions!: HTMLElement;
  private dragging: RuleRef | null = null;

  private readonly onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging.boundary = this.nearestBoundary(e.clientY, this.dragging);
    this.placeAllRules();
    this.refreshControls();
  };
  private readonly onPointerUp = (e: PointerEvent) => {
    if (this.dragging) {
      try {
        this.dragging.handle.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
    }
    this.dragging = null;
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  };

  constructor(
    private readonly ctx: STContext,
    private readonly mesEl: HTMLElement,
    private readonly messageId: number,
    private readonly msg: ChatMessage,
    private readonly segments: string[],
    private readonly members: Character[] | null,
  ) {}

  get targetId(): number {
    return this.messageId;
  }

  start(): void {
    const mesText = this.mesEl.querySelector('.mes_text') as HTMLElement | null;
    if (!mesText) {
      activeSession = null;
      return;
    }
    this.mesText = mesText;
    this.originalHtml = this.mesText.innerHTML;
    this.mesText.classList.add('mss-active');
    this.mesText.innerHTML = '';

    for (const segment of this.segments) {
      const seg = document.createElement('div');
      seg.className = 'mss-seg';
      seg.innerHTML = this.ctx.messageFormatting(
        segment, this.msg.name, this.msg.is_system, this.msg.is_user, this.messageId,
      );
      this.mesText.appendChild(seg);
    }

    // initial single divider at the TOP-most valid split (between segment 0 and 1)
    this.addRule(1);

    // sticky confirm/cancel panel, appended once at the bottom of the message body
    this.actions = document.createElement('div');
    this.actions.className = 'mss-actions';
    this.actions.innerHTML =
      '<div class="mss-confirm menu_button fa-solid fa-check interactable" title="Confirm split"></div>'
            + '<div class="mss-cancel menu_button fa-solid fa-xmark interactable" title="Cancel split"></div>';
    (this.actions.querySelector('.mss-confirm') as HTMLElement).addEventListener('click', (e) => {
      e.stopPropagation();
      void this.confirm();
    });
    (this.actions.querySelector('.mss-cancel') as HTMLElement).addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancel();
    });
    this.mesText.appendChild(this.actions);
    this.refreshControls();
  }

  private createRule(boundary: number): RuleRef {
    const el = document.createElement('div');
    el.className = 'mss-rule';

    const userLabel = this.ctx.name1 || 'You';
    let memberOpts = '';
    if (this.members) {
      memberOpts = this.members.map(
        (c) => `<option value="${c.avatar}">${c.name}</option>`,
      ).join('');
    }

    el.innerHTML = `
<div class="mss-rule-btns">
  <div class="mss-add fa-solid fa-plus interactable" title="Add divider below"></div>
  <div class="mss-remove fa-solid fa-minus interactable" title="Remove divider"></div>
</div>
<div class="mss-handle fa-solid fa-grip-lines" title="Drag to choose split point"></div>
<select class="mss-member-select">
  <optgroup label="Split as...">
    <option value="" selected>No Change</option>
    <option value="__user__">${userLabel}</option>
  </optgroup>
  ${memberOpts ? `<optgroup label="Group members">${memberOpts}</optgroup>` : ''}
</select>
`;
    const handle = el.querySelector('.mss-handle') as HTMLElement;
    const addBtn = el.querySelector('.mss-add') as HTMLElement;
    const removeBtn = el.querySelector('.mss-remove') as HTMLElement;
    const selectEl = el.querySelector('.mss-member-select') as HTMLSelectElement;
    const ref: RuleRef = { el, handle, addBtn, removeBtn, selectEl, boundary };

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.dragging = ref;
      handle.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', this.onPointerMove);
      document.addEventListener('pointerup', this.onPointerUp);
    });
    addBtn.addEventListener('click', (e) => { e.stopPropagation(); this.addBelow(ref); });
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.removeRule(ref); });
    selectEl.addEventListener("click", (e) => { e.stopPropagation(); });
    return ref;
  }

  private placeAllRules(): void {
    const segs = Array.from(this.mesText.querySelectorAll('.mss-seg')) as HTMLElement[];
    for (const r of [...this.rules].sort((a, b) => a.boundary - b.boundary)) {
      if (segs[r.boundary]) this.mesText.insertBefore(r.el, segs[r.boundary]);
    }
  }

  // show "-" only when more than one divider exists; show "+" only when the slot
  // one paragraph below is a valid, unoccupied boundary.
  private refreshControls(): void {
    const max = this.segments.length - 1;
    const occupied = new Set(this.rules.map((r) => r.boundary));
    for (const r of this.rules) {
      r.removeBtn.toggleAttribute('hidden', this.rules.length <= 1);
      const target = r.boundary + 1;
      r.addBtn.toggleAttribute('hidden', target > max || occupied.has(target));
    }
  }

  // nearest gap to clientY, excluding gaps held by OTHER rules (self may stay put).
  private nearestBoundary(clientY: number, self: RuleRef): number {
    const segs = Array.from(this.mesText.querySelectorAll('.mss-seg')) as HTMLElement[];
    const taken = new Set(this.rules.filter((r) => r !== self).map((r) => r.boundary));
    let best = self.boundary;
    let bestDist = Infinity;
    for (let g = 1; g < segs.length; g++) {
      if (taken.has(g)) continue;
      const gapY = (segs[g - 1].getBoundingClientRect().bottom + segs[g].getBoundingClientRect().top) / 2;
      const dist = Math.abs(clientY - gapY);
      if (dist < bestDist) {
        bestDist = dist;
        best = g;
      }
    }
    return best;
  }

  private addRule(boundary: number): RuleRef {
    const ref = this.createRule(boundary);
    this.rules.push(ref);
    this.placeAllRules();
    return ref;
  }

  // "+" on a divider adds a new divider one paragraph below it.
  private addBelow(ref: RuleRef): void {
    const target = ref.boundary + 1;
    if (target > this.segments.length - 1) return;            // no room below
    if (this.rules.some((r) => r.boundary === target)) return; // already a divider there
    this.addRule(target);
    this.refreshControls();
  }

  // "-" removes the clicked divider; never removes the last remaining one.
  private removeRule(ref: RuleRef): void {
    if (this.rules.length <= 1) return;
    ref.el.remove();
    this.rules = this.rules.filter((r) => r !== ref);
    this.refreshControls();
  }

  async confirm(): Promise<void> {
    const pairs = this.rules.map((r) => ({
      boundary: r.boundary,
      override: r.selectEl.value || null,
    }));
    pairs.sort((a, b) => a.boundary - b.boundary);
    const bounds = pairs.map((p) => p.boundary);
    const charOverrides = pairs.map((p) => p.override);
    activeSession = null;
    await applyParagraphSplit(this.ctx, this.messageId, this.msg, this.segments, bounds, charOverrides);
  }

  cancel(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    if (this.mesText) {
      this.mesText.innerHTML = this.originalHtml;
      this.mesText.classList.remove('mss-active');
    }
    this.dragging = null;
    activeSession = null;
  }
}

/** Mount a fresh interactive split overlay and record it as the active session. */
export function openSplitSession(
  ctx: STContext,
  mesEl: HTMLElement,
  messageId: number,
  msg: ChatMessage,
  segments: string[],
): void {
  let members: Character[] | null = null;
  if (ctx.groupId && ctx.groups && ctx.characters) {
    const group = ctx.groups.find(g => g.id === ctx.groupId);
    if (group) {
      const chars = ctx.characters;
      members = group.members
        .map((avatar: string) => chars.find((c) => c.avatar === avatar))
        .filter((c: Character): c is Character => Boolean(c));
      if (members?.length === 0) members = null;
    }
  }
  activeSession = new SplitSession(ctx, mesEl, messageId, msg, segments, members);
  activeSession.start();
}
