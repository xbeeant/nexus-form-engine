export const sliderSchema = {
  min: { type: 'number', widget: 'number', title: '最小值' },
  max: { type: 'number', widget: 'number', title: '最大值' },
  step: {
    type: 'number',
    widget: 'number',
    title: '步长',
    placeholder: '如 1',
  },
  dots: { type: 'boolean', widget: 'switch', title: '只显示刻度值' },
  reverse: { type: 'boolean', widget: 'switch', title: '反向' },
  vertical: { type: 'boolean', widget: 'switch', title: '垂直方向' },
};
