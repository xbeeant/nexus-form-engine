export const numberSchema = {
  min: { type: 'number', widget: 'number', title: '最小值' },
  max: { type: 'number', widget: 'number', title: '最大值' },
  step: {
    type: 'number',
    widget: 'number',
    title: '步长',
    placeholder: '如 1',
  },
  precision: {
    type: 'number',
    widget: 'number',
    title: '小数位数',
    props: { min: 0, max: 10 },
  },
  addonBefore: {
    type: 'string',
    widget: 'input',
    title: '前缀标签',
    placeholder: '如 ¥',
  },
  addonAfter: {
    type: 'string',
    widget: 'input',
    title: '后缀标签',
    placeholder: '如 元',
  },
  controls: { type: 'boolean', widget: 'switch', title: '显示增减按钮' },
};
