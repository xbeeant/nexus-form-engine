import { Checkbox, Form, Typography } from 'antd';
import {
  mapOptions,
  ReadOnlyDisplay,
  useFormItemProps,
  type WidgetProps,
} from './_shared';

export const checkboxesWidget = ({
  value,
  onChange,
  options,
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
      label={title}
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
          <ReadOnlyDisplay value={value} options={options} />
        </Typography.Text>
      ) : (
        <Checkbox.Group
          value={(value as unknown[]) ?? []}
          onChange={(v) => onChange(v)}
          disabled={disabled || loading}
          options={mapOptions(options)}
          {...rest}
        />
      )}
    </Form.Item>
  );
};
