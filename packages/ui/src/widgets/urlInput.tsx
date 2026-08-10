import { Form, Input, Typography } from 'antd';
import { ReadOnlyDisplay, useFormItemProps, type WidgetProps } from './_shared';

export const urlInputWidget = ({
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  title,
  description,
  errors,
  extra,
  width,
  readOnly,
  required,
  options: _opt,
  displayType,
  labelWidth,
  column: _col,
  form,
  ...rest
}: WidgetProps) => {
  const formItemProps = useFormItemProps({ displayType, labelWidth });

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
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'https://'}
          disabled={disabled || loading}
          prefix={<span style={{ color: '#999' }}>🔗</span>}
          {...rest}
        />
      )}
    </Form.Item>
  );
};
