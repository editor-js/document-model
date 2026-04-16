import { bem } from '@editorjs/helpers';

const blocksClassName = bem('ejs-blocks');

export const blocksCss = {
  blocks: blocksClassName(),
};

const blockClassName = bem('ejs-block');

export const blockCss = {
  block: blockClassName(),
  contents: blockClassName('contents'),
};
