import { TextArea } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

const Textarea = TextArea;

export const textareaMobileWidget = ({
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
    <Textarea
      value={(value as string) ?? ''}
      onChange={(v) => onChange(v)}
      placeholder={placeholder}
      disabled={disabled || loading}
      {...rest}
    />
  );
};
