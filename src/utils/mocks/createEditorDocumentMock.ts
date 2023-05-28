import { EditorDocument } from '../../entities/EditorDocument';

/**
 * Creates an EditorDocument object for tests.
 */
export function createEditorDocumentMock(): EditorDocument {
  return new EditorDocument({
    children: [],
    properties: {
      readOnly: false,
    },
  });
}
