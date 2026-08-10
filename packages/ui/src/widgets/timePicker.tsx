import { TimePicker } from 'antd';
import dayjs from 'dayjs';
import { type WidgetProps, withFormItem } from './_shared';

export const timePickerWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    format,
    form,
    ...rest
  }: WidgetProps) => (
    <TimePicker
      value={value ? dayjs(value as string) : null}
      onChange={(_, timeString) => onChange(timeString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={(format as string) ?? 'HH:mm:ss'}
      {...rest}
    />
  ),
);
