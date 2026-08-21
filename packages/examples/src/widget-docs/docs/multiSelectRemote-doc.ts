// ============================================================================
// multiSelectRemote-doc — 多选（远程数据）组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const multiSelectRemoteDoc: WidgetDoc = {
  id: 'remoteMultiSelect',
  group: '选择类',
  title: '多选（远程数据）',
  english: 'MultiSelect (Remote)',
  description:
    '远程数据多选下拉。remoteData 异步加载选项列表，支持多选与标签模式，值以数组存储。',
  demos: [
    {
      title: '远程多选',
      description:
        'remoteData 加载选项，maxTagCount 限制已选标签展示数。值以数组存储。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          members: {
            type: 'array',
            widget: 'remoteMultiSelect',
            title: '项目成员',
            remoteData: {
              url: '/api/members',
              method: 'GET',
              responseField: {
                data: 'data.list',
                value: 'id',
                label: 'name',
              },
              params: { page: 1, pageSize: 100 },
            },
            props: {
              mode: 'multiple',
              maxTagCount: 3,
              allowClear: true,
            },
          },
        },
      },
    },
    {
      title: '标签模式远程联想',
      description: 'mode: "tags" 允许自由输入，远程数据提供联想候选。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          keywords: {
            type: 'array',
            widget: 'remoteMultiSelect',
            title: '关键词',
            remoteData: {
              url: '/api/keywords',
              method: 'GET',
              responseField: {
                data: 'data.keywords',
                value: 'word',
                label: 'word',
              },
            },
            props: { mode: 'tags' },
          },
        },
      },
    },
  ],
  excludeProps: ['enum', 'enumNames'],
};
