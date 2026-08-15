// ============================================================================
// DemoCard — 单个示例实例卡片
// 结构：标题 + 描述 + 表单预览 + 提交/重置 + Schema 代码（可折叠）
// ============================================================================

import { NexusForm, useForm } from '@nexus/form-engine-react';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../../site/CodeBlock';
import type { WidgetDemo } from '../types';

interface DemoCardProps {
  demo: WidgetDemo;
}

export function DemoCard({ demo }: DemoCardProps) {
  const [form] = useForm();
  const [showCode, setShowCode] = useState(false);
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );

  // 注册 antd UI（每个示例独立引擎）
  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      setSubmitted(form.getAllValues());
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSubmitted(null);
  };

  return (
    <Card title={demo.title} style={{ marginBottom: 16 }}>
      {demo.description && (
        <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
          {demo.description}
        </Typography.Paragraph>
      )}

      <NexusForm
        form={form}
        schema={demo.schema as never}
        footer={false}
        initialValues={demo.initialValues}
      />

      <Space style={{ marginTop: 16 }}>
        <Button type='primary' onClick={handleSubmit}>
          提交
        </Button>
        <Button onClick={handleReset}>重置</Button>
        <Button type='link' onClick={() => setShowCode((v) => !v)}>
          {showCode ? '收起 Schema' : '查看 Schema'}
        </Button>
      </Space>

      {submitted && (
        <Alert
          type='success'
          showIcon
          message='提交数据'
          description={
            <pre style={{ margin: 0, fontSize: 12 }}>
              {JSON.stringify(submitted, null, 2)}
            </pre>
          }
          style={{ marginTop: 16 }}
        />
      )}

      {showCode && (
        <div style={{ marginTop: 16 }}>
          <CodeBlock
            code={JSON.stringify(demo.schema, null, 2)}
            lang='json'
            title='Schema'
          />
        </div>
      )}
    </Card>
  );
}
