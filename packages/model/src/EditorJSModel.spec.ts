import { EditorJSModel } from './EditorJSModel.js';

describe('EditorJSModel', () => {
  it('should expose only the public API', () => {
    const allowedMethods = [
      'constructor',
      'length',
      'serialized',
      'properties',
      'getProperty',
      'initializeDocument',
      'setProperty',
      'addBlock',
      'insertData',
      'removeData',
      'updateTuneData',
      'updateValue',
      'removeBlock',
      'moveBlock',
      'insertText',
      'removeText',
      'format',
      'unformat',
      'getFragments',
      'createCaret',
      'updateCaret',
      'removeCaret',
    ];
    const ownProperties = Object.getOwnPropertyNames(EditorJSModel.prototype);

    expect(ownProperties.sort()).toEqual(allowedMethods.sort());
  });
});
