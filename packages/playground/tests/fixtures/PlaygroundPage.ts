import type { Locator, Page } from '@playwright/test';

/**
 * Playground page fixture to help access the page elements
 */
export class PlaygroundPage {
  readonly #input: Locator;
  readonly #textarea: Locator;
  readonly #contenteditable: Locator;

  /**
   * Sets locators for input, textarea and contenteditable elements
   *
   * @param page - Playwright page object
   */
  constructor(public readonly page: Page) {
    this.#input = page.locator('input');
    this.#textarea = page.locator('textarea');
    this.#contenteditable = page.locator('[contenteditable]').first(); // hack to get the first contenteditable element
  }

  /**
   * Navigates to the playground page
   */
  public async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Returns the native input locator
   */
  public get input(): Locator {
    return this.#input;
  }

  /**
   * Returns the textarea locator
   */
  public get textarea(): Locator {
    return this.#textarea;
  }

  /**
   * Returns the contenteditable locator
   */
  public get contenteditable(): Locator {
    return this.#contenteditable;
  }
}
