## 1. Tests

- [ ] 1.1 Keep `packages/ot-server/src/convergence.spec.ts` (two clients and a real `DocumentManager`: insert during an in-flight op, same-position inserts, queued op rebased against a remote insert), currently failing
- [ ] 1.2 Add failing `OTClient` specs: sent operations carry the base revision taken from the handshake, acks and remote operations; an incoming operation is transformed against the in-flight one
- [ ] 1.3 Add failing `OperationsTransformer` specs for `againstIsLater` on text-insert ties and same-key value conflicts, and replace the spec pinning "against op has no revision → Neutral"

## 2. Implementation

- [ ] 2.1 Thread `againstIsLater` through `Operation.transform`, `BatchedOperation.transform` and `OperationsTransformer`, and use it for the text-insert tie and the data last-writer-wins rule
- [ ] 2.2 In `OTClient`: set the revision from the handshake, ack (`rev + 1`) and remote operations (`rev + 1`); stamp it on sent operations; track the in-flight operation; transform incoming operations through in-flight then queued operations and rebase them
- [ ] 2.3 Remove the unused `#resolvedOperations`

## 3. Verify

- [ ] 3.1 `yarn build`, `yarn lint:ci`, `yarn test` for `collaboration-manager` and `ot-server`; update `docs/collaboration.md` where it describes the client steps; `openspec validate fix-ot-client-convergence --type change` passes
