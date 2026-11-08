## 1. Fix

- [x] 1.1 Add a failing `EditorDocument.modifyData()` test asserting `format()` receives the modified value's `data`
- [x] 1.2 Pass `data.value.data` through to `format()` in `EditorDocument.modifyData()`
- [x] 1.3 Run model tests and lint; `openspec validate fix-modify-data-inline-data --type change` passes
