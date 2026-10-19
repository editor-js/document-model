## Bug

Two clients editing concurrently end up with different documents, and the server ends up with a third. `packages/ot-server/src/convergence.spec.ts` reproduces it with two `OTClient`s and a real `DocumentManager`. Four defects combine:

- `OTClient` never puts a revision on the operations it sends. `Operation.rev` is unset on local operations, so the server's conflict filter (`op.rev >= undefined`) matches nothing, and the server applies every operation untransformed, in arrival order.
- The client's revision counter is off by one: it stores the last-seen history index, while the server expects the next one. It also ignores the revision in the handshake reply.
- An incoming operation is transformed against queued operations only, not against the one awaiting acknowledgement. Queued operations are never rebased against the incoming operation, and are later sent with a newer revision, so the server never rebases them either.
- Concurrent inserts at the same position both shift right, so each side orders them differently. The data-value last-writer-wins rule infers order from "the other operation has no revision", which stops holding once revisions are sent.

## Fix

- `OTClient` sends each operation with its base revision: the number of server operations the client has applied. It takes that number from the handshake reply, from every acknowledgement and from every remote operation.
- `OTClient` keeps the in-flight operation. An incoming operation is transformed through the in-flight operation and then each queued one, and each of those is rebased against it, so queued operations go out already accounting for it.
- `transform(against, againstIsLater = false)` makes the order explicit instead of inferring it from revisions. When `against` comes earlier (the default: server history, undo stacks, the open batch), the transformed operation shifts on a position tie and wins a same-key value conflict. When `against` comes later, it keeps its position and becomes `Neutral`. Only `OTClient` passes `true`, when it transforms an incoming operation against its own unacknowledged operations.
