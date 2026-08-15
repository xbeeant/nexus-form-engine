import { Select } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  type WidgetProps,
  withFormItem,
  useRemoteOptions,
} from './_shared';

// 本地数据版本
export const multiSelectWidget = withFormItem(
  ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    loading,
    readOnly,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    tokenSeparators,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
    }

    return (
      <Select
        value={(value as unknown[]) ?? []}
        onChange={(v) => onChange(v)}
        mode='multiple'
        placeholder={placeholder ?? '请选择...'}
        disabled={disabled || loading}
        options={mapOptions(options)}
        loading={loading}
        allowClear
        {...rest}
      />
    );
  },
);

// 远程数据版本
export const multiSelectWidgetWithRemote = withFormItem(
  ({
    value,
    onChange,
    options: _opt,
    remoteData,
    placeholder,
    disabled,
    loading: externalLoading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path,
    tokenSeparators,
    ...rest
  }: WidgetProps & { remoteData?: any }) => {
    const { options, loading } = useRemoteOptions(
      path || 'multiSelect',
      remoteData,
      form!,
    );

    const finalLoading = externalLoading || loading;

    if (readOnly) {
      const localOptions = mapOptions(_opt);
      return <ReadOnlyDisplay value={value} options={localOptions} />;
    }

    // 声明式拆分：设计器以逗号分隔字符串配置 tokenSeparators，转为数组
    const separators =
      typeof tokenSeparators === 'string' && tokenSeparators.trim()
        ? tokenSeparators
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    return (
      <Select
        value={(value as unknown[]) ?? []}
        onChange={(v) => onChange(v)}
        mode='multiple'
        placeholder={placeholder ?? '请选择...'}
        disabled={disabled || finalLoading}
        options={mapOptions(options)}
        loading={finalLoading}
        allowClear
        tokenSeparators={separators}
        {...rest}
      />
    );
  },
);
