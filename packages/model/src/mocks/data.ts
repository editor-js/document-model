// Stryker disable all
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { EditorDocumentSerialized } from '../entities/EditorDocument/types/index.js';
import { createBlockId } from '../entities/BlockNode/types/BlockId.js';

export const data: EditorDocumentSerialized = {
  identifier: 'document',
  properties: {},
  blocks: [
    {
      id: createBlockId('block-mock-1'),
      name: 'header',
      data: {
        text: {
          $t: 't',
          value: 'Editor.js',
        },
        level: 1,
      },
    },
    {
      id: createBlockId('block-mock-2'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'Hey. Meet the new Editor. On this page you can see it in action — try to edit this text. Source code of the page contains the example of connection and configuration.',
        },
      },
    },
    {
      id: createBlockId('block-mock-3'),
      name: 'header',
      data: {
        text: {
          $t: 't',
          value: 'Key features',
        },
        level: 2,
      },
    },
    {
      id: createBlockId('block-mock-4'),
      name: 'list',
      data: {
        items: [
          {
            content: {
              $t: 't',
              value: 'It is a block-styled editor',
            },
            items: [],
          },
          {
            content: {
              $t: 't',
              value: 'It returns clean data output in JSON',
            },
            items: [],
          },
          {
            content: {
              $t: 't',
              value: 'Designed to be extendable and pluggable with a simple API',
            },
            items: [],
          },
        ],
        style: 'unordered',
      },
    },
    {
      id: createBlockId('block-mock-5'),
      name: 'header',
      data: {
        text: {
          $t: 't',
          value: 'What does it mean «block-styled editor»',
        },
        level: 2,
      },
    },
    {
      id: createBlockId('block-mock-6'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'Workspace in classic editors is made of a single contenteditable element, used to create different HTML markups. Editor.js workspace consists of separate Blocks: paragraphs, headings, images, lists, quotes, etc. Each of them is an independent contenteditable element (or more complex structure) provided by Plugin and united by Editor\'s Core.',
          fragments: [
            {
              type: 'marker',
              range: [123, 210],
            },
          ],
        },
      },
    },
    {
      id: createBlockId('block-mock-7'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: `There are dozens of ready-to-use Blocks and the simple API for creation any Block you need. For example, you can implement Blocks for Tweets, Instagram posts, surveys and polls, CTA-buttons and even games.`,
          fragments: [
            {
              type: 'link',
              range: [20, 39],
              data: {
                url: 'https://github.com/editor-js',
              },
            },
            {
              type: 'link',
              range: [48, 58],
              data: {
                url: 'https://editorjs.io/creating-a-block-tool',
              },
            },
          ],
        },
      },
    },
    {
      id: createBlockId('block-mock-8'),
      name: 'header',
      data: {
        text: {
          $t: 't',
          value: 'What does it mean clean data output',
        },
        level: 2,
      },
    },
    {
      id: createBlockId('block-mock-9'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'Classic WYSIWYG-editors produce raw HTML-markup with both content data and content appearance. On the contrary, Editor.js outputs JSON object with data of each Block. You can see an example below',
        },
      },
    },
    {
      id: createBlockId('block-mock-10'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'Given data can be used as you want: render with HTML for Web clients, render natively for mobile apps, create markup for Facebook Instant Articles or Google AMP, generate an audio version and so on.',
          fragments: [
            {
              type: 'code',
              range: [57, 68],
            },
            {
              type: 'code',
              range: [90, 101],
            },
            {
              type: 'code',
              range: [121, 146],
            },
            {
              type: 'code',
              range: [150, 160],
            },
            {
              type: 'code',
              range: [174, 187],
            },
          ],
        },
      },
    },
    {
      id: createBlockId('block-mock-11'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'Clean data is useful to sanitize, validate and process on the backend.',
        },
      },
    },
    {
      id: createBlockId('block-mock-12'),
      name: 'delimiter',
      data: {},
    },
    {
      id: createBlockId('block-mock-13'),
      name: 'paragraph',
      data: {
        text: {
          $t: 't',
          value: 'We have been working on this project more than three years. Several large media projects help us to test and debug the Editor, to make its core more stable. At the same time we significantly improved the API. Now, it can be used to create any plugin for any task. Hope you enjoy. 😏',
        },
      },
    },
    {
      id: createBlockId('block-mock-14'),
      name: 'image',
      data: {
        url: 'assets/codex2x.png',
        caption: '',
        stretched: false,
        withBorder: true,
        withBackground: false,
      },
    },
  ],
};
