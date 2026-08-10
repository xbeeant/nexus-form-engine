import { Radio } from 'antd';
import { mapOptions, type WidgetProps, withFormItem } from './_shared';

export const radioWidget = withFormItem(
  ({
    value,
    onChange,
    options,
    disabled,
    loading,
    form,
    ...rest
  }: WidgetProps) => (
    <Radio.Group
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      options={mapOptions(options)}
      {...rest}
    />
  ),
);
