import { Select } from 'antd';
import { mapOptions, type WidgetProps, withFormItem } from './_shared';

export const selectWidget = withFormItem(
  ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    loading,
    form,
    ...rest
  }: WidgetProps) => (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '请选择...'}
      disabled={disabled || loading}
      options={mapOptions(options)}
      allowClear
      {...rest}
    />
  ),
);
