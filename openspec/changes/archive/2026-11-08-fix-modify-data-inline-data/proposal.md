## Bug

`EditorDocument.modifyData()` calls `format()` with the tool but drops `data`. Since #169, re-applying a tool with `data: undefined` replaces the fragment's data, so a redo or a remote Modify op on a link wipes its `href` (and over a partial range splits the link into an href-less head and an href-bearing tail).

## Fix

Pass `(data.value as TextFormattedEventData).data` through to `format()`.
