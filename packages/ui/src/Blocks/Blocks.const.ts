import { bem } from '@editorjs/helpers';

const blocksClassName = bem('blocks');

export const blocksCss = {
  blocks: blocksClassName(),
};

const blockClassName = bem('block');

export const blockCss = {
  block: blockClassName(),
  contents: blockClassName('contents'),
};
