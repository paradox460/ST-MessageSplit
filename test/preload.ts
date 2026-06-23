import { mock } from 'bun:test';

// Mock util.ts to avoid the dynamic import of /script.js at module load time
mock.module(new URL('../src/util.ts', import.meta.url).href, () => ({
  default_avatar: '/default-avatar.png',
}));
