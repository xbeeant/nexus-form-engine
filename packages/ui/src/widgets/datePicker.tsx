import { DatePicker } from 'antd';
import { type WidgetProps, toDayjs, withFormItem } from './_shared';

export const datePickerWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    format,
    form,
    ...rest
  }: WidgetProps) => (
    <DatePicker
      value={toDayjs(value, format as string)}
      onChange={(_, dateString) => onChange(dateString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={format as string}
      {...rest}
    />
  ),
);
