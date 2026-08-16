import type { UploadFile } from 'antd';
import { Button, message, Upload } from 'antd';
import { useEffect, useState } from 'react';
import { ReadOnlyDisplay, type WidgetProps, withFormItem } from './_shared';

export interface FileWidgetConfig {
  /** 上传接口地址 */
  action?: string;
  /** 接受的文件类型 */
  accept?: string;
  /** 展示形态：text（默认）/ picture / picture-card */
  listType?: 'text' | 'picture' | 'picture-card';
  /** 最大上传数量 */
  maxCount?: number;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否拖拽上传（listType=text 时生效） */
  drag?: boolean;
  /** 按钮文案 */
  buttonText?: string;
  /** 上传前校验，返回 false 阻止上传 */
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
}

function toUrlList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return (value as unknown[]).filter(
      (v) => typeof v === 'string' && v.length > 0,
    ) as string[];
  }
  return typeof value === 'string' && value ? [value] : [];
}

function toFileList(urls: string[]): UploadFile[] {
  return urls.map((url, i) => ({
    uid: `file-${i}-${url}`,
    name: url.split('/').pop() || `file-${i}`,
    status: 'done',
    url,
  }));
}

export const fileWidget = withFormItem(
  ({
    value,
    onChange,
    disabled,
    loading,
    readOnly,
    form,
    dependValues: _dv,
    dataPath: _dp,
    path: _p,
    action,
    accept,
    listType,
    maxCount,
    multiple,
    drag,
    buttonText,
    beforeUpload,
    ...rest
  }: WidgetProps & FileWidgetConfig) => {
    const urls = toUrlList(value);
    const [fileList, setFileList] = useState<UploadFile[]>(() =>
      toFileList(urls),
    );

    // 外部值变化时同步 fileList（重置 / setValues 场景）
    useEffect(() => {
      setFileList(toFileList(toUrlList(value)));
    }, [value]);

    if (readOnly) {
      const display = urls.map((u) => {
        const name = u.split('/').pop() || u;
        if (listType === 'picture' || listType === 'picture-card') {
          return u;
        }
        return name;
      });
      return <ReadOnlyDisplay value={display} />;
    }

    const handleChange = ({
      fileList: newList,
    }: {
      fileList: UploadFile[];
    }) => {
      const next = newList
        .filter((f) => f.status === 'done' || f.url)
        .map((f) => f.url || f.response?.url)
        .filter((u): u is string => typeof u === 'string' && u.length > 0);
      setFileList(newList);
      onChange(multiple || maxCount !== 1 ? next : (next[0] ?? ''));
    };

    const mergedBeforeUpload = (file: File) => {
      if (beforeUpload) {
        const allowed = beforeUpload(file);
        if (allowed === false) {
          return false;
        }
      }
      if (accept && accept !== '*' && accept !== 'image/*') {
        const mime = file.type.toLowerCase();
        const accepted = accept
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .some((t) => {
            if (t.endsWith('/*')) {
              return mime.startsWith(t.slice(0, -1));
            }
            return mime === t || file.name.toLowerCase().endsWith(t.slice(1));
          });
        if (!accepted) {
          message.error(`不支持的文件类型：${file.name}`);
          return Upload.LIST_IGNORE;
        }
      }
      return true;
    };

    const uploadProps = {
      fileList,
      onChange: handleChange,
      onRemove: (f: UploadFile) => {
        setFileList((prev) => prev.filter((x) => x.uid !== f.uid));
        const remain = fileList
          .filter((x) => x.uid !== f.uid)
          .map((x) => x.url || x.response?.url)
          .filter((u): u is string => typeof u === 'string' && u.length > 0);
        onChange(multiple || maxCount !== 1 ? remain : (remain[0] ?? ''));
      },
      ...(action ? { action } : {}),
      accept,
      multiple,
      maxCount,
      beforeUpload: mergedBeforeUpload,
    };

    if (drag) {
      return (
        <Upload.Dragger {...uploadProps} {...rest}>
          <div>
            <p className='text-[14px] text-[#333]'>
              {buttonText ?? '点击或拖拽文件到此区域上传'}
            </p>
            {accept && (
              <p className='text-[12px] text-[#999]'>支持格式：{accept}</p>
            )}
          </div>
        </Upload.Dragger>
      );
    }

    return (
      <Upload {...uploadProps} listType={listType ?? 'text'} {...rest}>
        <Button disabled={disabled || loading}>
          {buttonText ?? '点击上传'}
        </Button>
      </Upload>
    );
  },
);
