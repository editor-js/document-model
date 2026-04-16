import { bem } from '@editorjs/helpers';

const className = bem('ejs-toolbar');

export const css = {
  toolbar: className(),
  actions: className('actions'),
  plusButton: className('plus-button'),
};
