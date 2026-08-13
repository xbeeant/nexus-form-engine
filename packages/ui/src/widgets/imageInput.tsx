import { Button, message, Upload } from 'antd';
import { useState } from 'react';
import { type WidgetProps, withFormItem } from './_shared';

export const imageInputWidget = withFormItem(
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
    options: _opt,
    displayType,
    labelWidth,
    column: _col,
    action,
    accept,
    listType,
    maxCount,
    form,
    ...rest
  }: WidgetProps & {
    action?: string;
    accept?: string;
    listType?: 'text' | 'picture' | 'picture-card';
    maxCount?: number;
  }) => {
    const [fileList, setFileList] = useState<any[]>(() => {
      const urls = Array.isArray(value)
        ? (value as string[])
        : value
          ? [value as string]
          : [];
      return urls.map((url, i) => ({
        uid: `img-${i}`,
        name: `image-${i}`,
        status: 'done',
        url,
      }));
    });

    const handleChange = ({ fileList: newList }: any) => {
      setFileList(newList);
      const urls = newList
        .filter((f: any) => f.status === 'done' || f.url)
        .map((f: any) => f.url || f.response?.url);
      onChange(urls.length === 1 ? urls[0] : urls);
    };

    const beforeUpload = (file: File) => {
      if (file.type.startsWith('image/')) {
        return true;
      }
      message.error('只能上传图片文件');
      return Upload.LIST_IGNORE;
    };

    const isPictureCard = listType === 'picture-card';

    return (
      <Upload
        action={(action as string) ?? '/api/upload'}
        listType={(listType as any) ?? 'picture'}
        accept={(accept as string) ?? 'image/*'}
        maxCount={(maxCount as number) ?? undefined}
        fileList={fileList}
        onChange={handleChange}
        beforeUpload={beforeUpload}
        disabled={disabled || loading}
        {...rest}
      >
        {isPictureCard ? (
          <div>
            <span style={{ fontSize: 18 }}>📷</span>
            <div style={{ marginTop: 8 }}>上传图片</div>
          </div>
        ) : (
          <Button disabled={disabled || loading}>点击上传</Button>
        )}
      </Upload>
    );
  },
);
