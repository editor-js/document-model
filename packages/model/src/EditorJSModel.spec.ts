import { EditorJSModel } from './EditorJSModel.js';

describe('EditorJSModel', () => {
  it('should expose only the public API', () => {
    const allowedMethods = [
      'constructor',
      'length',
      'serialized',
      'properties',
      'getProperty',
      'setProperty',
      'addBlock',
      'updateTuneData',
      'updateValue',
      'removeBlock',
      'insertText',
      'removeText',
      'format',
      'unformat',
    ];
    const ownProperties = Object.getOwnPropertyNames(EditorJSModel.prototype);

    expect(ownProperties.sort()).toEqual(allowedMethods.sort());
  });
});
