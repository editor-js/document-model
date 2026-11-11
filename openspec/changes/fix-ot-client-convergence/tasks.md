## 1. Tests

- [ ] 1.1 Add `packages/ot-server/src/convergence.spec.ts`, which drives two `OTClient`s against a real `DocumentManager`, with three failing tests: insert during an in-flight op, same-position inserts, and a queued op rebased against a remote insert
- [ ] 1.2 Add failing `OTClient` specs: sent operations carry the base revision taken from the handshake, acks and remote operations; an incoming operation is transformed against the in-flight one
- [ ] 1.3 Add failing `OperationsTransformer` specs for `againstIsLater` on text-insert ties and same-key value conflicts, and replace the spec pinning "against op has no revision → Neutral"
- [ ] 1.4 Add failing regression specs for concurrent inserts at different positions: an `OperationsTransformer` spec where an Insert of `abc` at 2 is transformed against an Insert of `Z` at 3 and keeps its position and payload, and a `convergence.spec.ts` case where both clients and the server end with `heabclZlo`
- [ ] 1.5 Add failing `DocumentManager` specs for `Neutral`: overlapping deletions from two clients leave the model as the first deletion left it, advance the revision by two and resolve both operations, and a later operation is still applied
- [ ] 1.6 Add failing `OTClient` specs: a `Neutral` remote operation advances the revision without calling `onRemoteOperation`, and a queued operation neutralized by rebasing is dropped instead of sent

## 2. Implementation

- [ ] 2.1 Thread `againstIsLater` through `Operation.transform`, `BatchedOperation.transform` and `OperationsTransformer`, and use it for the text-insert tie and the data last-writer-wins rule
- [ ] 2.2 In `OTClient`: set the revision from the handshake, ack (`rev + 1`) and remote operations (`rev + 1`); stamp it on sent operations; track the in-flight operation; transform incoming operations through in-flight then queued operations and rebase them
- [ ] 2.3 In `OperationsTransformer`, transform Insert against Insert by start position only (earlier shifts, later leaves it unchanged, tie follows `againstIsLater`) and stop merging the other payload; base the early-exit check in `#transformAgainstTextOperation` on the start position for Inserts instead of the effective range
- [ ] 2.4 In `DocumentManager`, treat `Neutral` as a no-op: skip the model, store it, advance the revision and resolve with it so `OTServer` broadcasts it
- [ ] 2.5 In `OTClient`, advance the revision for `Neutral` remote operations and drop queued operations that rebasing neutralizes
- [ ] 2.6 Remove the unused `#resolvedOperations`

## 3. Verify

- [ ] 3.1 `yarn build`, `yarn lint:ci`, `yarn test` for `collaboration-manager` and `ot-server`; flip the 1.4–1.6 specs to passing; update `docs/collaboration.md` where it describes the client steps; `openspec validate fix-ot-client-convergence --type change` passes
