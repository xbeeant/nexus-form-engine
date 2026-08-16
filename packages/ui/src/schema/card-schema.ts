import type { SchemaNode } from '@xbeeant/form-engine';

export const cardSchema: Record<string, SchemaNode> = {
  variant: {
    widget: 'select',
    props: {
      options: [
        { value: 'outlined', label: '带边框的' },
        { value: 'borderless', label: '无边框的' },
      ],
    },
    title: '形态变体',
  },
  hoverable: {
    widget: 'radio',
    title: '鼠标移过时可浮起',
    props: {
      options: [
        { value: true, label: '浮起' },
        { value: false, label: '不浮起' },
      ],
    },
  },
  size: {
    widget: 'select',
    title: '尺寸（size）',
    props: {
      options: [
        { value: 'small', label: '小' },
        { value: 'middle', label: '中' },
        { value: 'default', label: '默认' },
      ],
    },
  },
};
