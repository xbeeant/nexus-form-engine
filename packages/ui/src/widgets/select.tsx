import { Select } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  useRemoteOptions,
  type WidgetProps,
} from './_shared';

// 本地数据版本
export const selectWidget = ({
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
      loading={loading}
      allowClear
      {...rest}
    />
  );
};

// 远程数据版本
export const remoteSelectWidget = ({
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
  ...rest
}: WidgetProps & { remoteData?: any }) => {
  const { options, loading } = useRemoteOptions(
    path || 'select',
    remoteData,
    undefined,
    rest.remoteVersion as number | undefined,
  );

  const finalLoading = externalLoading || loading;

  if (readOnly) {
    const localOptions = mapOptions(_opt);
    return <ReadOnlyDisplay value={value} options={localOptions} />;
  }

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '请选择...'}
      disabled={disabled || finalLoading}
      options={mapOptions(options)}
      loading={finalLoading}
      allowClear
      {...rest}
    />
  );
};
