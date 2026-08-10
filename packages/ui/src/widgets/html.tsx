import { Form, Typography } from 'antd';
import { useFormItemProps, type WidgetProps } from './_shared';

export const htmlWidget = ({
  value,
  title,
  description,
  errors,
}: WidgetProps) => {
  const formItemProps = useFormItemProps();

  return (
    <Form.Item
      label={title}
      help={errors?.length ? errors[0] : description}
      validateStatus={errors?.length ? 'error' : ''}
      style={formItemProps.style}
      labelCol={formItemProps.labelCol}
      wrapperCol={formItemProps.wrapperCol}
      colon={formItemProps.colon}
    >
      <Typography>
        <div
          style={{ padding: '4px 0', minHeight: 24 }}
          dangerouslySetInnerHTML={{ __html: (value as string) ?? '' }}
        />
      </Typography>
    </Form.Item>
  );
};
