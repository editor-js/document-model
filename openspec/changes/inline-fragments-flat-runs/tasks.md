## 1. Regression and contract tests (against the current tree)

- [ ] 1.1 Add order-independence tests to `packages/model/src/entities/inline-text/TextNode/TextNode.integration.spec.ts` (the unit spec mocks the tree): `should return the same fragments when equal formatting is applied in a different order` (bold 0–2, italic 0–4, bold 2–4 vs bold 0–4, italic 0–4), `should merge fragments split by other formatting` (bold 0–3, italic 1–3, italic 3–6, bold 3–5 → bold 0–5, italic 1–6), `should return a single fragment when a tool is applied over an existing shorter fragment of another tool` (italic 1–3, bold 0–4), and `should return the same fragments when constructed with fragments in a different order`. Confirm they fail on the current implementation
- [ ] 1.2 Add fragment order tests: `should return a containing fragment before the contained one` and `should order fragments with equal ranges by tool name`
- [ ] 1.3 Add behaviour-preservation tests that pass on the current implementation: insertion inheritance (at the end of a formatted stretch, at index 0, after unformatted text, into empty text), range queries (partial overlap returns the whole fragment, touching fragments and empty ranges return nothing, filtering by tool), data replacement and the identical-data no-op, adjacent equal/different data, `removeText` inside formatting, removing all formatted text, `removeText` joining equal fragments, unformat restoring the previous state, zero-length format, and the validation errors
- [ ] 1.4 Commit the tests on their own so the implementation commit shows only the failing order-dependent cases turning green

## 2. Run model

- [ ] 2.1 Write failing tests for the private run helpers (`RunList/RunList.spec.ts`, `TextMark/TextMark.spec.ts`): `splitAt` (inside a run, on a boundary, at 0 and at the end), `merge` (equal neighbours joined, empty runs dropped, different data kept apart), and the fragment sweep (open/close on data change, maximal fragments, sort order)
- [ ] 2.2 Implement `TextMark` (immutable, `equals()` using `isSameInlineData`), `TextRun` (immutable data) and `RunList` (owns the runs and their invariants) classes under `inline-text/`, with mark equality only through `TextMark#equals`
- [ ] 2.3 Add a test-only `expectRunInvariants(runList)` helper (`RunList/runInvariants.testing.ts`, excluded from Stryker) checking no empty runs, no equal neighbours, one mark per tool and marks sorted by tool. Call it after every `RunList` spec and after every operation in the `RunList` random sequences (`RunList/RunList.random.spec.ts`). Keep `TextNode` free of test-only API

## 3. TextNode on runs

- [ ] 3.1 Rewrite `TextNode` to extend `EventBus` directly and store `#runs`: implement `length`, `getText`, `insertText`, `removeText`, `format`, `unformat`, `getFragments` and `serialized` as in design Decisions 2–5, dispatching the same events with the same payloads and keeping the current validation error messages
- [ ] 3.2 Make `format`/`unformat` return `void` and update their callers' types if needed (`BlockNode`)
- [ ] 3.3 Make the section 1 and 2 tests pass
- [ ] 3.4 Add the seeded random-sequence test (no new dependency, shared generator and reference model in `specs/randomOperations.testing.ts`, `TextNode/TextNode.random.spec.ts`): random `insertText`/`removeText`/`format`/`unformat` sequences compare text and fragments with a per-character reference model after every operation, then check that a `TextNode` rebuilt from `serialized` returns the same fragments, and that shuffling the serialized fragments before rebuilding gives the same result

## 4. Remove the tree

- [ ] 4.1 Delete `ParentInlineNode`, `FormattingInlineNode`, `TextInlineNode`, `InlineNode` and the `ParentNode`/`ChildNode` mixins with their mocks and specs, and remove their exports from `inline-text/index.ts`
- [ ] 4.2 Port `specs/InlineTree.integration.spec.ts` to the `TextNode` API as `specs/InlineFormatting.integration.spec.ts`, rewrite `TextNode/TextNode.spec.ts` without tree mocks, and drop the specs of the removed classes
- [ ] 4.3 Run the whole model test suite plus the `core`, `dom-adapters` and `collaboration-manager` suites, and fix anything that relied on the removed classes or on the old fragment order

## 5. Docs and wrap-up

- [ ] 5.1 Update `docs/model.md` (the `TextNode` bullet) and `docs/diagrams/model-tree-structure.mmd` (replace the `ParentInlineNode`/`FormattingInlineNode`/`TextInlineNode` classes with the run model) to describe runs
- [ ] 5.2 Run `yarn lint` for the touched packages and `test:mutations` for `@editorjs/model`; make sure the score stays above the threshold
- [ ] 5.3 Check formatting in the playground once by hand (overlapping bold/italic, undo/redo of formatting)
- [ ] 5.4 Run `openspec validate inline-fragments-flat-runs --type change` and make sure it passes

## 6. Review fixes

- [ ] 6.1 Write failing tests, then store empty data as no data in `TextMark`, so equal data can't serialize differently depending on operation order
- [ ] 6.2 Write failing tests, then make `TextMark` keep a deep copy of its data and `RunList#toFragments` return copies (`cloneInlineData` in `utils/`)
- [ ] 6.3 Write failing tests, then apply initial fragments in a total order (start, end descending, tool, data) so conflicting fragments load the same in any order
- [ ] 6.4 Extend the shared random generator with empty data for non-link tools and random, possibly conflicting, initial fragments loaded in shuffled order against the reference model
- [ ] 6.5 Cache `RunList#length`, drop the `#merge` call for inserting into an empty list, and fold `getFragments` filters into one predicate
