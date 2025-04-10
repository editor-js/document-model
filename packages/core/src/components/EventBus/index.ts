import type { Event } from '@editorjs/sdk';

export type CoreEvent<Name extends string = string> = Event<'core', Name>;

export * from './core-events/index.js';
export * from './ui-events/index.js';
