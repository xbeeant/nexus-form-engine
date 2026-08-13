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
      disabled={disabled || loading}
      rows={(rows as number) ?? 3}
      {...rest}
    />
  ),
);
