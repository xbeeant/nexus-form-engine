// ============================================================================
// DevToolsPage — 开发工具演示页
// 左侧一个常规表单，右下角悬浮 NexusDevTools 调试面板：
//  1. 字段状态：value/errors/visible/required/版本号一览
//  2. 依赖关系：依赖源与依赖方可视化（需要输入路径）
//  3. 事件时间线：init/值变更/校验/数组操作全记录
// ============================================================================

import { NexusDevTools } from '@xbeeant/form-engine-devtools';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Alert, Card, Typography } from 'antd';
import { useEffect } from 'react';
import { MainArea } from '../site/MainArea';

const devSchema = {
  type: 'object',
  properties: {
    country: {
      type: 'string',
      widget: 'select',
      title: '国家',
      enum: ['CN', 'US', 'JP'],
      enumNames: ['中国', '美国', '日本'],
    },
    province: {
      type: 'string',
      widget: 'input',
      title: '省份',
      required: "{{ formData.country === 'CN' }}",
    },
    amount: {
      type: 'number',
      widget: 'number',
      title: '金额',
    },
    tags: {
      type: 'array',
      widget: 'simpleList',
      title: '标签',
      items: { type: 'string' },
    },
  },
};

export default function DevToolsPage() {
  const [form] = useForm();

  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  return (
    <MainArea>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 48px' }}>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          开发工具
        </Typography.Title>
        <Typography.Paragraph type='secondary'>
          调试面板悬浮于右下角：操作表单后观察字段状态、依赖关系与事件时间线。
          依赖关系 Tab 中输入字段路径（如{' '}
          <Typography.Text code>country</Typography.Text>）查看联动边。
        </Typography.Paragraph>

        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
          message='体验路径'
          description='1) 字段状态：country 选择「中国」后 province 变为必填（required 标记出现）；2) 事件时间线：每次输入都会记录 value/validate-field 事件；3) 依赖关系：输入 country 可看到 province 依赖它。'
        />

        <Card size='small' title='演示表单'>
          <NexusForm form={form} schema={devSchema as never} />
        </Card>

        <NexusDevTools engine={form._getEngine()} />
      </div>
    </MainArea>
  );
}
