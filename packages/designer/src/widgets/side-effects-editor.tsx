// ============================================================================
// SideEffectsEditor — 配置字段的附带编辑器（x-render sideEffects / onClickAction 对齐）
// 编辑 { editor, title, mode, props } 结构：
// - editor：编辑器 widget 名称（textarea / html 等，可输入自定义）
// - title：入口按钮 / 弹窗标题文案
// - mode：modal（弹窗）/ drawer（抽屉）
// ============================================================================

import type { WidgetProps } from '@xbeeant/form-engine-ui';
import { Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface SideEffectsValue {
  editor?: string;
  title?: string;
  mode?: 'modal' | 'drawer';
}

const EDITOR_OPTIONS = [
  { value: 'textarea', label: '多行文本（textarea）' },
  { value: 'html', label: '富文本（html）' },
];

export function SideEffectsEditorWidget({ value, onChange }: WidgetProps) {
  const [cfg, setCfg] = useState<SideEffectsValue>(() =>
    value && typeof value === 'object'
      ? { ...(value as SideEffectsValue) }
      : {},
  );
  const prevValueRef = useRef(value);
  const lastEmittedRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      if (value !== lastEmittedRef.current) {
        setCfg(
          value && typeof value === 'object'
            ? { ...(value as SideEffectsValue) }
            : {},
        );
      }
    }
  }, [value]);

  const commit = (patch: Partial<SideEffectsValue>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    lastEmittedRef.current = next;
    // 空配置（无 editor）时输出 undefined，表示未启用附带编辑器
    onChange(next.editor ? next : undefined);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
            编辑器（editor）
          </div>
          <Select
            size='small'
            value={cfg.editor}
            onChange={(v) => commit({ editor: v })}
            options={EDITOR_OPTIONS}
            placeholder='选择编辑器'
            showSearch
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
            按钮 / 弹窗标题
          </div>
          <Input
            size='small'
            value={cfg.title}
            onChange={(e) => commit({ title: e.target.value })}
            placeholder='编辑'
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>
            打开方式（mode）
          </div>
          <Select
            size='small'
            value={cfg.mode ?? 'modal'}
            onChange={(v) => commit({ mode: v })}
            options={[
              { value: 'modal', label: '弹窗（modal）' },
              { value: 'drawer', label: '抽屉（drawer）' },
            ]}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
        字段旁渲染「编辑」入口，点击后以编辑器弹窗/抽屉编辑字段值（x-render
        onClickAction 对齐）。
      </div>
    </div>
  );
}

export const sideEffectsEditorWidget = SideEffectsEditorWidget;
