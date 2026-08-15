// ============================================================================
// file-doc — 文件上传组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const fileDoc: WidgetDoc = {
  id: 'file',
  group: '文件图片',
  title: '文件上传',
  english: 'Upload',
  description:
    '文件上传组件。action 声明上传接口；支持多选、数量限制（maxCount）、类型过滤（accept）、图片卡片展示（listType）与拖拽上传（drag）。',
  demos: [
    {
      title: '基础用法',
      description:
        'action 指定上传接口地址；accept 过滤文件类型；maxCount 限制最大数量；multiple 允许多选。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          attachment: {
            type: 'array',
            widget: 'file',
            title: '附件',
            props: {
              action: '/api/upload',
              accept: '.pdf,.doc,image/*',
              multiple: true,
              maxCount: 5,
            },
          },
        },
      },
    },
    {
      title: '图片卡片与拖拽',
      description:
        'listType: "picture-card" 以卡片网格展示图片；drag 开启整块拖拽上传区域；buttonText 自定义上传按钮文案。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          screenshots: {
            type: 'array',
            widget: 'file',
            title: '截图（图片卡片）',
            props: {
              action: '/api/upload',
              listType: 'picture-card',
              accept: 'image/*',
              maxCount: 6,
              buttonText: '上传截图',
            },
          },
          bundle: {
            type: 'array',
            widget: 'file',
            title: '安装包（拖拽上传）',
            props: {
              action: '/api/upload',
              drag: true,
              multiple: true,
              buttonText: '拖拽或点击上传',
            },
          },
        },
      },
    },
  ],
};
