/**
 * Types of interaction between two inline fragments with intersect ranges
 */
export enum IntersectType {
  /**
   * If two fragments of one tool intersect - merge into one fragment
   */
  Extend = 'extend',

  /**
   * If two new fragment intersect with existing - remove existing with new one
   */
  Replace = 'replace',

  /**
   * If two fragments of one tool intersect - treat them as two different fragments
   */
  LeaveBoth = 'leave-both'
}
