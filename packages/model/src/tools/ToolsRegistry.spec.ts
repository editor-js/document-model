import { ToolsRegistry } from './ToolsRegistry.js';
import type { BlockToolName } from '../entities';

describe('ToolsRegistry', () => {
  describe('get()', () => {
    it('should call Map.get() method', () => {
      const spy = jest.spyOn(Map.prototype, 'get');
      const registry = new ToolsRegistry();
      const toolName = 'toolName' as BlockToolName;

      registry.get(toolName);

      expect(spy).toBeCalledWith(toolName);
    });
  });
});
