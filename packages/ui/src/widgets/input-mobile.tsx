import { Input } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

export const inputMobileWidget = ({
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  readOnly,
  required: _required,
  title: _title,
  description: _desc,
  errors: _errors,
  label: _label,
  extra: _extra,
  width: _width,
  displayType: _displayType,
  labelWidth: _labelWidth,
  column: _column,
  items: _items,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  remoteVersion: _rv,
  props: _props,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <SimpleDisplay value={value} />;
  }

  return (
    <Input
      value={(value as string) ?? ''}
      onChange={(v) => onChange(v)}
      placeholder={placeholder}
      disabled={disabled || loading}
      {...rest}
    />
  );
};
