import { TimePicker } from 'antd';
import { ReadOnlyDisplay, toDayjs, type WidgetProps } from './_shared';

export const timePickerWidget = ({
  value,
  onChange,
  disabled,
  loading,
  readOnly,
  format,
  form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    // antd 6 TimePicker 已不支持 readOnly，统一回退文本展示
    return <ReadOnlyDisplay value={value} />;
  }

  return (
    <TimePicker
      value={toDayjs(value, (format as string) ?? 'HH:mm:ss')}
      onChange={(_, timeString) => onChange(timeString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={(format as string) ?? 'HH:mm:ss'}
      {...rest}
    />
  );
};