export const radioSchema = {
  options: { widget: 'simpleList', title: '选项' },
  optionType: {
    type: 'string',
    widget: 'select',
    title: '选项类型',
    props: {
      options: [
        { value: 'default', label: '默认' },
        { value: 'button', label: '按钮' },
      ],
    },
  },
  buttonStyle: {
    type: 'string',
    widget: 'select',
    title: '按钮样式',
    props: {
      options: [
        { value: 'outline', label: '描边' },
        { value: 'solid', label: '实心' },
      ],
    },
  },
};
