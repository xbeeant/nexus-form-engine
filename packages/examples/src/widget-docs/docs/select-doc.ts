// ============================================================================
// select-doc — 下拉选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const selectDoc: WidgetDoc = {
  id: 'select',
  group: '选择类',
  title: '下拉选择',
  english: 'Select',
  description:
    '下拉选择器。选项通过字段节点的 enum + enumNames 声明（x-render 风格），也支持搜索、清除、多选（配合 multiSelect 组件）等交互。',
  demos: [
    {
      title: '基础用法',
      description:
        'enum 声明选项值、enumNames 声明显示文案（省略时直接显示值）；allowClear 开启清除；required 必选。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          city: {
            type: 'string',
            widget: 'select',
            title: '所在城市',
            required: true,
            enum: ['beijing', 'shanghai', 'hangzhou', 'shenzhen'],
            enumNames: ['北京', '上海', '杭州', '深圳'],
            props: { allowClear: true },
          },
          level: {
            type: 'string',
            widget: 'select',
            title: '会员等级',
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            enumNames: ['青铜', '白银', '黄金', '铂金'],
          },
        },
      },
    },
    {
      title: '可搜索',
      description:
        'showSearch 开启搜索过滤；optionFilterProp 指定搜索匹配的字段（默认按 label 匹配）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          framework: {
            type: 'string',
            widget: 'select',
            title: '技术栈',
            props: { showSearch: true, optionFilterProp: 'label' },
            enum: ['react', 'vue', 'angular', 'svelte', 'solid', 'qwik'],
            enumNames: ['React', 'Vue', 'Angular', 'Svelte', 'SolidJS', 'Qwik'],
          },
          fruit: {
            type: 'string',
            widget: 'select',
            title: '水果（按值搜索）',
            props: { showSearch: true, optionFilterProp: 'value' },
            enum: ['apple', 'banana', 'cherry', 'durian', 'elderberry'],
          },
        },
      },
    },
    {
      title: '列表高度与同宽',
      description:
        'listHeight 控制下拉列表高度（选项过多时滚动）；popupMatchSelectWidth 控制下拉框是否与选择器同宽。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          country: {
            type: 'string',
            widget: 'select',
            title: '国家（长列表）',
            props: { showSearch: true, listHeight: 120 },
            enum: Array.from({ length: 24 }, (_, i) => `country-${i + 1}`),
            enumNames: Array.from(
              { length: 24 },
              (_, i) => `国家/地区选项 ${i + 1}`,
            ),
          },
          short: {
            type: 'string',
            widget: 'select',
            title: '简短选择',
            enum: ['a', 'b'],
            enumNames: ['选项 A', '选项 B'],
            props: { popupMatchSelectWidth: false },
          },
        },
      },
    },
  ],
};
