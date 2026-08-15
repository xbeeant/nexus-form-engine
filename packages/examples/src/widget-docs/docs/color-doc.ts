// ============================================================================
// color-doc — 颜色选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const colorDoc: WidgetDoc = {
  id: 'color',
  group: '选择类',
  title: '颜色选择',
  english: 'ColorPicker',
  description:
    '颜色选择器。支持 HEX/RGB/HSB 三种输出格式、点击/悬停触发、透明度开关（disabledAlpha）与颜色值展示（showText）。',
  demos: [
    {
      title: '基础用法',
      description:
        'allowClear 允许清除颜色；showText 在选择器旁展示当前颜色值；default 设置初始颜色。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          themeColor: {
            type: 'string',
            widget: 'color',
            title: '主题色',
            default: '#1677ff',
            props: { showText: true, allowClear: true },
          },
          bgColor: {
            type: 'string',
            widget: 'color',
            title: '背景色',
            default: '#f5f5f5',
            props: { showText: true },
          },
        },
      },
    },
    {
      title: '格式与交互',
      description:
        'format 控制输出格式（hex/rgb/hsb）；trigger 切换点击/悬停触发面板；disabledAlpha 禁用透明度编辑。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          rgb: {
            type: 'string',
            widget: 'color',
            title: 'RGB 颜色',
            default: 'rgb(22, 119, 255)',
            props: { format: 'rgb', showText: true },
          },
          hoverPick: {
            type: 'string',
            widget: 'color',
            title: '悬停触发',
            default: '#52c41a',
            props: { trigger: 'hover', showText: true, disabledAlpha: true },
          },
        },
      },
    },
  ],
};
