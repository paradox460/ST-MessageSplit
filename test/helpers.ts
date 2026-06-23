// Shared fakes for the ST runtime globals the command handlers read at call time.
// The handlers read `SillyTavern.getContext()`, `toastr`, and `SillyTavern.libs.Fuse`
// fresh on each call, so install in `beforeEach` and remove in `afterEach`.

export interface FakeState {
  chat: ChatMessage[];
  printCalls: number;
  saveCalls: number;
}

export interface STMocks {
  state: FakeState;
  warnings: string[]; // every toastr.warning message, in order
  infos: string[]; // every toastr.info message, in order
  setFuseResults(results: Array<{ refIndex: number }>): void; // controls the next Fuse.search() return
}

interface MutableGlobals {
  SillyTavern?: {
    getContext(): { chat: ChatMessage[]; printMessages(): Promise<void>; saveChat(): Promise<void> };
    libs: { Fuse: STFuseConstructor };
  };
  toastr?: { info(msg: string): void; warning(msg: string): void };
}

export function installSTGlobals(chat: ChatMessage[]): STMocks {
  const state: FakeState = { chat, printCalls: 0, saveCalls: 0 };
  let fuseResults: STFuseResult[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];

  const ctx = {
    chat: state.chat,
    async printMessages(): Promise<void> {
      state.printCalls++;
    },
    async saveChat(): Promise<void> {
      state.saveCalls++;
    },
  };

  class FakeFuse implements STFuse {
    constructor(_list: string[], _opts?: object) {}
    search(_q: string): STFuseResult[] {
      return fuseResults;
    }
  }

  // `as unknown as` boundary cast: the real globals are read-only `const`
  // declarations; tests need to install and remove mutable fakes here.
  const g = globalThis as unknown as MutableGlobals;
  g.SillyTavern = { getContext: () => ctx, libs: { Fuse: FakeFuse } };
  g.toastr = {
    warning: (m: string) => {
      warnings.push(m);
    },
    info: (m: string) => {
      infos.push(m);
    },
  };

  return {
    state,
    warnings,
    infos,
    setFuseResults: (r) => {
      fuseResults = r.map((x) => ({ item: '', refIndex: x.refIndex }));
    },
  };
}

export function clearSTGlobals(): void {
  const g = globalThis as unknown as MutableGlobals;
  delete g.SillyTavern;
  delete g.toastr;
}

// Build a chat message with sensible defaults; override per test.
export function msg(mes: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { name: 'Bot', is_user: false, is_system: false, mes, ...extra };
}
