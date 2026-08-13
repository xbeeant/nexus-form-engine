// ============================================================================
// WidgetValidationPage — 组件内注册校验规则 + 状态联动 演示
// 对比 Schema 内定义校验 与 组件内注册校验（对齐 x-render 子表单校验）
// ============================================================================

import { NexusForm, useForm } from '@nexus/form-engine-react';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import {
  confirmPasswordWidget,
  usernameUniqueWidget,
} from '../site/widgetValidationWidgets';

const { Title, Paragraph, Text } = Typography;

// Schema 只需声明使用哪个 widget，校验规则全部注册在组件内部
const demoWidgetSchema = {
  type: 'object',
  properties: {
    username: {
      type: 'string',
      widget: 'usernameUnique',
      title: '用户名',
    },
    password: {
      type: 'string',
      widget: 'password',
      title: '密码',
      required: true,
    },
    confirmPassword: {
      type: 'string',
      widget: 'confirmPassword',
      title: '确认密码',
      required: true,
    },
  },
} as const;

const exampleCode = `// 1) 组件内部注册校验规则（widgets/confirmPassword.tsx）
import { useFieldValidator } from '@nexus/form-engine-react';

export const confirmPasswordWidget = withFormItem((props: WidgetProps) => {
  const { dataPath, form } = props;

  // 组件内注册校验器：闭包可读取组件 state，实现与组件状态联动
  useFieldValidator(form, dataPath, (val, formData) => {
    if (val && formData.password && val !== formData.password) {
      return ['两次输入的密码不一致'];
    }
    return [];
  }, {
    dependsOn: ['password'], // 依赖字段变化时自动联动重校验
  });

  return <Input.Password {...props} />;
});

// 2) 引擎注册自定义 widget
engine.registerWidgets({
  confirmPassword: confirmPasswordWidget,
  usernameUnique: usernameUniqueWidget,
});

// 3) Schema 中直接使用——校验规则不用写在 schema 里
{
  type: 'object',
  properties: {
    username:        { type: 'string', widget: 'usernameUnique', title: '用户名' },
    password:        { type: 'string', widget: 'password',      title: '密码' },
    confirmPassword: { type: 'string', widget: 'confirmPassword', title: '确认密码' },
  },
}`;

export default function WidgetValidationPage() {
  const [form] = useForm();
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const engine = form._getEngine();
    registerAntdUI(engine);
    // 注册「组件内校验」示例 widget
    engine.registerWidgets({
      confirmPassword: confirmPasswordWidget,
      usernameUnique: usernameUniqueWidget,
    });
  }, [form]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 48px' }}>
      <Title level={2}>组件内注册校验规则</Title>
      <Paragraph type='secondary'>
        校验规则可以直接注册在 widget UI 组件内部（类似 x-render 子表单校验），
        并和组件自身 state / 依赖字段联动，而不必全部写进 Schema。 下方 schema
        的 <code>username / confirmPassword</code> 没有写任何 rules /
        validate——校验逻辑全部在组件内部。
      </Paragraph>

      <Card title='演示表单' size='small' style={{ marginBottom: 16 }}>
        <Space orientation='vertical' style={{ width: '100%' }}>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <b>confirmPassword</b>：内部注册「两次密码一致」校验，并订阅{' '}
            <code>password</code> 变化实时联动重校验
            <br />
            <b>usernameUnique</b>：内部注册异步唯一性校验（root/admin/system
            为保留名）
          </Text>
          <Button
            size='small'
            onClick={async () => {
              const errors = await form.validateFields();
              console.error('校验结果:', Object.fromEntries(errors));
            }}
          >
            手动校验全部字段
          </Button>
        </Space>
      </Card>

      <NexusForm
        form={form}
        schema={demoWidgetSchema}
        onFinish={async (data) => {
          setSubmitted(data);
          setErrorCount(0);
        }}
        onFinishFailed={(errors) => {
          console.error(errors);
          setErrorCount(errors.size);
        }}
        initialValues={{ username: '', password: '', confirmPassword: '' }}
        footer={
          <Space style={{ marginTop: 16 }}>
            <Button type='primary' htmlType='submit'>
              提交
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                setSubmitted(null);
                setErrorCount(0);
              }}
            >
              重置
            </Button>
          </Space>
        }
      >
        {errorCount > 0 && (
          <Alert
            type='error'
            showIcon
            title={`校验未通过，共 ${errorCount} 个字段有错误`}
            style={{ marginTop: 16 }}
          />
        )}
      </NexusForm>

      {submitted && (
        <Card title='提交结果' size='small' style={{ marginTop: 24 }}>
          <pre style={{ margin: 0, fontSize: 13 }}>
            {JSON.stringify(submitted, null, 2)}
          </pre>
        </Card>
      )}

      <Title level={3} style={{ marginTop: 32 }}>
        实现方式
      </Title>
      <CodeBlock lang='tsx' title='组件内注册校验' code={exampleCode} />
    </div>
  );
}
