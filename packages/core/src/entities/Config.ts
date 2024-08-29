import type { CoreConfig } from '@editorjs/sdk';

/**
 * After validation we can be sure that all required fields are set
 */
export type CoreConfigValidated = Required<CoreConfig>;
