import { Checkbox, Form, Typography } from 'antd';
import { ReadOnlyDisplay, useFormItemProps, type WidgetProps } from './_shared';

export const checkboxWidget = ({
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

  const mergedStyle = {
    ...formItemProps.style,
    ...(width ? { width } : {}),
  };

  return (
    <Form.Item
      label={readOnly ? title : null}
      required={required}
      help={errors?.length ? errors[0] : description}
      validateStatus={errors?.length ? 'error' : ''}
      extra={extra}
      style={Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined}
      labelCol={formItemProps.labelCol}
      wrapperCol={formItemProps.wrapperCol}
      colon={formItemProps.colon}
    >
      {readOnly ? (
        <Typography.Text>
          <ReadOnlyDisplay value={value} />
        </Typography.Text>
      ) : (
        <Checkbox
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled || loading}
          {...rest}
        >
          {title}
        </Checkbox>
      )}
    </Form.Item>
  );
};
