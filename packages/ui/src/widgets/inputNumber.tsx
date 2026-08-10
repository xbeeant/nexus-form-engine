import { toBoolean } from '@nexus/form-engine';
import { InputNumber } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const inputNumberWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    form,
    readOnly,
    required,
    ...rest
  }: WidgetProps) => (
    <InputNumber
      value={value as number | undefined}
      onChange={(v) => onChange(v ?? undefined)}
      disabled={toBoolean(disabled || loading)}
      readOnly={toBoolean(readOnly)}
      required={toBoolean(required)}
      style={{ width: '100%' }}
      {...rest}
    />
  ),
);
