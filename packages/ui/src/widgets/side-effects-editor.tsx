import type { FieldState } from '@xbeeant/form-engine';
import { NexusContext } from '@xbeeant/form-engine-react';
import { Button, Drawer, Modal } from 'antd';
import { useContext, useMemo, useState } from 'react';

// ============================================================================
// SideEffectsEditor — 附带编辑器 / 点击动作（x-render `sideEffects` / `onClickAction` 对齐）
//
// 字段声明 `sideEffects` 后，在控件下方渲染「编辑」入口：
// - 点击弹出 Modal / Drawer（默认 modal）
// - 弹窗内渲染 `sideEffects.editor` 命名的编辑器组件（默认 textarea）
// - 编辑器是接收 value/onChange 的一等组件，保存后以字符串写回字段
//
// 编辑器查找优先级：engine.getEditor(editor) → 回退内置 `textarea` 编辑器
// （未注册 `editor` 组件名的 UI 场景也能开箱即用）。
// ============================================================================

interface SideEffectsEditorProps {
  /** 附带编辑器配置（已解析进 meta） */
  sideEffects?: FieldState['meta']['sideEffects'];
  /** 当前字段值 */
  value?: unknown;
  /** 字段值变化回调 */
  onChange?: (v: unknown) => void;
  /** 字段数据路径（用于文本编辑器 placeholder 等） */
  dataPath?: string;
}

/** 内置回退编辑器：textarea 多行编辑（默认） */
function TextareaEditor({
  value,
  onChange,
  ...rest
}: {
  value?: unknown;
  onChange?: (v: unknown) => void;
  [key: string]: unknown;
}) {
  return (
    <textarea
      value={value as string | undefined}
      onChange={(e) => onChange?.(e.target.value)}
      // 撑满弹窗：textarea 由外层容器约束尺寸
      className='w-full h-full p-2 border border-black/15 rounded-md resize-none focus:outline-none focus:border-blue-500'
      rows={8}
      {...rest}
    />
  );
}

export function SideEffectsEditor({
  sideEffects,
  value,
  onChange,
  dataPath,
}: SideEffectsEditorProps) {
  const { engine } = useContext(NexusContext) ?? { engine: undefined };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  // 归一化：字符串简写（'textarea'）→ 对象形态 {'editor': 'textarea'}
  const cfg =
    typeof sideEffects === 'string' ? { editor: sideEffects } : sideEffects;
  const editorName = cfg?.editor ?? 'textarea';
  const Editor = useMemo(
    () => engine?.getEditor(editorName),
    [engine, editorName],
  );
  const editorProps = cfg?.props;

  const handleOpen = () => {
    setDraft(value);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setDraft(undefined);
  };

  const handleSave = () => {
    onChange?.(draft);
    setOpen(false);
    setDraft(undefined);
  };

  if (!cfg) {
    return null;
  }

  const title = cfg.title ?? '编辑内容';
  const mode = cfg.mode ?? 'modal';
  const triggerNode = (
    <Button size='small' type='dashed' onClick={handleOpen} className='mt-1'>
      {cfg.title ?? '编辑'}
    </Button>
  );

  // 编辑器内容：优先声明的编辑器组件，回退内置 textarea（无引擎/未注册时）
  const editorNode = Editor ? (
    <Editor
      value={draft}
      onChange={setDraft}
      dataPath={dataPath}
      {...editorProps}
    />
  ) : (
    <TextareaEditor value={draft} onChange={setDraft} {...editorProps} />
  );

  const commonProps = {
    open,
    title,
    onClose: handleClose,
    // body 撑满避免编辑器尺寸塌陷
    styles: { body: { minHeight: 240, padding: 16 } },
  };

  return (
    <div data-nexus-side-effects>
      {triggerNode}
      {mode === 'drawer' ? (
        <Drawer
          {...commonProps}
          extra={
            <>
              <Button onClick={handleClose} className='mr-2'>
                取消
              </Button>
              <Button type='primary' onClick={handleSave}>
                保存
              </Button>
            </>
          }
        >
          {open ? editorNode : null}
        </Drawer>
      ) : (
        <Modal
          {...commonProps}
          onOk={handleSave}
          onCancel={handleClose}
          okText='保存'
          cancelText='取消'
          destroyOnHidden
        >
          {open ? editorNode : null}
        </Modal>
      )}
    </div>
  );
}
