// ============================================================================
// tabs-doc — 标签页布局组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const tabsDoc: WidgetDoc = {
  id: 'tabs',
  group: '布局',
  title: '标签页',
  english: 'Tabs',
  description:
    '标签页容器，将字段按面板分组。子节点为 tabPane（title 即标签名），各面板字段路径透传、互不冲突。布局 Key 不进入数据路径。',
  demos: [
    {
      title: '基础用法',
      description:
        'tabs 下挂 tabPane 面板；每个面板的 title 显示为标签；面板内字段路径直接为根级（如 email 而非 accountPane.email）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          settingsTabs: {
            type: 'tabs',
            properties: {
              accountPane: {
                type: 'tabPane',
                title: '账户设置',
                properties: {
                  email: {
                    type: 'string',
                    widget: 'input',
                    title: '邮箱',
                    placeholder: 'name@example.com',
                  },
                  phone: {
                    type: 'string',
                    widget: 'input',
                    title: '手机号',
                  },
                },
              },
              privacyPane: {
                type: 'tabPane',
                title: '隐私设置',
                properties: {
                  publicProfile: {
                    type: 'boolean',
                    widget: 'switch',
                    title: '公开个人资料',
                  },
                  showEmail: {
                    type: 'boolean',
                    widget: 'checkbox',
                    title: '在个人页显示邮箱',
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      title: '多面板分组',
      description:
        '三个及以上面板分组展示复杂表单，每面板聚焦一类信息。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          profileTabs: {
            type: 'tabs',
            properties: {
              basic: {
                type: 'tabPane',
                title: '基本信息',
                properties: {
                  name: { type: 'string', widget: 'input', title: '姓名' },
                  gender: {
                    type: 'string',
                    widget: 'radio',
                    title: '性别',
                    enum: ['male', 'female'],
                    enumNames: ['男', '女'],
                  },
                },
              },
              contact: {
                type: 'tabPane',
                title: '联系方式',
                properties: {
                  email: {
                    type: 'string',
                    widget: 'input',
                    title: '邮箱',
                  },
                  address: {
                    type: 'string',
                    widget: 'textarea',
                    title: '地址',
                  },
                },
              },
              billing: {
                type: 'tabPane',
                title: '结算信息',
                properties: {
                  cardType: {
                    type: 'string',
                    widget: 'select',
                    title: '卡类型',
                    enum: ['visa', 'master'],
                    enumNames: ['Visa', 'MasterCard'],
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
    { name: 'title', description: '面板标题（写在 tabPane 子节点上）', type: 'string', defaultValue: '-' },
  ],
};