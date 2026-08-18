// ============================================================================
// NexusDevTools — 表单引擎调试面板
// 三个 Tab：
//  1. 字段状态：全量字段的 value/errors/visible/required/version 一览
//  2. 依赖关系：依赖源（getDependencies）与依赖方（getDependents）可视化
//  3. 事件时间线：DevToolsEventPlugin 采集的引擎生命周期事件
// 数据均来自 engine 公开 API（subscribeStore 订阅刷新），不侵入 Core 行为。
// ============================================================================

import type { FieldState, NexusEngine } from '@xbeeant/form-engine';
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEVTOOLS_PLUGIN_NAME,
  DevToolsEventPlugin,
  EVENT_COLORS,
  EVENT_LABELS,
  type DevToolsEvent,
} from './timeline';

export interface NexusDevToolsProps {
  /** 表单引擎实例 */
  engine: NexusEngine;
  /** 默认是否展开，默认 false */
  defaultOpen?: boolean;
}

/** 值展示截断长度 */
const VALUE_MAX = 40;

function formatValue(value: unknown): string {
  try {
    const text = JSON.stringify(value);
    if (text === undefined) {
      return 'undefined';
    }
    return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX)}…` : text;
  } catch {
    return String(value);
  }
}

/** 格式化耗时（性能标记） */
function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString('zh-CN', { hour12: false });
}

// ────────────────────────────────────────────────────────────────────────────
// 字段状态 Tab
// ────────────────────────────────────────────────────────────────────────────

function FieldStateTable({
  engine,
  filter,
}: {
  engine: NexusEngine;
  filter: string;
}) {
  const [tick, setTick] = useState(0);

  // 数据与结构变化（init/reset/setSchema）均刷新（rAF 节流）
  useEffect(() => {
    let raf = 0;
    const refresh = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    // 订阅后立即同步一次：引擎可能在面板挂载前已完成 init（bump 早于订阅）
    refresh();
    const unsubStore = engine.subscribeStore(refresh);
    const unsubRender = engine.subscribeRender(refresh);
    return () => {
      cancelAnimationFrame(raf);
      unsubStore();
      unsubRender();
    };
  }, [engine]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick 为订阅刷新信号
  const states = useMemo(() => {
    const list = Array.from(engine.getAllFieldStates().values());
    const keyword = filter.trim().toLowerCase();
    if (!keyword) {
      return list;
    }
    return list.filter((s) => s.path.toLowerCase().includes(keyword));
  }, [engine, filter, tick]);

  return (
    <List
      size='small'
      dataSource={states}
      renderItem={(state: FieldState) => (
        <List.Item style={{ padding: '6px 4px', gap: 8 }}>
          <Space style={{ minWidth: 0, flex: 1 }} align='start'>
            <Typography.Text code style={{ fontSize: 12 }} ellipsis>
              {state.path}
            </Typography.Text>
            {state.meta?.widget && (
              <Tag style={{ fontSize: 11 }}>{state.meta.widget}</Tag>
            )}
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              = {formatValue(state.value)}
            </Typography.Text>
          </Space>
          <Space size={4} wrap>
            {state.errors.length > 0 && (
              <Badge
                count={state.errors.length}
                size='small'
                color='red'
                title={state.errors.join('；')}
              />
            )}
            {!state.visible && (
              <Tag color='default' style={{ fontSize: 11 }}>
                hidden
              </Tag>
            )}
            {state.required && (
              <Tag color='orange' style={{ fontSize: 11 }}>
                required
              </Tag>
            )}
            {state.disabled && (
              <Tag color='default' style={{ fontSize: 11 }}>
                disabled
              </Tag>
            )}
            {state.dirty && (
              <Tag color='blue' style={{ fontSize: 11 }}>
                dirty
              </Tag>
            )}
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              v{engine.getFieldVersion(state.path)}
            </Typography.Text>
          </Space>
        </List.Item>
      )}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 依赖关系 Tab
// ────────────────────────────────────────────────────────────────────────────

function DependencyView({ engine }: { engine: NexusEngine }) {
  const [tick, setTick] = useState(0);
  const [path, setPath] = useState('');

  useEffect(() => {
    // 订阅后立即同步一次：引擎可能在面板挂载前已完成 init（bump 早于订阅）
    setTick((t) => t + 1);
    const unsub = engine.subscribeRender(() => setTick((t) => t + 1));
    return unsub;
  }, [engine]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick 为订阅刷新信号
  const states = useMemo(
    () => Array.from(engine.getAllFieldStates().values()),
    [engine, tick],
  );

  const dependencies = useMemo(() => {
    if (!path) {
      return [];
    }
    return Array.from(engine.getDependencies(path));
  }, [engine, path]);

  const dependents = useMemo(() => {
    if (!path) {
      return [];
    }
    return Array.from(engine.getDependents(path));
  }, [engine, path]);

  return (
    <div>
      <Input.Search
        placeholder='输入字段路径（如 fieldA）'
        allowClear
        onSearch={setPath}
        style={{ marginBottom: 8 }}
      />
      {!path ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ fontSize: 12 }}>
              共 {states.length} 个字段，输入路径查看依赖关系
            </span>
          }
        />
      ) : (
        <div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            依赖源（{dependencies.length}）
          </Typography.Text>
          <div style={{ marginBottom: 8 }}>
            {dependencies.length === 0 && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                无 — 字段不依赖任何其他字段
              </Typography.Text>
            )}
            {dependencies.map((dep) => (
              <Tag key={dep} color='geekblue' style={{ fontSize: 11 }}>
                {dep}
              </Tag>
            ))}
          </div>
          <Typography.Text strong style={{ fontSize: 12 }}>
            依赖方（{dependents.length}）
          </Typography.Text>
          <div>
            {dependents.length === 0 && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                无 — 没有字段依赖它
              </Typography.Text>
            )}
            {dependents.map((dep) => (
              <Tag key={dep} color='green' style={{ fontSize: 11 }}>
                {dep}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 事件时间线 Tab
// ────────────────────────────────────────────────────────────────────────────

function EventTimeline({
  events,
  paused,
  onTogglePaused,
  onClear,
}: {
  events: DevToolsEvent[];
  paused: boolean;
  onTogglePaused: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button size='small' onClick={onTogglePaused}>
          {paused ? '继续采集' : '暂停'}
        </Button>
        <Button size='small' danger onClick={onClear}>
          清空
        </Button>
        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
          共 {events.length} 条（上限 500）
        </Typography.Text>
      </Space>
      <List
        size='small'
        dataSource={[...events].reverse()}
        locale={{ emptyText: '暂无事件 — 操作表单后此处出现记录' }}
        renderItem={(event) => (
          <List.Item style={{ padding: '4px', gap: 8 }}>
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              #{event.id}
            </Typography.Text>
            <Tag color={EVENT_COLORS[event.type]} style={{ fontSize: 11 }}>
              {EVENT_LABELS[event.type]}
            </Tag>
            {event.path && (
              <Typography.Text code style={{ fontSize: 11 }} ellipsis>
                {event.path}
              </Typography.Text>
            )}
            {event.detail !== undefined && (
              <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                {formatValue(event.detail)}
              </Typography.Text>
            )}
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              {formatTime(event.time)}
            </Typography.Text>
          </List.Item>
        )}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NexusDevTools 面板
// ────────────────────────────────────────────────────────────────────────────

export function NexusDevTools({
  engine,
  defaultOpen = true,
}: NexusDevToolsProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  // 事件时间线：面板挂载即安装采集插件（避免错过 engine.init 事件），
  // 幂等保护：同名插件已存在时跳过挂载
  const [events, setEvents] = useState<DevToolsEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (engine.hasPlugin(DEVTOOLS_PLUGIN_NAME)) {
      return;
    }
    const plugin = new DevToolsEventPlugin({
      onEvent: () => {
        setEvents([...plugin.getEvents()]);
      },
      isPaused: () => pausedRef.current,
    });
    engine.use(plugin);
    setEvents([...plugin.getEvents()]);
    return undefined;
  }, [engine]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        width: open ? 460 : 'auto',
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        borderRadius: 8,
        background: '#fff',
      }}
    >
      <Card
        size='small'
        title={
          <Space size={6}>
            <span>🐞 表单引擎调试</span>
            <Tag color='blue' style={{ fontSize: 11 }}>
              dev only
            </Tag>
          </Space>
        }
        extra={
          <Button size='small' type='link' onClick={toggle}>
            {open ? '收起' : '展开'}
          </Button>
        }
        styles={{ body: { padding: 0, maxHeight: 480, overflow: 'auto' } }}
      >
        {open && (
          <Tabs
            size='small'
            defaultActiveKey='fields'
            items={[
              {
                key: 'fields',
                label: '字段状态',
                children: <FieldStateTable engine={engine} filter='' />,
              },
              {
                key: 'deps',
                label: '依赖关系',
                children: <DependencyView engine={engine} />,
              },
              {
                key: 'events',
                label: '事件时间线',
                children: (
                  <EventTimeline
                    events={events}
                    paused={paused}
                    onTogglePaused={() => setPaused((p) => !p)}
                    onClear={() => setEvents([])}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export default NexusDevTools;
