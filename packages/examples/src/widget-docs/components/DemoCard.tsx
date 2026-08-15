// ============================================================================
// DemoCard — 单个示例实例卡片
// 结构：标题 + 描述 + 表单预览 + 提交/重置 + Schema 代码（可折叠）
// 布局：左右分栏，组件预览区与文档区（描述 + Schema）各自独立溢出滚动
// ============================================================================

import { NexusForm, useForm } from '@nexus/form-engine-react';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { Alert, Button, Card, Flex, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../../site/CodeBlock';
import type { WidgetDemo } from '../types';

interface DemoCardProps {
  demo: WidgetDemo;
}

const PREVIEW_HEIGHT = 360;

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
      <Flex gap={16} align='stretch' style={{ minHeight: PREVIEW_HEIGHT + 44 }}>
        {/* 左栏：组件预览区（独立滚动） */}
        <div
          style={{
            flex: '0 0 56%',
            maxWidth: 640,
            minWidth: 0,
            paddingRight: 16,
            borderRight: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: PREVIEW_HEIGHT,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 4,
            }}
          >
            <NexusForm
              form={form}
              schema={demo.schema as never}
              footer={false}
              initialValues={demo.initialValues}
            />
          </div>

          <Space style={{ marginTop: 12 }}>
            <Button type='primary' onClick={handleSubmit}>
              提交
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button type='link' onClick={() => setShowCode((v) => !v)}>
              {showCode ? '收起 Schema' : '查看 Schema'}
            </Button>
          </Space>
        </div>

        {/* 右栏：文档区（描述 + Schema，独立滚动） */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              height: PREVIEW_HEIGHT,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 4,
            }}
          >
            {demo.description && (
              <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
                {demo.description}
              </Typography.Paragraph>
            )}

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
              />
            )}

            {showCode && (
              <CodeBlock
                code={JSON.stringify(demo.schema, null, 2)}
                lang='json'
                title='Schema'
              />
            )}

            {!demo.description && !submitted && !showCode && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                点击「查看 Schema」展开本示例的 Schema 定义
              </Typography.Text>
            )}
          </div>
        </div>
      </Flex>
    </Card>
  );
}
