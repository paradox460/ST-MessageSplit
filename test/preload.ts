import { mock } from 'bun:test';

// Mock util.ts to avoid the dynamic import of /script.js at module load time
mock.module(new URL('../src/util.ts', import.meta.url).href, () => ({
  default_avatar: '/default-avatar.png',
  commonEnumProviders: { groupMembers: () => () => [] },
  enumIcons: { character: 'character' },
  SlashCommandEnumValue: class SlashCommandEnumValueStub {
    constructor(public description?: unknown, public title?: unknown, public type?: unknown, public icon?: unknown) {}
  },
}));
