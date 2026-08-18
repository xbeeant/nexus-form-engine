// ============================================================================
// voidTitle-doc — 无状态标题组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const voidTitleDoc: WidgetDoc = {
  id: 'voidTitle',
  group: '文件图片',
  title: '标题占位',
  english: 'VoidTitle',
  description:
    '纯展示标题，用于表单分区标题、提示文字等场景。标题内容直接写在字段的 title 上，配合 bind: false 不参与数据收集。',
  demos: [
    {
      title: '分区标题',
      description:
        'title 声明标题文本、description 补充说明；label: false 跳过 Form.Item 包裹（标题由组件自身渲染），bind: false 确保纯展示、不进入提交数据。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          sectionTitle: {
            type: 'string',
            widget: 'voidTitle',
            title: '一、基本信息',
            label: false,
            bind: false,
          },
          name: {
            type: 'string',
            widget: 'input',
            title: '姓名',
          },
          sectionTitle2: {
            type: 'string',
            widget: 'voidTitle',
            title: '二、联系方式',
            description: '请填写常用联系方式',
            label: false,
            bind: false,
          },
          phone: {
            type: 'string',
            widget: 'input',
            title: '手机号',
          },
        },
      },
    },
  ],
};
