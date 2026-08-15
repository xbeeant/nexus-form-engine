import { Checkbox } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const checkboxWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    title,
    description,
    errors,
    extra,
    width,
    readOnly,
    required,
    placeholder: _ph,
    options,
    displayType,
    labelWidth,
    column: _col,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }
    // 配置了选项时，以选中（value=true）项的文案作为复选框标签
    const checkedLabel = mapOptions(options).find(
      (o) => String(o.value) === 'true' || o.value === 1,
    )?.label;
    return (
      <Checkbox
        checked={
          value === true || value === 1 || value === 'true' || value === '1'
        }
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled || loading}
        {...rest}
      >
        {checkedLabel ?? title}
      </Checkbox>
    );
  },
);
