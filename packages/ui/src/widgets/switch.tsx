import { Switch } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const switchWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    readOnly,
    options,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }
    const mapped = mapOptions(options);
    const checkedLabel = mapped.find(
      (o) => String(o.value) === 'true' || o.value === 1,
    )?.label;
    const uncheckedLabel = mapped.find(
      (o) => String(o.value) === 'false' || o.value === 0,
    )?.label;
    return (
      <Switch
        checked={
          value === true || value === 1 || value === 'true' || value === '1'
        }
        onChange={onChange}
        disabled={disabled || loading}
        checkedChildren={checkedLabel}
        unCheckedChildren={uncheckedLabel}
        {...rest}
      />
    );
  },
);
