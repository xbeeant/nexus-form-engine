import { toBoolean } from '@nexus/form-engine/utils/schema-helper.ts';
import { Input } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const textAreaWidget = withFormItem(
  ({
    value,
    onChange,
    placeholder,
    disabled,
    loading,
    rows,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => (
    <Input.TextArea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={toBoolean(readOnly)}
      disabled={disabled || loading}
      rows={(rows as number) ?? 3}
      {...rest}
    />
  ),
);
