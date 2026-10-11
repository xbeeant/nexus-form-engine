import { toBoolean } from '@xbeeant/form-engine';
import { Input } from 'antd';
import { SimpleDisplay, type WidgetProps } from './_shared';

export const textAreaWidget = ({
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  rows,
  readOnly,
  autoSize,
  minRows,
  maxRows,
  form,
  dependValues: _dv,
  remoteVersion: _rv,
  dataPath: _dp,
  path: _p,
  ...rest
}: WidgetProps) => {
  // 声明式拆分：minRows/maxRows 合并进 autoSize 对象（antd 原生接受 boolean | {minRows,maxRows}）
  const mergedAutoSize =
    minRows !== undefined || maxRows !== undefined
      ? {
          ...(typeof autoSize === 'object' && autoSize !== null
            ? autoSize
            : {}),
          ...(minRows !== undefined ? { minRows: minRows as number } : {}),
          ...(maxRows !== undefined ? { maxRows: maxRows as number } : {}),
        }
      : autoSize;

  // 过滤掉 rest 中的 autoSize/rows，避免与显式属性冲突（antd TextArea 同时接收 rows 和 autoSize 对象时会计算 NaN 高度）
  const { autoSize: _a, rows: _r, ...cleanRest } = rest as Record<
    string,
    unknown
  >;

  if (readOnly) {
    return <SimpleDisplay value={value} />;
  }

  return (
    <Input.TextArea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={toBoolean(readOnly)}
      disabled={disabled || loading}
      rows={typeof mergedAutoSize === 'object' ? undefined : (rows as number) ?? 3}
      autoSize={
        mergedAutoSize as boolean | { minRows?: number; maxRows?: number }
      }
      {...cleanRest}
    />
  );
};
