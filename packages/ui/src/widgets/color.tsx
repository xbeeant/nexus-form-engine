import { ColorPicker, Form, Typography } from 'antd';
import { ReadOnlyDisplay, useFormItemProps, type WidgetProps } from './_shared';

export const colorWidget = ({
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
        <ColorPicker
          value={value as string}
          onChange={(color) => onChange(color.toHexString())}
          disabled={disabled || loading}
          showText
          {...rest}
        />
      )}
    </Form.Item>
  );
};
