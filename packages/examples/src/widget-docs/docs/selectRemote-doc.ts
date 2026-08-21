// ============================================================================
// selectRemote-doc — 下拉选择（远程数据）组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const selectRemoteDoc: WidgetDoc = {
  id: 'remoteSelect',
  group: '选择类',
  title: '下拉选择（远程数据）',
  english: 'Select (Remote)',
  description:
    '远程数据下拉选择器。通过 remoteData 配置异步数据源（GET/POST），自动加载选项并缓存 5 分钟，支持动态 params 随表单值变化。',
  demos: [
    {
      title: '远程加载选项',
      description:
        'remoteData.url 声明接口地址；responseField 声明响应中数据数组/值字段/文案字段的提取路径。请求发出前自动追加 params 参数。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          user: {
            type: 'string',
            widget: 'remoteSelect',
            title: '选择用户',
            remoteData: {
              url: '/api/options',
              method: 'GET',
              responseField: {
                data: 'data.list',
                value: 'id',
                label: 'name',
              },
              params: { page: 1, pageSize: 50 },
            },
            props: { allowClear: true, showSearch: true },
          },
        },
      },
    },
    {
      title: '动态 params（依赖表单值）',
      description:
        'params 支持函数形式：接收当前 formData，返回请求参数。此处根据已选的 city 过滤用户列表，字段值变化会重新请求。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          city: {
            type: 'string',
            widget: 'select',
            title: '城市',
            enum: ['beijing', 'shanghai'],
            enumNames: ['北京', '上海'],
          },
          user: {
            type: 'string',
            widget: 'remoteSelect',
            title: '用户（按城市过滤）',
            remoteData: {
              url: '/api/users',
              method: 'POST',
              responseField: {
                data: 'data.users',
                value: 'id',
                label: 'name',
              },
              params: (formData: Record<string, unknown>) => ({
                city: formData.city,
                page: 1,
              }),
            },
          },
        },
      },
    },
    {
      title: 'POST 请求与自定义响应路径',
      description:
        'method 声明请求方法（默认 GET）；headers 携带认证信息；responseField.data 支持多级路径（如 data.result.records）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          dept: {
            type: 'string',
            widget: 'remoteSelect',
            title: '所属部门',
            remoteData: {
              url: '/api/departments',
              method: 'POST',
              headers: { Authorization: 'Bearer <token>' },
              responseField: {
                data: 'data.result.records',
                value: 'deptId',
                label: 'deptName',
              },
              params: { status: 1 },
            },
          },
        },
      },
    },
  ],
  excludeProps: ['enum', 'enumNames'],
};
