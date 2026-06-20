import type { DocumentData } from './EditorDocument.js';

/** Payload for document change events containing the full document snapshot */
export interface ChangeData {
  /** Updated document data */
  data: DocumentData;
}
