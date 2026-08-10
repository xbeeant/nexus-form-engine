// ============================================================================
// EnumEditor — 编辑 enum 枚举值及 enumNames 枚举文案
// 使用两个 TextArea，值按行分隔
// ============================================================================

import type { WidgetProps } from '@nexus/form-engine-ui';
import { Form, Input } from 'antd';

export function EnumEditor({ value, onChange }: WidgetProps) {
  // value 是一个包含 _enum 和 _enumNames 的对象（由 engine 传入）
  // 实际上 engine 传入的 value 是字段存储的原始值
  // 这里我们使用单独的 _enum 和 _enumNames key
  // 实际上这个 widget 对应 schema 中的 _enum 字段
  // 但 engine 只传单个 value

  // 这里简化处理：value 是 _enum 的序列化字符串
  // _enumNames 通过 props 或 dependValues 传递
  // 但更简洁的方式是让 schema 中有两个独立字段

  // 这个 widget 实际上应该对应两个字段。让我们重新考虑...
  // 在 schema 中，我们只定义了一个 _enum 字段，这个 widget 渲染时
  // value 是 _enum 的值（序列化字符串）

  return (
    <>
      <Form.Item label='枚举值（enum，每行一个）' style={{ width: '100%' }}>
        <Input.TextArea
          rows={3}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder='每行一个枚举值'
        />
      </Form.Item>
      {/* _enumNames 由调用方通过额外逻辑处理 */}
      <div
        style={{ fontSize: 11, color: '#999', marginTop: -12, marginBottom: 8 }}
      >
        提示：枚举值用于选项的值，枚举文案见下方字段
      </div>
    </>
  );
}

export const enumEditorWidget = EnumEditor;

// ────────────────────────────────────────────────────────────────────────────
// EnumNamesEditor — 编辑 enumNames（与 _enum 配对使用）
// ────────────────────────────────────────────────────────────────────────────

export function EnumNamesEditor({ value, onChange }: WidgetProps) {
  return (
    <Form.Item
      label='枚举文案（enumNames，每行一个）'
      style={{ width: '100%' }}
    >
      <Input.TextArea
        rows={3}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder='每行一个枚举文案，与枚举值一一对应'
      />
    </Form.Item>
  );
}

export const enumNamesEditorWidget = EnumNamesEditor;
