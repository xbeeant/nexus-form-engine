// ============================================================================
// slider-doc — 滑块组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const sliderDoc: WidgetDoc = {
  id: 'slider',
  group: '选择类',
  title: '滑块',
  english: 'Slider',
  description:
    '拖动选择数值。props.min/max 声明取值范围、step 控制步长；range 切换双滑块范围模式；marks 展示刻度标记。',
  demos: [
    {
      title: '基础用法',
      description:
        'props.min / props.max 声明取值范围，step 控制步长；tooltip 控制是否显示数值气泡；keyboard 支持键盘微调。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          volume: {
            type: 'number',
            widget: 'slider',
            title: '音量',
            default: 60,
            props: { min: 0, max: 100, step: 5, tooltip: true },
          },
          opacity: {
            type: 'number',
            widget: 'slider',
            title: '透明度（无气泡）',
            default: 0.5,
            props: { min: 0, max: 1, step: 0.1, tooltip: false },
          },
        },
      },
    },
    {
      title: '范围模式与刻度',
      description:
        'range 开启双滑块，值以 [min, max] 数组保存；marks 以 JSON 声明刻度标签；included 控制选中区间是否填充。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          budget: {
            type: 'array',
            widget: 'slider',
            title: '预算范围',
            default: [2000, 8000],
            props: {
              range: true,
              min: 0,
              max: 10000,
              step: 500,
              marks: { 0: '0', 5000: '5k', 10000: '10k' },
            },
          },
          level: {
            type: 'number',
            widget: 'slider',
            title: '熟练度（刻度模式）',
            default: 3,
            props: {
              min: 1,
              max: 5,
              dots: true,
              marks: { 1: '初级', 3: '中级', 5: '专家' },
            },
          },
        },
      },
    },
  ],
};
