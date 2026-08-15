export const spaceSchema = {
  direction: {
    type: 'string',
    widget: 'select',
    title: '方向（direction）',
    props: {
      options: [
        { value: 'horizontal', label: '水平' },
        { value: 'vertical', label: '垂直' },
      ],
    },
  },
  size: {
    type: 'string',
    widget: 'select',
    title: '间距（size）',
    props: {
      options: [
        { value: 'small', label: '小' },
        { value: 'middle', label: '中' },
        { value: 'large', label: '大' },
      ],
    },
  },
  align: {
    type: 'string',
    widget: 'select',
    title: '对齐（align）',
    props: {
      options: [
        { value: 'start', label: '顶部' },
        { value: 'center', label: '居中' },
        { value: 'end', label: '底部' },
        { value: 'baseline', label: '基线' },
      ],
    },
  },
  wrap: { type: 'boolean', widget: 'switch', title: '自动换行（wrap）' },
};
