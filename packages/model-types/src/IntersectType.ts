/** Describes how overlapping formatting ranges should be resolved */
export enum IntersectType {
  /** Extend the existing range */
  Extend = 'extend',
  /** Replace the existing range */
  Replace = 'replace',
  /** Keep both ranges */
  LeaveBoth = 'leave-both'
}
