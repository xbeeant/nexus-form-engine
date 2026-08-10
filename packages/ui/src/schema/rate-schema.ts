export const rateSchema = {
  count: {
    type: 'number',
    widget: 'number',
    title: '星数',
    props: { min: 1, max: 10 },
  },
  allowHalf: { type: 'boolean', widget: 'switch', title: '允许半选' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
};
