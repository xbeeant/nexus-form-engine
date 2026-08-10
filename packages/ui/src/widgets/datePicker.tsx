import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { type WidgetProps, withFormItem } from './_shared';

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
      value={value ? dayjs(value as string) : null}
      onChange={(_, dateString) => onChange(dateString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={format as string}
      {...rest}
    />
  ),
);
