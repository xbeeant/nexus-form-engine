// ============================================================================
// autoCompleteRemote-doc — 自动完成（远程数据）组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const autoCompleteRemoteDoc: WidgetDoc = {
  id: 'remoteAutoComplete',
  group: '复杂选择',
  title: '自动完成（远程数据）',
  english: 'AutoComplete (Remote)',
  description:
    '远程数据自动完成。remoteData 异步加载联想候选，支持 GET/POST 与动态 params。',
  demos: [
    {
      title: '远程联想',
      description:
        '输入时从远程接口加载候选列表，responseField 声明数据与字段映射。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          city: {
            type: 'string',
            widget: 'remoteAutoComplete',
            title: '搜索城市',
            remoteData: {
              url: '/api/cities',
              method: 'GET',
              responseField: {
                data: 'data.cities',
                value: 'code',
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
