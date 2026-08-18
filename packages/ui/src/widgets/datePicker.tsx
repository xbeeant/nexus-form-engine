import { DatePicker } from 'antd';
import { ReadOnlyDisplay, toDayjs, type WidgetProps } from './_shared';

export const datePickerWidget = ({
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
    // antd 6 DatePicker 已不支持 readOnly，统一回退文本展示
    return <ReadOnlyDisplay value={value} />;
  }

  return (
    <DatePicker
      value={toDayjs(value, format as string)}
      onChange={(_, dateString) => onChange(dateString || undefined)}
      disabled={disabled || loading}
      style={{ width: '100%' }}
      format={format as string}
      {...rest}
    />
  );
};