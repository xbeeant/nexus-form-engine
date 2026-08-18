// ============================================================================
// BenchmarkPage — 性能压测页
// 目标：验证「依赖图 O(k) 联动」与「按路径精准订阅」在千字段规模下的表现
// 指标：引擎初始化 / React 首帧渲染 / 单字段更新 / 批量更新 / 依赖传播 / 全量校验
// ============================================================================

import { useForm } from '@xbeeant/form-engine-react';
import { NexusForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Alert, Button, Card, InputNumber, Segmented, Space, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { MainArea } from '../site/MainArea';

interface Metric {
  label: string;
  duration: number;
  note?: string;
}

const PRESETS = [100, 500, 1000, 2000] as const;

function generateBenchmarkSchema(count: number) {
  const properties: Record<string, unknown> = {};
  // 联动源：前 200 个字段的 requiredOn 依赖此字段（测试 O(k) 传播）
  properties.trigger = {
    type: 'string',
    widget: 'select',
    title: '联动源（影响前 200 个字段的必填）',
    enum: ['A', 'B', 'C', 'D'],
    enumNames: ['选项 A', '选项 B', '选项 C', '选项 D'],
  };
  for (let i = 0; i < count; i++) {
    properties[`field_${i}`] = {
      type: 'string',
      widget: i % 10 === 0 ? 'select' : 'input',
      title: `字段 ${i}`,
      ...(i % 10 === 0 ? { enum: ['A', 'B', 'C', 'D'], enumNames: ['选项 A', '选项 B', '选项 C', '选项 D'] } : {}),
      ...(i < 200
        ? { requiredOn: '{{ formData.trigger === "B" }}' }
        : {}),
    };
  }
  return { type: 'object', properties };
}

export default function BenchmarkPage() {
  const [form] = useForm();
  const [fieldCount, setFieldCount] = useState(1000);
  const [schema, setSchema] = useState<ReturnType<typeof generateBenchmarkSchema> | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [rendering, setRendering] = useState(false);
  const [fieldDomCount, setFieldDomCount] = useState(0);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  const run = (label: string, fn: () => void) => {
    const t0 = performance.now();
    fn();
    const duration = performance.now() - t0;
    setMetrics((prev) => [...prev, { label, duration }]);
    return duration;
  };

  const handleGenerate = () => {
    const schemaResult = run('Schema 生成（纯 JS 对象）', () =>
      generateBenchmarkSchema(fieldCount),
    );
    const generated = generateBenchmarkSchema(fieldCount);
    const t0 = performance.now();
    form._getEngine().init(generated as never);
    const initMs = performance.now() - t0;
    setMetrics([
      { label: 'Schema 生成（纯 JS 对象）', duration: schemaResult },
      { label: 'engine.init（Parser 解析 + 依赖图构建）', duration: initMs },
    ]);
    mountedAtRef.current = performance.now();
    setRendering(true);
    setSchema(generated);
  };

  const handleSingleUpdate = () => {
    const engine = form._getEngine();
    run('单字段更新（setFieldValue × 1 → 提交渲染）', () => {
      engine.setFieldValue('field_0', `value-${Date.now() % 1000}`);
    });
  };

  const handleBatchUpdate = () => {
    const engine = form._getEngine();
    run('批量更新（setFieldValue × 100）', () => {
      for (let i = 0; i < 100; i++) {
        engine.setFieldValue(`field_${i}`, `batch-${i}`);
      }
    });
  };

  const handlePropagation = () => {
    const engine = form._getEngine();
    run('依赖传播（trigger → 200 个 requiredOn 依赖字段）', () => {
      engine.setFieldValue('trigger', 'B');
    });
  };

  const handleValidate = async () => {
    const t0 = performance.now();
    await form.validateFields();
    const duration = performance.now() - t0;
    setMetrics((prev) => [...prev, { label: '全量校验（validateFields）', duration }]);
  };

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          性能压测
        </Typography.Title>
        <Typography.Paragraph type='secondary'>
          验证显式依赖图（O(k) 联动）与按路径精准订阅在千字段规模下的表现：
          字段值变化不会重建渲染树，仅受影响字段重渲染。
        </Typography.Paragraph>

        <Card size='small' style={{ marginBottom: 16 }} title='配置'>
          <Space wrap>
            <span>字段数量：</span>
            <Segmented
              value={fieldCount}
              onChange={(v) => setFieldCount(v as number)}
              options={PRESETS.map((n) => ({ label: `${n}`, value: n }))}
            />
            <InputNumber
              min={10}
              max={5000}
              value={fieldCount}
              onChange={(v) => v && setFieldCount(v)}
            />
            <Button type='primary' onClick={handleGenerate}>
              生成并渲染
            </Button>
            <Button
              disabled={!schema}
              onClick={() => {
                form.resetFields();
                setMetrics((prev) => [...prev, { label: 'resetFields', duration: 0 }]);
              }}
            >
              重置
            </Button>
          </Space>
        </Card>

        {schema && (
          <>
            <Card
              size='small'
              style={{ marginBottom: 16 }}
              title={`耗时指标（ms，仅供参考，数值越小越好）${rendering ? ' · 渲染中…' : ''}`}
            >
              {metrics.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                  <span style={{ width: 320, flexShrink: 0 }}>{m.label}</span>
                  <Typography.Text strong style={{ width: 100 }}>
                    {m.duration.toFixed(2)} ms
                  </Typography.Text>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                    {m.note}
                  </Typography.Text>
                </div>
              ))}
              <Space style={{ marginTop: 12 }}>
                <Button size='small' onClick={handleSingleUpdate}>
                  单字段更新
                </Button>
                <Button size='small' onClick={handleBatchUpdate}>
                  批量更新 100 字段
                </Button>
                <Button size='small' onClick={handlePropagation}>
                  触发 200 字段联动
                </Button>
                <Button size='small' onClick={handleValidate}>
                  全量校验
                </Button>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                  已渲染字段：{fieldDomCount}
                </Typography.Text>
              </Space>
            </Card>

            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 16 }}
              message='观察要点'
              description='输入时仅当前字段重渲染（React DevTools 高亮可见）；联动 trigger 变化时仅 200 个依赖字段重渲染，其余字段不受影响。'
            />

            <NexusForm
              key={`bench-${fieldCount}`}
              form={form}
              schema={schema as never}
              footer={false}
              onMount={() => {
                const duration = performance.now() - mountedAtRef.current;
                setMetrics((prev) => [
                  ...prev,
                  { label: 'React 首帧渲染（NexusForm 挂载 → onMount）', duration },
                ]);
                setFieldDomCount(
                  document.querySelectorAll('[data-nexus-field]').length,
                );
                setRendering(false);
              }}
            />
          </>
        )}
      </div>
    </MainArea>
  );
}