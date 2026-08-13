import { DatePicker } from 'antd';
import { toDayjs, type WidgetProps, withFormItem } from './_shared';

export const datePickerWidget = withFormItem(
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
