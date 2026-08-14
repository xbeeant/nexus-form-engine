export const colorSchema = {
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  showText: { type: 'boolean', widget: 'switch', title: '显示颜色值' },
  format: {
    type: 'string',
    widget: 'select',
    title: '颜色格式',
    props: {
      options: [
        { value: 'hex', label: 'HEX' },
        { value: 'rgb', label: 'RGB' },
        { value: 'hsb', label: 'HSB' },
      ],
    },
  },
  trigger: {
    type: 'string',
    widget: 'select',
    title: '触发方式',
    props: {
      options: [
        { value: 'click', label: '点击' },
        { value: 'hover', label: '悬停' },
      ],
    },
  },
  disabledAlpha: { type: 'boolean', widget: 'switch', title: '禁用透明度' },
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
