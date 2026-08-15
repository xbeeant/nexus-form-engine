// ============================================================================
// RemoteDataEditor — 可视化编辑 remoteData 远程数据配置
// 表单化配置代替手写 JSON：
//   - 接口地址 / 请求方式（GET | POST）
//   - 响应字段映射（数据数组路径 / 值字段 / 文案字段）
//   - 请求参数（key-value 行编辑）
//   - 请求头（key-value 行编辑，可选）
//   - 缓存键 / 超时（可选）
// 值格式：RemoteDataConfig（见 @nexus/form-engine-ui 的 _shared.tsx）
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import {
  Button,
  Collapse,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tooltip,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { genId } from './reactionsModel';

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

interface RemoteDataForm {
  url?: string;
  method?: 'GET' | 'POST';
  dataPath?: string;
  valueKey?: string;
  labelKey?: string;
  params?: KeyValueRow[];
  headers?: KeyValueRow[];
  cacheKey?: string;
  timeout?: number;
}

/** Record → key-value 行 */
function recordToRows(
  value: Record<string, unknown> | undefined,
): KeyValueRow[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).map(([key, v]) => ({
    id: genId(),
    key,
    value: typeof v === 'string' ? v : JSON.stringify(v),
  }));
}

/** key-value 行 → Record（空 key 或空 value 的行丢弃） */
function rowsToRecord(
  rows: KeyValueRow[] | undefined,
): Record<string, unknown> | undefined {
  if (!rows) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) {
      continue;
    }
    const raw = row.value.trim();
    if (!raw) {
      continue;
    }
    // 尝试解析 JSON（数字 / 布尔 / 对象），失败保留字符串
    try {
      result[key] = JSON.parse(raw);
    } catch {
      result[key] = raw;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** RemoteDataConfig → 表单 */
function configToForm(value: unknown): RemoteDataForm {
  const cfg = (value ?? {}) as Record<string, any>;
  const rf = (cfg.responseField ?? {}) as Record<string, any>;
  const params = cfg.params;
  return {
    url: cfg.url,
    method: cfg.method,
    dataPath: rf.data,
    valueKey: rf.value,
    labelKey: rf.label,
    params:
      params && typeof params === 'object' ? recordToRows(params) : undefined,
    headers: recordToRows(cfg.headers),
    cacheKey: cfg.cacheKey,
    timeout: cfg.timeout,
  };
}

/** 表单 → RemoteDataConfig */
function formToConfig(
  form: RemoteDataForm,
): Record<string, unknown> | undefined {
  const url = form.url?.trim();
  if (!url) {
    return undefined;
  }
  const params = rowsToRecord(form.params);
  const headers = rowsToRecord(form.headers);
  const config: Record<string, unknown> = {
    url,
    method: form.method || 'GET',
    responseField: {
      data: form.dataPath?.trim() || 'data',
      value: form.valueKey?.trim() || 'value',
      label: form.labelKey?.trim() || 'label',
    },
  };
  if (params) {
    config.params = params;
  }
  if (headers) {
    config.headers = headers;
  }
  if (form.cacheKey?.trim()) {
    config.cacheKey = form.cacheKey.trim();
  }
  if (form.timeout != null) {
    config.timeout = form.timeout;
  }
  return config;
}

/** key-value 行编辑器（参数 / 请求头共用） */
function KeyValueRows({
  rows,
  onChange,
  valuePlaceholder,
  keyPlaceholder,
}: {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  valuePlaceholder: string;
  keyPlaceholder: string;
}) {
  return (
    <div style={{ width: '100%' }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <Input
            size='small'
            value={row.key}
            placeholder={keyPlaceholder}
            onChange={(e) =>
              onChange(
                rows.map((r) =>
                  r.id === row.id ? { ...r, key: e.target.value } : r,
                ),
              )
            }
          />
          <Input
            size='small'
            value={row.value}
            placeholder={valuePlaceholder}
            onChange={(e) =>
              onChange(
                rows.map((r) =>
                  r.id === row.id ? { ...r, value: e.target.value } : r,
                ),
              )
            }
          />
          <Button
            size='small'
            type='text'
            danger
            onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button
        size='small'
        type='dashed'
        block
        onClick={() => onChange([...rows, { id: genId(), key: '', value: '' }])}
      >
        + 添加
      </Button>
    </div>
  );
}

export function RemoteDataEditor({ value, onChange, title }: WidgetProps) {
  const [form, setForm] = useState<RemoteDataForm>(() => configToForm(value));
  const prevValueRef = useRef(value);
  // 自身 onChange 引发的 value 回传不应触发重建（否则每次输入都被重置）
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (value !== lastEmittedRef.current) {
        setForm(configToForm(value));
      }
    }
  }, [value]);

  const commit = (next: RemoteDataForm) => {
    setForm(next);
    const emitted = formToConfig(next);
    lastEmittedRef.current = emitted;
    onChange(emitted);
  };

  const patch = (partial: Partial<RemoteDataForm>) => {
    commit({ ...form, ...partial });
  };

  return (
    <Form.Item layout={'vertical'} label={title} style={{ width: '100%' }}>
      <Space orientation='vertical' style={{ width: '100%' }} size={8}>
        {/* 请求地址 + 方式 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Input
            size='small'
            placeholder='接口地址（必填），如 /api/options'
            value={form.url}
            onChange={(e) => patch({ url: e.target.value })}
            style={{ flex: 1 }}
          />
          <Select
            size='small'
            style={{ width: 80 }}
            value={form.method}
            onChange={(v) => patch({ method: v })}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
            ]}
          />
        </div>

        {/* 响应字段映射 */}
        <div style={{ fontSize: 11, color: '#999' }}>响应字段映射</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Tooltip title='响应数据数组的路径，如 data.list / data.result.records'>
            <Input
              size='small'
              placeholder='数据路径（默认 data）'
              value={form.dataPath}
              onChange={(e) => patch({ dataPath: e.target.value })}
              style={{ flex: 1 }}
            />
          </Tooltip>
          <Tooltip title='作为选项值（value）的字段名'>
            <Input
              size='small'
              placeholder='值字段'
              value={form.valueKey}
              onChange={(e) => patch({ valueKey: e.target.value })}
              style={{ flex: 1 }}
            />
          </Tooltip>
          <Tooltip title='作为选项文案（label）的字段名'>
            <Input
              size='small'
              placeholder='文案字段'
              value={form.labelKey}
              onChange={(e) => patch({ labelKey: e.target.value })}
              style={{ flex: 1 }}
            />
          </Tooltip>
        </div>

        {/* 请求参数 / 请求头 / 高级 */}
        <Collapse
          size='small'
          style={{ width: '100%', background: '#fafafa' }}
          items={[
            {
              key: 'params',
              label: '请求参数（可选）',
              children: (
                <KeyValueRows
                  rows={form.params ?? []}
                  onChange={(rows) => patch({ params: rows })}
                  keyPlaceholder='参数名'
                  valuePlaceholder='参数值（数字/布尔自动识别）'
                />
              ),
            },
            {
              key: 'headers',
              label: '请求头（可选）',
              children: (
                <KeyValueRows
                  rows={form.headers ?? []}
                  onChange={(rows) => patch({ headers: rows })}
                  keyPlaceholder='请求头名'
                  valuePlaceholder='如 Bearer xxxx'
                />
              ),
            },
            {
              key: 'advanced',
              label: '高级',
              children: (
                <Space
                  orientation='vertical'
                  style={{ width: '100%' }}
                  size={8}
                >
                  <div
                    style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      缓存键
                    </span>
                    <Input
                      size='small'
                      placeholder='默认按字段路径缓存'
                      value={form.cacheKey}
                      onChange={(e) => patch({ cacheKey: e.target.value })}
                    />
                  </div>
                  <div
                    style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: '#666',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      超时（秒）
                    </span>
                    <InputNumber
                      size='small'
                      min={1}
                      value={form.timeout}
                      onChange={(v) => patch({ timeout: v ?? undefined })}
                      placeholder='默认 10'
                      style={{ width: 120 }}
                    />
                  </div>
                </Space>
              ),
            },
          ]}
        />

        <div style={{ fontSize: 11, color: '#ccc' }}>
          提示：字段值变化后选项自动刷新；POST 时参数放入请求体
        </div>
      </Space>
    </Form.Item>
  );
}

export const remoteDataEditorWidget = RemoteDataEditor;
