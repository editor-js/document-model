/**
 * Compares the non-modifier segment of a shortcut to the keydown event.
 * @param event - keydown event
 * @param token - uppercased key token from shortcut (last segment)
 */
function matchesKeyToken(event: KeyboardEvent, token: string): boolean {
  if (token.length === 1 && token >= 'A' && token <= 'Z') {
    return event.code === `Key${token}`;
  }

  if (token.length === 1 && token >= '0' && token <= '9') {
    return event.code === `Digit${token}`;
  }

  switch (token) {
    case 'ENTER':
      return event.code === 'Enter';
    case 'SPACE':
      return event.code === 'Space';
    case 'TAB':
      return event.code === 'Tab';
    case 'ESC':
    case 'ESCAPE':
      return event.code === 'Escape';
    default:
      return event.key.toUpperCase() === token;
  }
}

/**
 * Matches a native keydown event against an Editor.js style shortcut string (see
 * https://editorjs.io/inline-tools-api-1/#shortcut and codex.shortcuts format, e.g. CMD+B).
 * @param event - keydown event
 * @param shortcut - shortcut string like CMD+B or CTRL+SHIFT+Z
 */
export function matchKeyboardShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut
    .trim()
    .toUpperCase()
    .split('+')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (parts.length === 0) {
    return false;
  }

  const keyTokens: string[] = [];
  let expectCmd = false;
  let expectCtrl = false;
  let expectShift = false;
  let expectAlt = false;

  for (const part of parts) {
    if (part === 'CMD' || part === 'COMMAND') {
      expectCmd = true;
    } else if (part === 'CTRL' || part === 'CONTROL') {
      expectCtrl = true;
    } else if (part === 'SHIFT') {
      expectShift = true;
    } else if (part === 'ALT' || part === 'OPTION') {
      expectAlt = true;
    } else {
      keyTokens.push(part);
    }
  }

  if (keyTokens.length !== 1) {
    return false;
  }

  const keyToken = keyTokens[0];

  if (event.repeat) {
    return false;
  }

  if (event.altKey !== expectAlt) {
    return false;
  }

  if (event.shiftKey !== expectShift) {
    return false;
  }

  if (expectCmd && expectCtrl) {
    if (!event.metaKey || !event.ctrlKey) {
      return false;
    }
  } else if (expectCtrl && !expectCmd) {
    if (!event.ctrlKey) {
      return false;
    }
  } else if (expectCmd && !expectCtrl) {
    if (!(event.metaKey || event.ctrlKey)) {
      return false;
    }
  } else if (!expectCmd && !expectCtrl) {
    if (event.metaKey || event.ctrlKey) {
      return false;
    }
  }

  return matchesKeyToken(event, keyToken);
}
