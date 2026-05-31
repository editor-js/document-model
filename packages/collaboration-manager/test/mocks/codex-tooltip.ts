/**
 * Minimal mock for codex-tooltip to avoid `window is not defined` in Jest (Node) environment.
 */
export default class Tooltip {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public show(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public hide(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onHover(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public destroy(): void {}
}
