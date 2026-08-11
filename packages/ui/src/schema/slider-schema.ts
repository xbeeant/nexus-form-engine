export const sliderSchema = {
  // 滑块的取值范围（props.min/max 为 UI 属性，可通过「Schema」标签页 JSON 编辑；
  // 校验约束 min/max 位于「校验配置」分区，schema 级并会自动转校验规则）
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
