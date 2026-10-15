import { DatePicker } from 'antd-mobile';
import { SimpleDisplay, toDayjs, type WidgetProps } from './_shared';

export const dateMobileWidget = ({
  value,
  onChange,
  disabled,
  loading,
  readOnly,
  format,
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

  const dayjsValue = toDayjs(value, format as string);

  return (
    <DatePicker
      value={dayjsValue ? dayjsValue.toDate() : null}
      onConfirm={(v: Date) => onChange(v)}
      loading={loading}
      {...(rest as Record<string, unknown>)}
    />
  );
};
