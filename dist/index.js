// src/segment.ts
function segmentParagraphs(raw) {
  const lines = raw.split(`
`);
  const segments = [];
  let current = [];
  let inFence = false;
  let fenceChar = "";
  const flush = () => {
    if (current.some((l) => l.trim() !== "")) {
      segments.push(current.join(`
`).trim());
    }
    current = [];
  };
  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      current.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return segments;
}

// src/util.ts
async function importFromUrl(url, what, defaultValue = null) {
  try {
    const module = await import(url);
    if (!Object.hasOwn(module, what)) {
      throw new Error(`No ${what} in module`);
    }
    return module[what];
  } catch (error) {
    console.error(`Failed to import ${what} from ${url}: ${error}`);
    return defaultValue;
  }
}
var default_avatar = await importFromUrl("/script.js", "default_avatar");

// src/mutations.ts
async function applyParagraphSplit(ctx, messageId, msg, segments, bounds, charOverrides) {
  const sorted = [...bounds].sort((a, b) => a - b);
  const edges = [0, ...sorted, segments.length];
  const regions = [];
  for (let i = 0;i < edges.length - 1; i++) {
    regions.push(segments.slice(edges[i], edges[i + 1]).join(`

`));
  }
  msg.mes = regions[0];
  delete msg.swipes;
  delete msg.swipe_id;
  delete msg.swipe_info;
  if (msg.extra)
    delete msg.extra.token_count;
  const newMsgs = [];
  for (let i = 1;i < regions.length; i++) {
    const m = structuredClone(msg);
    m.mes = regions[i];
    delete m.swipes;
    delete m.swipe_id;
    delete m.swipe_info;
    if (m.extra)
      delete m.extra.token_count;
    const override = charOverrides?.[i - 1];
    if (override === "__user__") {
      m.is_user = true;
      m.name = ctx.name1 || "You";
      delete m.force_avatar;
      delete m.original_avatar;
    } else if (override && ctx.characters) {
      const ch = ctx.characters.find((c) => c.avatar === override);
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
async function mergeRange(ctx, lo, hi) {
  const target = ctx.chat[lo];
  if (!target || typeof target.mes !== "string")
    return;
  const parts = [target.mes];
  for (let i = lo + 1;i <= hi; i++) {
    const m = ctx.chat[i];
    if (m && typeof m.mes === "string")
      parts.push(m.mes);
  }
  target.mes = parts.join(`

`);
  delete target.swipes;
  delete target.swipe_id;
  delete target.swipe_info;
  if (target.extra)
    delete target.extra.token_count;
  ctx.chat.splice(lo + 1, hi - lo);
  await ctx.printMessages();
  await ctx.saveChat();
}
function parseIdRange(input, min, max) {
  let start;
  let end;
  if (input.includes("-")) {
    const parts = input.split("-");
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

// src/session.ts
var activeSession = null;
function getActiveSession() {
  return activeSession;
}
function clearActiveSession() {
  activeSession = null;
}

class SplitSession {
  ctx;
  mesEl;
  messageId;
  msg;
  segments;
  members;
  mesText;
  originalHtml = "";
  rules = [];
  actions;
  dragging = null;
  onPointerMove = (e) => {
    if (!this.dragging)
      return;
    this.dragging.boundary = this.nearestBoundary(e.clientY, this.dragging);
    this.placeAllRules();
    this.refreshControls();
  };
  onPointerUp = (e) => {
    if (this.dragging) {
      try {
        this.dragging.handle.releasePointerCapture(e.pointerId);
      } catch {}
    }
    this.dragging = null;
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };
  constructor(ctx, mesEl, messageId, msg, segments, members) {
    this.ctx = ctx;
    this.mesEl = mesEl;
    this.messageId = messageId;
    this.msg = msg;
    this.segments = segments;
    this.members = members;
  }
  get targetId() {
    return this.messageId;
  }
  start() {
    const mesText = this.mesEl.querySelector(".mes_text");
    if (!mesText) {
      activeSession = null;
      return;
    }
    this.mesText = mesText;
    this.originalHtml = this.mesText.innerHTML;
    this.mesText.classList.add("mss-active");
    this.mesText.innerHTML = "";
    for (const segment of this.segments) {
      const seg = document.createElement("div");
      seg.className = "mss-seg";
      seg.innerHTML = this.ctx.messageFormatting(segment, this.msg.name, this.msg.is_system, this.msg.is_user, this.messageId);
      this.mesText.appendChild(seg);
    }
    this.addRule(1);
    this.actions = document.createElement("div");
    this.actions.className = "mss-actions";
    this.actions.innerHTML = '<div class="mss-confirm menu_button fa-solid fa-check interactable" title="Confirm split"></div>' + '<div class="mss-cancel menu_button fa-solid fa-xmark interactable" title="Cancel split"></div>';
    this.actions.querySelector(".mss-confirm").addEventListener("click", (e) => {
      e.stopPropagation();
      this.confirm();
    });
    this.actions.querySelector(".mss-cancel").addEventListener("click", (e) => {
      e.stopPropagation();
      this.cancel();
    });
    this.mesText.appendChild(this.actions);
    this.refreshControls();
  }
  createRule(boundary) {
    const el = document.createElement("div");
    el.className = "mss-rule";
    const userLabel = this.ctx.name1 || "You";
    let memberOpts = "";
    if (this.members) {
      memberOpts = this.members.map((c) => `<option value="${c.avatar}">${c.name}</option>`).join("");
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
  ${memberOpts ? `<optgroup label="Group members">${memberOpts}</optgroup>` : ""}
</select>
`;
    const handle = el.querySelector(".mss-handle");
    const addBtn = el.querySelector(".mss-add");
    const removeBtn = el.querySelector(".mss-remove");
    const selectEl = el.querySelector(".mss-member-select");
    const ref = { el, handle, addBtn, removeBtn, selectEl, boundary };
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dragging = ref;
      handle.setPointerCapture(e.pointerId);
      document.addEventListener("pointermove", this.onPointerMove);
      document.addEventListener("pointerup", this.onPointerUp);
    });
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.addBelow(ref);
    });
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeRule(ref);
    });
    selectEl.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    return ref;
  }
  placeAllRules() {
    const segs = Array.from(this.mesText.querySelectorAll(".mss-seg"));
    for (const r of [...this.rules].sort((a, b) => a.boundary - b.boundary)) {
      if (segs[r.boundary])
        this.mesText.insertBefore(r.el, segs[r.boundary]);
    }
  }
  refreshControls() {
    const max = this.segments.length - 1;
    const occupied = new Set(this.rules.map((r) => r.boundary));
    for (const r of this.rules) {
      r.removeBtn.toggleAttribute("hidden", this.rules.length <= 1);
      const target = r.boundary + 1;
      r.addBtn.toggleAttribute("hidden", target > max || occupied.has(target));
    }
  }
  nearestBoundary(clientY, self) {
    const segs = Array.from(this.mesText.querySelectorAll(".mss-seg"));
    const taken = new Set(this.rules.filter((r) => r !== self).map((r) => r.boundary));
    let best = self.boundary;
    let bestDist = Infinity;
    for (let g = 1;g < segs.length; g++) {
      if (taken.has(g))
        continue;
      const gapY = (segs[g - 1].getBoundingClientRect().bottom + segs[g].getBoundingClientRect().top) / 2;
      const dist = Math.abs(clientY - gapY);
      if (dist < bestDist) {
        bestDist = dist;
        best = g;
      }
    }
    return best;
  }
  addRule(boundary) {
    const ref = this.createRule(boundary);
    this.rules.push(ref);
    this.placeAllRules();
    return ref;
  }
  addBelow(ref) {
    const target = ref.boundary + 1;
    if (target > this.segments.length - 1)
      return;
    if (this.rules.some((r) => r.boundary === target))
      return;
    this.addRule(target);
    this.refreshControls();
  }
  removeRule(ref) {
    if (this.rules.length <= 1)
      return;
    ref.el.remove();
    this.rules = this.rules.filter((r) => r !== ref);
    this.refreshControls();
  }
  async confirm() {
    const pairs = this.rules.map((r) => ({
      boundary: r.boundary,
      override: r.selectEl.value || null
    }));
    pairs.sort((a, b) => a.boundary - b.boundary);
    const bounds = pairs.map((p) => p.boundary);
    const charOverrides = pairs.map((p) => p.override);
    activeSession = null;
    await applyParagraphSplit(this.ctx, this.messageId, this.msg, this.segments, bounds, charOverrides);
  }
  cancel() {
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
    if (this.mesText) {
      this.mesText.innerHTML = this.originalHtml;
      this.mesText.classList.remove("mss-active");
    }
    this.dragging = null;
    activeSession = null;
  }
}
function openSplitSession(ctx, mesEl, messageId, msg, segments) {
  let members = null;
  if (ctx.groupId && ctx.groups && ctx.characters) {
    const group = ctx.groups.find((g) => g.id === ctx.groupId);
    if (group) {
      const chars = ctx.characters;
      members = group.members.map((avatar) => chars.find((c) => c.avatar === avatar)).filter((c) => Boolean(c));
      if (members?.length === 0)
        members = null;
    }
  }
  activeSession = new SplitSession(ctx, mesEl, messageId, msg, segments, members);
  activeSession.start();
}

// src/buttons.ts
function onSplitButtonClick() {
  const ctx = SillyTavern.getContext();
  const mesEl = this.closest(".mes");
  if (!mesEl)
    return;
  const messageId = Number(mesEl.getAttribute("mesid"));
  if (!Number.isInteger(messageId))
    return;
  if (mesEl.querySelector(".edit_textarea")) {
    toastr.info("Finish editing before splitting.");
    return;
  }
  const active = getActiveSession();
  if (active) {
    const wasSameMessage = active.targetId === messageId;
    active.cancel();
    if (wasSameMessage)
      return;
  }
  const msg = ctx.chat[messageId];
  if (!msg || typeof msg.mes !== "string")
    return;
  const segments = segmentParagraphs(msg.mes);
  if (segments.length < 2) {
    toastr.info("Message has no paragraph breaks to split on.");
    return;
  }
  openSplitSession(ctx, mesEl, messageId, msg, segments);
}
async function onMergeButtonClick() {
  const ctx = SillyTavern.getContext();
  const mesEl = this.closest(".mes");
  if (!mesEl)
    return;
  const messageId = Number(mesEl.getAttribute("mesid"));
  if (!Number.isInteger(messageId))
    return;
  if (messageId <= 0) {
    toastr.warning("No previous message to merge into.");
    return;
  }
  if (mesEl.querySelector(".edit_textarea")) {
    toastr.warning("Finish editing before merging.");
    return;
  }
  getActiveSession()?.cancel();
  await mergeRange(ctx, messageId - 1, messageId);
}

// src/commands.ts
async function onMergeCommand(_named, unnamed) {
  const ctx = SillyTavern.getContext();
  const value = (Array.isArray(unnamed) ? unnamed.join("") : String(unnamed ?? "")).trim();
  let lo;
  let hi;
  if (!value) {
    if (ctx.chat.length < 2) {
      toastr.warning("No previous message to merge into.");
      return "";
    }
    lo = ctx.chat.length - 2;
    hi = ctx.chat.length - 1;
  } else {
    const range = parseIdRange(value, 0, ctx.chat.length - 1);
    if (!range) {
      toastr.warning(`Invalid message id or range: "${value}".`);
      return "";
    }
    if (range.start === range.end) {
      if (range.start <= 0) {
        toastr.warning("No previous message to merge into.");
        return "";
      }
      lo = range.start - 1;
      hi = range.start;
    } else {
      lo = range.start;
      hi = range.end;
    }
  }
  getActiveSession()?.cancel();
  await mergeRange(ctx, lo, hi);
  return "";
}
async function onSplitCommand(named, unnamed) {
  const ctx = SillyTavern.getContext();
  const query = (Array.isArray(unnamed) ? unnamed.join(" ") : String(unnamed ?? "")).trim();
  const msgArg = (named.msg ?? "").toString().trim();
  let messageId;
  if (msgArg) {
    messageId = Number(msgArg);
    if (!Number.isInteger(messageId) || messageId < 0 || messageId > ctx.chat.length - 1) {
      toastr.warning(`Invalid message id: "${msgArg}".`);
      return "";
    }
  } else {
    messageId = ctx.chat.length - 1;
    if (messageId < 0) {
      toastr.warning("No message to split.");
      return "";
    }
  }
  if (!query) {
    toastr.warning("Provide text to match the split point: /split msg=[id] <text>.");
    return "";
  }
  const msg = ctx.chat[messageId];
  if (!msg || typeof msg.mes !== "string")
    return "";
  const segments = segmentParagraphs(msg.mes);
  if (segments.length < 2) {
    toastr.warning("Message has no paragraph breaks to split on.");
    return "";
  }
  const { Fuse } = SillyTavern.libs;
  const fuse = new Fuse(segments, { includeScore: true });
  const results = fuse.search(query);
  if (results.length === 0) {
    toastr.warning(`No paragraph matches "${query}".`);
    return "";
  }
  const boundary = results[0].refIndex;
  if (boundary <= 0) {
    toastr.warning("Best-matching paragraph is the first; nothing to split before.");
    return "";
  }
  getActiveSession()?.cancel();
  await applyParagraphSplit(ctx, messageId, msg, segments, [boundary]);
  return "";
}
function registerCommands() {
  const ctx = SillyTavern.getContext();
  const { SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "merge",
    callback: onMergeCommand,
    returns: "nothing",
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({
        description: "message id (merge into previous) or range a-b (collapse a..b into a); omit to merge the last message into its ancestor",
        typeList: [ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.RANGE],
        isRequired: false
      })
    ],
    helpString: "<div>Merge messages. <code>/merge</code> merges the last message into its ancestor; <code>/merge 5</code> merges message 5 into 4; <code>/merge 2-5</code> collapses messages 2 through 5 into message 2.</div>"
  }));
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "split",
    callback: onSplitCommand,
    returns: "nothing",
    namedArgumentList: [
      SlashCommandNamedArgument.fromProps({
        name: "msg",
        description: "message id to split; defaults to the previous (most recent) message",
        typeList: [ARGUMENT_TYPE.NUMBER],
        isRequired: false
      })
    ],
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({
        description: "text to fuzzy-match the paragraph to split before",
        typeList: [ARGUMENT_TYPE.STRING],
        isRequired: true
      })
    ],
    helpString: "<div>Split a message before the paragraph best matching the text. <code>/split msg=3 the second part</code>; omit <code>msg</code> to split the most recent message.</div>"
  }));
}

// src/index.ts
function init() {
  if (document.querySelector("#message_template .mss_split_button"))
    return;
  const btn = document.createElement("div");
  btn.className = "mes_button mss_split_button fa-solid fa-scissors interactable";
  btn.title = "Split message";
  btn.setAttribute("data-i18n", "[title]Split message");
  const mesEdit = $("#message_template .mes_buttons .mes_edit");
  if (mesEdit.length) {
    mesEdit.before(btn);
  } else {
    $("#message_template .mes_buttons").append(btn);
  }
  const mergeBtn = document.createElement("div");
  mergeBtn.className = "mes_button mss_merge_button fa-solid fa-arrows-up-to-line interactable";
  mergeBtn.title = "Merge with previous message";
  mergeBtn.setAttribute("data-i18n", "[title]Merge with previous message");
  const mesEditForMerge = $("#message_template .mes_buttons .mes_edit");
  if (mesEditForMerge.length) {
    mesEditForMerge.before(mergeBtn);
  } else {
    $("#message_template .mes_buttons").append(mergeBtn);
  }
  $(document).on("click", ".mss_split_button", onSplitButtonClick);
  $(document).on("click", ".mss_merge_button", onMergeButtonClick);
  registerCommands();
  const ctx = SillyTavern.getContext();
  ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => {
    clearActiveSession();
  });
}
var ctx = SillyTavern.getContext();
ctx.eventSource.on(ctx.eventTypes.APP_READY, init);
