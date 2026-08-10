import { Button, Form, message, Typography, Upload } from 'antd';
import { useState } from 'react';
import { ReadOnlyDisplay, useFormItemProps, type WidgetProps } from './_shared';

export const imageInputWidget = ({
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
  const formItemProps = useFormItemProps({ displayType, labelWidth });
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
    <Form.Item
      label={title}
      required={required}
      help={errors?.length ? errors[0] : description}
      validateStatus={errors?.length ? 'error' : ''}
      extra={extra}
      style={formItemProps.style}
      labelCol={formItemProps.labelCol}
      wrapperCol={formItemProps.wrapperCol}
      colon={formItemProps.colon}
    >
      {readOnly ? (
        <Typography.Text>
          <ReadOnlyDisplay value={value} />
        </Typography.Text>
      ) : (
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
      )}
    </Form.Item>
  );
};
