import { Input } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const passwordWidget = withFormItem(
  ({
    value,
    onChange,
    placeholder,
    disabled,
    loading,
    form,
    ...rest
  }: WidgetProps) => (
    <Input.Password
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled || loading}
      {...rest}
    />
  ),
);
