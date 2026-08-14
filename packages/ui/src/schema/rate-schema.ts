export const rateSchema = {
  count: {
    type: 'number',
    widget: 'number',
    title: '星数',
    props: { min: 1, max: 10 },
  },
  allowHalf: { type: 'boolean', widget: 'switch', title: '允许半选' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  character: {
    type: 'string',
    widget: 'input',
    title: '字符',
    placeholder: '如 ★',
  },
  tooltips: {
    type: 'string',
    widget: 'input',
    title: '每星提示文案',
    placeholder: '多个用逗号分隔，如 很差,较差,一般,满意,非常满意',
  },
  size: {
    type: 'string',
    widget: 'select',
    title: '尺寸（size）',
    props: {
      options: [
        { value: 'large', label: '大' },
        { value: 'middle', label: '中' },
        { value: 'small', label: '小' },
      ],
    },
  },
};
