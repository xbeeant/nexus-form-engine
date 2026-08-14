export const switchSchema = {
  checkedChildren: {
    type: 'string',
    widget: 'input',
    title: '开启文字',
    placeholder: '如 开',
  },
  unCheckedChildren: {
    type: 'string',
    widget: 'input',
    title: '关闭文字',
    placeholder: '如 关',
  },
  loading: { type: 'boolean', widget: 'switch', title: '加载中' },
  size: {
    type: 'string',
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
