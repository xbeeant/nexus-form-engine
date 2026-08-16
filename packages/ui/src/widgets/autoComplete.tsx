import { Select } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  useRemoteOptions,
  type WidgetProps,
  withFormItem,
} from './_shared';

// 本地数据版本
export const autoCompleteWidget = withFormItem(
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
    allowClear,
    defaultActiveFirstOption,
    tokenSeparators,
    ...rest
  }: WidgetProps) => {
    if (readOnly) {
      return <ReadOnlyDisplay value={value} options={options} />;
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
        mode='tags'
        value={Array.isArray(value) ? value : [value as string]}
        onChange={(v) => onChange(v)}
        options={mapOptions(options)}
        placeholder={placeholder ?? '请输入...'}
        disabled={disabled || loading}
        loading={loading}
        allowClear={allowClear === undefined ? true : (allowClear as boolean)}
        defaultActiveFirstOption={defaultActiveFirstOption as boolean}
        showSearch
        tokenSeparators={separators}
        filterOption={false}
        {...rest}
      />
    );
  },
);

// 远程数据版本
export const autoCompleteWidgetWithRemote = withFormItem(
  ({
    value,
    onChange,
    options: _opt,
    remoteData,
    placeholder,
    disabled,
    loading: externalLoading,
    readOnly,
    form: _form,
    dependValues: _dv,
    dataPath: _dp,
    path,
    allowClear,
    defaultActiveFirstOption,
    tokenSeparators,
    ...rest
  }: WidgetProps & { remoteData?: any }) => {
    const { options, loading } = useRemoteOptions(
      path || 'autocomplete',
      remoteData,
    );

    const finalLoading = externalLoading || loading;

    // 声明式拆分：设计器以逗号分隔字符串配置 tokenSeparators，转为数组
    const separators =
      typeof tokenSeparators === 'string' && tokenSeparators.trim()
        ? tokenSeparators
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    // onSearch 时可以触发远程请求（可选）
    const handleSearch = () => {
      // 如果组件支持搜索请求，可以在这里调用 engine.request 或直接请求
      // 当前版本仅支持整棵树加载（useRemoteOptions）
      // 用户也可以在 remoteData.params 中通过 formData 动态查询
    };

    return (
      <Select
        mode='tags'
        value={Array.isArray(value) ? value : [value as string]}
        onChange={(v) => onChange(v)}
        options={mapOptions(options)}
        placeholder={placeholder ?? '请输入...'}
        disabled={disabled || finalLoading}
        loading={finalLoading}
        allowClear={allowClear === undefined ? true : (allowClear as boolean)}
        defaultActiveFirstOption={defaultActiveFirstOption as boolean}
        showSearch
        onSearch={handleSearch}
        tokenSeparators={separators}
        filterOption={false} // 禁用本地过滤，由远程数据提供
        {...rest}
      />
    );
  },
);
