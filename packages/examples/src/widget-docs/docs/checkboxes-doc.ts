// ============================================================================
// checkboxes-doc — 复选框组组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const checkboxesDoc: WidgetDoc = {
  id: 'checkboxes',
  group: '选择类',
  title: '复选框组',
  english: 'Checkbox.Group',
  description:
    '多选复选框组，值以数组存储。常用于偏好、权限等多选场景；column 控制选项分列展示。',
  demos: [
    {
      title: '基础用法',
      description:
        '字段类型为 array，选中项的值以数组保存；required 校验至少选择一项（提交时校验）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          hobbies: {
            type: 'array',
            widget: 'checkboxes',
            title: '兴趣爱好',
            required: true,
            enum: ['reading', 'coding', 'music', 'sports', 'travel', 'game'],
            enumNames: ['阅读', '编程', '音乐', '运动', '旅行', '游戏'],
          },
          skills: {
            type: 'array',
            widget: 'checkboxes',
            title: '技能标签',
            enum: ['react', 'node', 'ai', 'devops'],
            enumNames: ['React', 'Node.js', 'AI', 'DevOps'],
          },
        },
      },
    },
    {
      title: '分列展示',
      description:
        '字段节点上的 column 控制选项分列数（3 列），适合选项较多的场景。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          permissions: {
            type: 'array',
            widget: 'checkboxes',
            title: '权限（3 列）',
            column: 3,
            enum: ['read', 'write', 'delete', 'export', 'import', 'admin'],
            enumNames: ['读取', '写入', '删除', '导出', '导入', '管理'],
          },
        },
      },
    },
  ],
};
