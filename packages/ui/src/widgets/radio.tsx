import { Radio } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const radioWidget = withFormItem(
  ({
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
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }
    return (
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        options={mapOptions(options)}
        {...rest}
      />
    );
  },
);
