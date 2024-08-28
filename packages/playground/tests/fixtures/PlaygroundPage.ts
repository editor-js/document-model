import type { Locator, Page } from '@playwright/test';

/**
 * Playground page fixture to help access the page elements
 */
export class PlaygroundPage {
  private readonly inputLocator: Locator;
  private readonly textareaLocator: Locator;
  private readonly contenteditableLocator: Locator;

  /**
   * Sets locators for input, textarea and contenteditable elements
   *
   * @param page - Playwright page object
   */
  constructor(public readonly page: Page) {
    this.inputLocator = page.locator('input');
    this.textareaLocator = page.locator('textarea');
    this.contenteditableLocator = page.locator('[contenteditable]').first(); // hack to get the first contenteditable element
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
    return this.inputLocator;
  }

  /**
   * Returns the textarea locator
   */
  public get textarea(): Locator {
    return this.textareaLocator;
  }

  /**
   * Returns the contenteditable locator
   */
  public get contenteditable(): Locator {
    return this.contenteditableLocator;
  }
}
