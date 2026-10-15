import { Rate } from 'antd-mobile';
import { SimpleDisplay, type WidgetProps } from './_shared';

export const rateMobileWidget = ({
  value,
  onChange,
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
    const starCount = Math.round(Number(value) || 0);
    if (starCount <= 0) {
      return <SimpleDisplay value={value} />;
    }
    return (
      <span style={{ fontSize: 16, color: '#fadb14', letterSpacing: 2 }}>
        {'★'.repeat(starCount)}
      </span>
    );
  }

  return (
    <Rate
      value={value as number}
      onChange={(v) => onChange(v)}
      readOnly={(disabled || loading) as boolean}
      {...rest}
    />
  );
};
