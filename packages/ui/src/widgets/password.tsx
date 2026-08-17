import { Input } from 'antd';
import type { WidgetProps } from './_shared';

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
}: WidgetProps) => (
  <Input.Password
    value={(value as string) ?? ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    disabled={disabled || loading}
    {...rest}
  />
);
