import { Select } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const selectWidget = withFormItem(
  ({
    value,
    onChange,
    options,
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
      return <ReadOnlyDisplay value={value} options={options} />;
    }
    return (
      <Select
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? '请选择...'}
        disabled={disabled || loading}
        options={mapOptions(options)}
        allowClear
        {...rest}
      />
    );
  },
);
