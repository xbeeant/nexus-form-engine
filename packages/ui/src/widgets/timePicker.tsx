import { TimePicker } from 'antd';
import { toDayjs, type WidgetProps, withFormItem } from './_shared';

export const timePickerWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    format,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => (
    <TimePicker
      value={toDayjs(value, (format as string) ?? 'HH:mm:ss')}
      onChange={(_, timeString) => onChange(timeString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={(format as string) ?? 'HH:mm:ss'}
      {...rest}
    />
  ),
);
