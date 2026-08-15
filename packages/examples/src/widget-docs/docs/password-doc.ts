// ============================================================================
// password-doc — 密码框组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const passwordDoc: WidgetDoc = {
  id: 'password',
  group: '基础输入',
  title: '密码框',
  english: 'Input.Password',
  description:
    '带掩码的密码输入框，支持显隐切换（visibilityToggle）、长度限制（maxLength）与清除按钮（allowClear），常用于登录/注册表单。',
  demos: [
    {
      title: '基础用法',
      description:
        'visibilityToggle 控制是否显示「眼睛」切换按钮；maxLength 限制最大长度；allowClear 开启清除按钮。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          password: {
            type: 'string',
            widget: 'password',
            title: '登录密码',
            placeholder: '请输入密码',
            required: true,
            maxLength: 20,
            props: { visibilityToggle: true, allowClear: true },
          },
          oldPassword: {
            type: 'string',
            widget: 'password',
            title: '旧密码',
            description: '关闭显隐切换',
            props: { visibilityToggle: false },
          },
        },
      },
    },
    {
      title: '密码强度校验',
      description:
        '通过 rules 配置校验规则（pattern/长度），提交时校验不通过会聚焦并提示。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          newPassword: {
            type: 'string',
            widget: 'password',
            title: '新密码',
            required: true,
            rules: [
              { min: 8, message: '密码至少 8 位' },
              {
                pattern: /[A-Za-z]/,
                message: '需包含字母',
              },
              { pattern: /\d/, message: '需包含数字' },
            ],
          },
          confirm: {
            type: 'string',
            widget: 'password',
            title: '确认密码',
            required: true,
            rules: [{ min: 8, message: '密码至少 8 位' }],
          },
        },
      },
    },
  ],
};
