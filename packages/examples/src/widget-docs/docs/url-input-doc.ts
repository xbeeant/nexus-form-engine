// ============================================================================
// urlInput-doc — URL 输入框组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const urlInputDoc: WidgetDoc = {
  id: 'urlInput',
  group: '基础输入',
  title: 'URL 输入',
  english: 'UrlInput',
  description:
    '带 🔗 前缀的 URL 输入框，专用于链接类字段。可通过 validate.format 声明 URL 校验，提交时自动检查格式。',
  demos: [
    {
      title: '基础用法',
      description:
        'allowClear 开启清除按钮；maxLength 限制长度；placeholder 默认提示 https://。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          homepage: {
            type: 'string',
            widget: 'urlInput',
            title: '个人主页',
            placeholder: 'https://example.com',
            props: { allowClear: true, maxLength: 200 },
          },
          repo: {
            type: 'string',
            widget: 'urlInput',
            title: '仓库地址',
            placeholder: 'https://github.com/...',
          },
        },
      },
    },
    {
      title: 'URL 格式校验',
      description:
        "validate: { format: 'url' } 声明 URL 格式校验，不符合格式时实时提示错误。",
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          callback: {
            type: 'string',
            widget: 'urlInput',
            title: '回调地址',
            required: true,
            validate: { format: 'url' },
            placeholder: 'https://api.example.com/hook',
          },
          avatar: {
            type: 'string',
            widget: 'urlInput',
            title: '头像链接',
            validate: { format: 'url' },
            placeholder: 'https://',
          },
        },
      },
    },
  ],
};
