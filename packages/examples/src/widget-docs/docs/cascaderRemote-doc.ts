// ============================================================================
// cascaderRemote-doc — 级联选择（远程数据）组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const cascaderRemoteDoc: WidgetDoc = {
  id: 'remoteCascader',
  group: '复杂选择',
  title: '级联选择（远程数据）',
  english: 'Cascader (Remote)',
  description:
    '远程数据级联选择。remoteData 异步加载子节点，展开时自动请求下级数据。',
  demos: [
    {
      title: '远程加载子节点',
      description:
        '初始加载根节点，展开时按父节点 key 请求子节点。responseField.parentIdKey 声明扁平数据中父节点字段。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          area: {
            type: 'array',
            widget: 'remoteCascader',
            title: '行政区划',
            remoteData: {
              url: '/api/cascader/nodes',
              method: 'GET',
              responseField: {
                data: 'data.children',
                value: 'id',
                label: 'name',
                parentIdKey: 'parentId',
              },
              params: { parentId: null },
            },
          },
        },
      },
    },
  ],
  excludeProps: ['cascaderData', 'enum', 'enumNames'],
};
