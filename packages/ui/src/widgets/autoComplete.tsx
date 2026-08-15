import { AutoComplete } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
} from './_shared';

export const autoCompleteWidget = withFormItem(
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
    allowClear,
    backfill,
    defaultActiveFirstOption,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }

    return (
      <AutoComplete
        value={(value as string) ?? ''}
        onChange={(v) => onChange(v)}
        options={mapOptions(options)}
        placeholder={placeholder ?? '请输入...'}
        disabled={disabled || loading}
        allowClear={allowClear === undefined ? true : (allowClear as boolean)}
        backfill={backfill as boolean}
        defaultActiveFirstOption={defaultActiveFirstOption as boolean}
        {...rest}
      />
    );
  },
);
