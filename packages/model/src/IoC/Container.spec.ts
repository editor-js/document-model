import { IoCContainer } from './Container.js';
import { EditorDocument } from '../entities/index.js';

jest.mock('../entities/EditorDocument');

describe('IoCContainer', () => {
  it('should create a new container for document', function () {
    const document = new EditorDocument();
    const container = IoCContainer.of(document);

    expect(container).toBeDefined();
  });

  it('should return an existing container for document', function () {
    const document = new EditorDocument();
    const container = IoCContainer.of(document);

    expect(IoCContainer.of(document)).toBe(container);
  });
});
