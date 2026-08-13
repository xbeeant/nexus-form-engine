// ============================================================================
// 示例 Widget — 在组件内注册校验规则并与组件 state / 依赖字段联动
// 对齐 x-render 子表单校验思路：校验逻辑写在 UI 组件内部，而非全部下沉到 Schema
// ============================================================================

import { useFieldValidator } from '@nexus/form-engine-react';
import { type WidgetProps, withFormItem } from '@nexus/form-engine-ui';
import { Input } from 'antd';
import { useState } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// confirmPassword — 确认密码
// 在组件内部注册「两次密码一致」校验，并订阅 password 字段：
// password 变化时自动对确认密码字段实时重校验（dependsOn 联动）
// ────────────────────────────────────────────────────────────────────────────

export const confirmPasswordWidget = withFormItem((props: WidgetProps) => {
  const { dataPath, form, value, disabled, onChange, loading, ...rest } = props;
  const [toggle, setToggle] = useState(false);

  useFieldValidator(
    form,
    dataPath,
    (val, formData) => {
      const pwd = String((formData as Record<string, unknown>)?.password ?? '');
      const confirm = String(val ?? '');
      if (confirm && pwd && confirm !== pwd) {
        return ['两次输入的密码不一致'];
      }
      return [];
    },
    // 依赖字段变化（password）时联动重校验本字段
    {
      dependsOn: ['password'],
      // 闭包依赖的组件 state：toggle 变化时自动重新注册校验器，
      // 新闭包捕获最新 toggle 值（useEffect 语义，无需手动 ref）
      deps: [toggle],
    },
  );

  return (
    <Input.Password
      value={(value as string) ?? ''}
      disabled={Boolean(disabled || loading)}
      placeholder='请再次输入密码'
      onChange={(e) => {
        setToggle(!toggle);
        onChange(e.target.value);
      }}
      {...rest}
    />
  );
});

// ────────────────────────────────────────────────────────────────────────────
// usernameUnique — 用户名唯一性（异步）
// 组件内部注册异步校验器：提交 / validateFields 时调用（await），
// 同时通过组件内部 loading state 联动输入框的 loading 表现
// ────────────────────────────────────────────────────────────────────────────

export const usernameUniqueWidget = withFormItem((props: WidgetProps) => {
  const { dataPath, form, value, disabled, onChange, ...rest } = props;
  const [toggle, setToggle] = useState(false);
  useFieldValidator(
    form,
    dataPath,
    async (val) => {
      console.log(toggle);
      const v = String(val ?? '');
      if (!v || v.length < 3) {
        return [];
      }
      await new Promise((r) => setTimeout(r, 300));
      const taken = ['root', 'admin', 'system'].includes(v.toLowerCase());
      return taken ? [`用户名 "${v}" 已被占用`] : [];
    },
    {
      deps: [toggle],
    },
  );

  return (
    <Input
      value={(value as string) ?? ''}
      onChange={(e) => {
        onChange(e.target.value);
        setToggle(!toggle);
        // 异步校验器由引擎默认注入的 AsyncValidatorPlugin 在值变化时自动触发
        // （防抖 300ms），无需在组件内手动调 validateFields
      }}
      disabled={Boolean(disabled)}
      placeholder='输入用户名（root/admin/system 为保留名）'
      {...rest}
    />
  );
});
