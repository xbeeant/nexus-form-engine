// ============================================================================
// card-doc — 卡片布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const cardDoc: WidgetDoc = {
  id: 'card',
  group: '布局',
  title: '卡片',
  english: 'Card',
  description:
    '卡片容器，将一组字段分组展示。卡片 Key 为布局 Key，不进入 formData 数据路径（字段路径透传父路径）。',
  demos: [
    {
      title: '分组卡片',
      description:
        'type: "card" + properties 声明卡片容器；title 为卡片标题。card 内的字段路径直接是根级（如 profile.name，而非 card.profile.name）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          basicCard: {
            type: 'card',
            title: '基本信息',
            properties: {
              name: { type: 'string', widget: 'input', title: '姓名' },
              email: {
                type: 'string',
                widget: 'input',
                title: '邮箱',
                placeholder: 'name@example.com',
              },
            },
          },
          contactCard: {
            type: 'card',
            title: '联系方式',
            properties: {
              phone: { type: 'string', widget: 'input', title: '手机号' },
              address: {
                type: 'string',
                widget: 'textarea',
                title: '地址',
              },
            },
          },
        },
      },
    },
    {
      title: '形态变体',
      description:
        'props.variant 切换带边框（outlined）/无边框（borderless）；hoverable 鼠标移过浮起。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          borderlessCard: {
            type: 'card',
            title: '无边框卡片',
            props: { variant: 'borderless' },
            properties: {
              company: { type: 'string', widget: 'input', title: '公司' },
              title: { type: 'string', widget: 'input', title: '职位' },
            },
          },
          hoverCard: {
            type: 'card',
            title: '悬浮卡片',
            props: { hoverable: true, size: 'small' },
            properties: {
              skill: { type: 'string', widget: 'input', title: '技能' },
            },
          },
        },
      },
    },
  ],
};
