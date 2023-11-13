import type { EditorDocument } from '../entities/index.js';

/**
 * Type for IoC Container instance — simple map with symbol keys
 */
type Container = Map<symbol, unknown>;

/**
 * Singletone IoC container to store EditorDocuments dependencies, for example ToolsRegistry and EventBus
 *
 * We need it to provide shared instances of dependencies for all model entities without passing them through the constructor
 *
 * @example
 * ```ts
 * import { IoCContainer } from './IoCContainer.js';
 *
 * const container = IoCContainer.of(document);
 *
 * container.set(TOOLS_REGISTRY, new ToolsRegistry());
 *
 * const registry = container.get(TOOLS_REGISTRY);
 * ```
 */
export class IoCContainer {
  /**
   * Map of containers for each document
   *
   * @private
   */
  static #containers = new WeakMap<EditorDocument, Container>();

  /**
   * Private constructor to prevent creating instances of the class
   *
   * @private
   */
  // Stryker disable next-line BlockStatement -- no way to kill this mutant
  private constructor() {
    /* istanbul ignore next */
    return;
  }

  /**
   * Returns container for the specified document
   *
   * @param document - document to get container for
   */
  public static of(document: EditorDocument): Container {
    if (!this.#containers.get(document)) {
      this.#containers.set(document, new Map());
    }

    return this.#containers.get(document) as Container;
  }
}
