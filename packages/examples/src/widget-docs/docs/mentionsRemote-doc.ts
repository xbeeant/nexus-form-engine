// ============================================================================
// mentionsRemote-doc — 提及（远程数据）组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const mentionsRemoteDoc: WidgetDoc = {
  id: 'remoteMentions',
  group: '复杂选择',
  title: '提及（远程数据）',
  english: 'Mentions (Remote)',
  description:
    '远程数据提及组件。输入 @ 触发前缀时从远程接口加载用户列表作为提及候选。',
  demos: [
    {
      title: '远程提及用户',
      description:
        'remoteData 异步加载可提及用户，prefix 声明触发前缀（默认 @）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          comment: {
            type: 'string',
            widget: 'remoteMentions',
            title: '评论',
            remoteData: {
              url: '/api/users/suggestions',
              method: 'GET',
              responseField: {
                data: 'data.users',
                value: 'id',
                label: 'name',
              },
              params: { keyword: '' },
            },
          },
        },
      },
    },
  ],
  excludeProps: ['enum', 'enumNames'],
};
