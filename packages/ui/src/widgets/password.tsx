import { Input } from 'antd';
import { ReadOnlyDisplay, type WidgetProps } from './_shared';

export const passwordWidget = ({
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  readOnly,
  form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} />;
  }

  return (
    <Input.Password
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled || loading}
      {...rest}
    />
  );
};
