// ============================================================================
// AdvancedWidgetsPage — 高级 antd 组件演示
// 覆盖 antd 6.x 表单组件：AutoComplete / Cascader / Mentions / Segmented /
// Transfer / File（Upload）+ Space 间距布局，以及设计器属性定义（widgetSchemas）
// ============================================================================

import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Alert, Button, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import { MainArea } from '../site/MainArea';

const { Title, Paragraph } = Typography;

const advancedSchema = {
  type: 'object',
  displayType: 'column',
  properties: {
    // ── 自动完成 ──
    autoCompleteField: {
      type: 'string',
      widget: 'autoComplete',
      title: '自动完成（AutoComplete）',
      enum: ['Ant Design', 'AntV', 'ProComponents', 'Nexus Form'],
    },
    // ── 级联选择 ──
    cascaderField: {
      type: 'array',
      widget: 'cascader',
      title: '级联选择（Cascader）',
      props: {
        cascaderData: JSON.stringify([
          {
            value: 'hz',
            label: '浙江',
            children: [
              { value: 'hz', label: '杭州' },
              { value: 'nb', label: '宁波' },
            ],
          },
          {
            value: 'js',
            label: '江苏',
            children: [{ value: 'nj', label: '南京' }],
          },
        ]),
      },
    },
    // ── 提及 ──
    mentionsField: {
      type: 'string',
      widget: 'mentions',
      title: '提及（Mentions）',
      description: '输入 @ 触发候选',
      enum: ['Alice', 'Bob', 'Charlie'],
    },
    // ── 分段控制器 ──
    segmentedField: {
      type: 'string',
      widget: 'segmented',
      title: '分段控制器（Segmented）',
      enum: ['daily', 'weekly', 'monthly'],
      enumNames: ['每日', '每周', '每月'],
    },
    // ── 穿梭框 ──
    transferField: {
      type: 'array',
      widget: 'transfer',
      title: '穿梭框（Transfer）',
      props: {
        transferData: JSON.stringify([
          { key: 'a', title: '选项 A' },
          { key: 'b', title: '选项 B' },
          { key: 'c', title: '选项 C' },
          { key: 'd', title: '选项 D' },
        ]),
      },
    },
    // ── 文件上传 ──
    fileField: {
      type: 'array',
      widget: 'file',
      title: '文件上传（Upload）',
      props: {
        action: '/api/upload',
        accept: '.pdf,.doc,image/*',
        multiple: true,
        maxCount: 5,
      },
    },
  },
};

export default function AdvancedWidgetsPage() {
  const [form] = useForm();
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  const handleSubmit = async () => {
    await form.submit();
    const values = form.getAllValues();
    setSubmitted(values);
  };

  return (
    <MainArea>
      <div
        style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 64px' }}
      >
        <Title level={2}>高级 antd 组件</Title>
        <Paragraph>
          6 个 antd 6.x 表单组件 + Space 布局，均可在设计器中使用，并通过
          widgetSchemas 定义组件属性（PropertyPanel「组件属性」分区）。
        </Paragraph>

        <Space orientation='vertical' size={16} style={{ width: '100%' }}>
          <NexusForm
            form={form}
            schema={advancedSchema as never}
            footer={false}
          />

          <Button type='primary' onClick={handleSubmit}>
            提交
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

        <CodeBlock
          code={JSON.stringify(advancedSchema, null, 2)}
          lang='json'
          title='Schema'
        />
      </div>
    </MainArea>
  );
}
