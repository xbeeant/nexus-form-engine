// ============================================================================
// ExpressionSwitch — 编辑 ExpressionOr<boolean> 属性
// 支持静态布尔值（Switch）与表达式（可视化构建器 / 高级手写）之间的切换
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Form, Switch } from 'antd';
import { ExpressionBuilder } from './ExpressionBuilder';
import { useFormDataFields } from './useFormDataFields';

export function ExpressionSwitch({
  value,
  onChange,
  title,
  displayType,
}: WidgetProps) {
  // ExpressionOr<boolean>: 非空字符串=表达式模式，其他=静态模式
  // 直接由 value 派生（受控），外部 value 变化（如切换选中节点）自动同步；
  // 不再维护内部 isExpr state，避免与外部值脱节
  const isExpr = typeof value === 'string' && value.length > 0;

  const fields = useFormDataFields();

  // 模式切换必须写回一个对应形态的值，否则状态只是视觉变化、无法持久化
  const switchMode = (exprMode: boolean) => {
    if (exprMode) {
      // 切到表达式：保留已有表达式，静态布尔值则以空模板起步
      onChange(typeof value === 'string' ? value : '{{  }}');
    } else {
      // 切到静态：reset 为布尔值
      onChange(typeof value === 'boolean' ? value : false);
    }
  };

  return (
    <Form.Item
      layout={displayType === 'row' ? 'horizontal' : 'vertical'}
      label={title}
      style={{ width: '100%' }}
    >
      <div className={`flex gap-2 ${isExpr ? 'flex-col' : 'flex-row'}`}>
        {isExpr ? (
          <ExpressionBuilder
            value={value as string}
            onChange={(s) => onChange(s)}
            fields={fields}
          />
        ) : (
          <Switch checked={!!value} onChange={(v) => onChange(v)} />
        )}
        <Switch
          checked={isExpr}
          checkedChildren='表达式'
          unCheckedChildren='静态'
          onChange={switchMode}
        />
      </div>
    </Form.Item>
  );
}

export const expressionSwitchWidget = ExpressionSwitch;
