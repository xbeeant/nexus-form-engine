import { Segmented } from 'antd';
import { mapOptions, ReadOnlyDisplay, type WidgetProps } from './_shared';

export const segmentedWidget = ({
  value,
  onChange,
  options,
  disabled,
  loading,
  readOnly,
  form,
  dependValues: _dv,
  dataPath: _dp,
  path: _p,
  block,
  size,
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
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} options={options} />;
  }

  return (
    <Segmented
      value={value as string | number}
      onChange={(v) => onChange(v)}
      options={
        mapOptions(options) as Array<{
          label: string;
          value: string | number;
        }>
      }
      disabled={disabled || loading}
      block={block as boolean}
      size={size as 'large' | 'middle' | 'small' | undefined}
      {...rest}
    />
  );
};
