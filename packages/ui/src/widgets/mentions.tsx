import { Mentions } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  useRemoteOptions,
  type WidgetProps,
} from './_shared';

// 本地数据版本
export const mentionsWidget = ({
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
  prefix,
  allowClear,
  autoSize,
  rows,
  ...rest
}: WidgetProps) => {
  if (readOnly) {
    return <ReadOnlyDisplay value={value} options={options ?? []} />;
  }

  const items = mapOptions(options ?? []).map((o) => ({
    value: String(o.label),
    label: String(o.label),
  }));

  // 过滤掉 form 属性，避免传递给 Mentions（Mentions 不支持 form）
  const { form, ...mentionsRest } = rest;

  return (
    <Mentions
      value={(value as string) ?? ''}
      onChange={(text) => onChange(text)}
      options={items}
      placeholder={placeholder ?? '请输入，@ 触发提及'}
      disabled={disabled || loading}
      prefix={prefix === undefined ? '@' : String(prefix)}
      allowClear={allowClear as boolean}
      autoSize={autoSize as boolean | { minRows?: number; maxRows?: number }}
      rows={rows as number}
      {...mentionsRest}
    />
  );
};

// 远程数据版本
export const remoteMentionsWidget = ({
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
  prefix,
  allowClear,
  autoSize,
  rows,
  ...rest
}: WidgetProps & { remoteData?: any }) => {
  const { options, loading } = useRemoteOptions(
    path || 'mentions',
    remoteData,
    undefined,
    rest.remoteVersion as number | undefined,
  );

  const finalLoading = externalLoading || loading;

  if (readOnly) {
    return <ReadOnlyDisplay value={value} options={[]} />;
  }

  // 远程数据转换为 Mentions options 格式（value 为触发词）
  const items = mapOptions(options).map((o) => ({
    value: String(o.label),
    label: String(o.label),
  }));

  // 过滤掉 form 属性，避免传递给 Mentions（Mentions 不支持 form）
  const { form, ...mentionsRest } = rest;

  return (
    <Mentions
      value={(value as string) ?? ''}
      onChange={(text) => onChange(text)}
      options={items}
      placeholder={placeholder ?? '请输入，@ 触发提及'}
      disabled={disabled || finalLoading}
      prefix={prefix === undefined ? '@' : String(prefix)}
      allowClear={allowClear as boolean}
      autoSize={autoSize as boolean | { minRows?: number; maxRows?: number }}
      rows={rows as number}
      {...mentionsRest}
    />
  );
};
