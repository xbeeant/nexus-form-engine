import { toBoolean } from '@xbeeant/form-engine/utils/schema-helper';
import { Input } from 'antd';
import { ReadOnlyDisplay, type WidgetProps } from './_shared';

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

  if (readOnly) {
    return <ReadOnlyDisplay value={value} />;
  }

  return (
    <Input.TextArea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={toBoolean(readOnly)}
      disabled={disabled || loading}
      rows={(rows as number) ?? 3}
      autoSize={
        mergedAutoSize as boolean | { minRows?: number; maxRows?: number }
      }
      {...rest}
    />
  );
};
