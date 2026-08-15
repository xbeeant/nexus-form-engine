// ============================================================================
// switch-doc — 开关组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const switchDoc: WidgetDoc = {
  id: 'switch',
  group: '选择类',
  title: '开关',
  english: 'Switch',
  description:
    '布尔开关，值为 true/false。支持开关两侧文字（checkedChildren/unCheckedChildren）、加载态（loading）与尺寸切换。',
  demos: [
    {
      title: '基础用法',
      description:
        'checkedChildren / unCheckedChildren 在开/关两侧显示文字；default 设置默认开启。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          notify: {
            type: 'boolean',
            widget: 'switch',
            title: '消息通知',
            default: true,
            props: { checkedChildren: '开', unCheckedChildren: '关' },
          },
          darkMode: {
            type: 'boolean',
            widget: 'switch',
            title: '深色模式',
            props: { checkedChildren: '🌙', unCheckedChildren: '☀️' },
          },
          autoSave: {
            type: 'boolean',
            widget: 'switch',
            title: '自动保存',
            default: true,
          },
        },
      },
    },
    {
      title: '加载与尺寸',
      description:
        'loading 展示加载态；size 切换 small / middle / default 三种尺寸。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          saving: {
            type: 'boolean',
            widget: 'switch',
            title: '保存中（加载态）',
            props: { loading: true },
            bind: false,
          },
          small: {
            type: 'boolean',
            widget: 'switch',
            title: '小尺寸开关',
            props: { size: 'small' },
          },
          normal: {
            type: 'boolean',
            widget: 'switch',
            title: '默认尺寸开关',
            props: { size: 'default' },
          },
        },
      },
    },
  ],
};
