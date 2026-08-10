// ============================================================================
// @nexus/form-engine-designer — 右侧属性配置面板
// 属性定义采用「描述符驱动」：
//   - 组件（widget）属性来自外部传入的 propertySchemaMap（key 为 widget 名，
//     值为该组件的属性字段定义，示例见 @nexus/form-engine-ui/src/schema/*-schema.ts）
//   - 通用 / 校验 / 依赖分区在 ./property/basic-property.ts 中定义
//   - 布局节点与表单级属性在下方 formLevelProps / layoutBasicProps 内联定义
//
// 编辑流程（与 schemaUtils 的读/写通路对应）：
//   flattenNodeForPropertyEditor  → 节点 → 扁平 initialValues（读）
//   updateNodeWithNesting         → 扁平 patch → 节点（写，split schema级/props级）
//   PropertyForm 通过 NexusForm 渲染 propertySchema 描述符驱动的表单
// ============================================================================

import type { NexusSchema, SchemaNode } from '@nexus/form-engine';
import { NexusForm, useForm } from '@nexus/form-engine-react';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { Button, Input } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useDesigner } from './DesignerContext';
import {
  commonPropertyFields,
  dependencyPropertyFields,
  validationPropertyFields,
} from './property/basic-property.ts';
import {
  flattenNodeForPropertyEditor,
  getNodeAtProperties,
} from './schemaUtils';
import { propertyWidgets } from './widgets';

// ────────────────────────────────────────────────────────────────────────────
// PropertyForm — 属性表单容器
// Designer 的自定义属性编辑器独立于 form-engine 的渲染系统
// ────────────────────────────────────────────────────────────────────────────

interface PropertyFormProps {
  schema: NexusSchema;
  initialValues: Record<string, unknown>;
  onValuesChange: (allValues: Record<string, unknown>) => void;
}

function PropertyForm({
  schema,
  initialValues,
  onValuesChange,
}: PropertyFormProps) {
  const [form] = useForm();
  const engine = form._getEngine();

  // 注册 antd 基础 widget（select/input/switch/number/textarea/collapse/collapsePanel）
  registerAntdUI(engine);
  // '#' 全局 watcher 由 FormController._onFieldValueChange 调用时
  // 只传入一个参数（globalData，即全部表单值），故直接取首个参数
  const handleWatch = useCallback(
    (value: unknown) => {
      onValuesChange(value as Record<string, unknown>);
    },
    [onValuesChange],
  );

  return (
    <NexusForm
      footer={false}
      form={form}
      schema={schema}
      initialValues={initialValues}
      watch={{ '#': handleWatch }}
      widgets={propertyWidgets}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 表单级属性（未选中节点时编辑 NexusSchema 顶层配置）
// ────────────────────────────────────────────────────────────────────────────

const formLevelProps: Record<string, SchemaNode> = {
  displayType: {
    widget: 'select',
    type: 'string',
    title: '表单布局方向（displayType）',
    props: {
      options: [
        { label: '水平（row）', value: 'row' },
        { label: '垂直（column）', value: 'column' },
        { label: '行内（inline）', value: 'inline' },
      ],
    },
  },
  labelWidth: {
    widget: 'input',
    type: 'string',
    title: 'label 宽度（labelWidth）',
    placeholder: '如 120 或 20%',
  },
  colon: {
    widget: 'switch',
    type: 'boolean',
    title: '显示冒号（colon）',
  },
  label: {
    widget: 'switch',
    type: 'boolean',
    title: '显示 label（label）',
  },
  readOnly: {
    widget: 'switch',
    type: 'boolean',
    title: '整个表单只读（readOnly）',
  },
  column: {
    widget: 'number',
    type: 'number',
    title: '每行显示列数（column）',
  },
};

// ────────────────────────────────────────────────────────────────────────────
// 布局节点基础属性（layout nodes 不在 propertySchemaMap 中，单独定义）
// ────────────────────────────────────────────────────────────────────────────

const layoutBasicProps: Record<string, SchemaNode> = {
  column: { widget: 'number', type: 'number', title: '列数（column）' },
  gap: { widget: 'number', type: 'number', title: '间距（gap）' },
  direction: {
    widget: 'select',
    type: 'string',
    title: '方向（direction）',
    props: {
      options: [
        { label: '水平', value: 'row' },
        { label: '垂直', value: 'column' },
      ],
    },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// collapseSection — 将一组扁平字段包裹成单个 collapse 分区
// collapse / collapsePanel 均为布局节点，key 不进入数据路径，
// 因此其内部字段（title / validate / bind 等）会被扁平地暴露给属性表单。
// ────────────────────────────────────────────────────────────────────────────

function collapseSection(
  key: string,
  title: string,
  fields: Record<string, SchemaNode>,
): Record<string, SchemaNode> {
  // @ts-expect-error
  return {
    [key]: {
      type: 'collapsePanel',
      title,
      properties: fields,
    },
  } as unknown as SchemaNode;
}

// ────────────────────────────────────────────────────────────────────────────
// KeyEditor — 单独处理 key 的编辑器
// key 不是 SchemaNode 的属性，而是 properties 的索引键
// 修改 key = schema 结构级操作：删除旧 key + 添加新 key + 更新选中路径
// ────────────────────────────────────────────────────────────────────────────

interface KeyEditorProps {
  oldKey: string;
  locked?: boolean;
  onRename: (newKey: string) => void;
}

function KeyEditor({ oldKey, locked, onRename }: KeyEditorProps) {
  const [value, setValue] = useState(oldKey);

  if (locked) {
    return (
      <div className='mb-3 pb-2 border-b border-[#f0f0f0]'>
        <div className='text-[11px] text-[#999] mb-1'>字段标识（key）</div>
        <div className='flex items-center gap-2'>
          <code className='text-[13px] bg-[#f5f5f5] px-2 py-0.5 rounded flex-1 font-mono'>
            {oldKey}
          </code>
          <span className='text-[11px] text-[#999]'>🔒 锁定</span>
        </div>
      </div>
    );
  }

  const onChange = (v: string) => {
    setValue(v);
    onRename(v);
  };

  return (
    <div className='mb-3 pb-2 border-b border-[#f0f0f0]'>
      <div className='text-[11px] text-[#999] mb-1'>字段标识（key）</div>
      <div className='flex items-center gap-1.5'>
        <Input
          size='small'
          value={value}
          onChange={(e) => {
            const trimmed = (e.target.value || '').trim();
            onChange(trimmed);
          }}
          autoFocus
          className='flex-1'
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PropertyPanel — 主组件
// ────────────────────────────────────────────────────────────────────────────

export function PropertyPanel() {
  const {
    schema,
    selectedPath,
    updateNode,
    renameNode,
    selectNode,
    setSchema,
    propertySchemaMap,
  } = useDesigner();

  const selectedNode =
    selectedPath && selectedPath.length > 0
      ? getNodeAtProperties(schema.properties, selectedPath)
      : undefined;

  const isFormLevel = !selectedPath || selectedPath.length === 0;

  // 选择变化时强制重建引擎（nodeVersion bump）
  const formKey = `node_${(selectedPath || []).join('_')}_${(selectedNode as { type?: string } | undefined)?.type || 'root'}`;

  // key 的特殊性：从 path 最后一段提取，不通过 NexusForm 管理
  const currentKey = selectedPath?.[selectedPath.length - 1] ?? '';
  const keyLocked =
    (selectedNode as unknown as Record<string, unknown> | undefined)
      ?._lockedKey === true;

  // 选中节点的 widget/type：决定属性面板使用哪组组件属性；
  // 仅在切换节点（widget/type 改变）时重新计算，避免每次输入都重建 schema
  // （selectedNode 的 object identity 会随每次 edit 变化，不能直接依赖）
  const selectedWidgetKey = selectedNode
    ? (selectedNode.widget as string | undefined) ||
      (selectedNode.type as string)
    : null;

  // 构建属性表单 schema：
  // - 未选中节点（form-level）：formLevelProps（NexusSchema 顶层配置）
  // - 选中节点：4 个 collapse 分区（通用属性 / 组件属性 / 校验配置 / 依赖配置）
  //   collapse 与 collapsePanel 均为布局节点，key 不进入数据路径，
  //   各分区内部字段会被扁平暴露给属性表单。
  // 注意：不依赖 selectedNode 对象本身（每次 edit 都是新引用），
  // 只依赖 isFormLevel 和 selectedWidgetKey，避免无谓 re-init。
  const formSchema = useMemo<NexusSchema>(() => {
    if (isFormLevel) {
      return {
        type: 'object',
        properties: formLevelProps,
        displayType: 'column',
      } as NexusSchema;
    }

    const widgetProps =
      propertySchemaMap[selectedWidgetKey as string] || layoutBasicProps;

    return {
      type: 'object',
      properties: {
        sectionProperty: {
          widget: 'collapse',
          props: {
            defaultActiveKey: ['sectionCommon', 'sectionFieldProps'],
          },
          type: 'collapse',
          properties: {
            ...collapseSection(
              'sectionCommon',
              '通用属性',
              commonPropertyFields,
            ),
            ...collapseSection('sectionFieldProps', '组件属性', widgetProps),
            ...collapseSection(
              'sectionValidation',
              '校验配置',
              validationPropertyFields,
            ),
            ...collapseSection(
              'sectionDependency',
              '依赖配置',
              dependencyPropertyFields,
            ),
          },
        },
      },
      displayType: 'column',
    } as NexusSchema;
  }, [isFormLevel, selectedWidgetKey, propertySchemaMap]);

  const handleValuesChange = useCallback(
    (allValues: Record<string, unknown>) => {
      // 跳过 undefined 值（避免写入无意义字段）
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(allValues)) {
        if (v === undefined) {
          continue;
        }
        patch[k] = v;
      }
      if (Object.keys(patch).length === 0) {
        return;
      }

      if (!selectedPath || selectedPath.length === 0) {
        // form-level：修改 NexusSchema 顶层属性
        setSchema({ ...schema, ...patch });
        return;
      }

      // 节点级：key 已由 KeyEditor 单独处理，此处跳过
      const { key: _key, ...rest } = patch;
      if (Object.keys(rest).length > 0) {
        updateNode(selectedPath, rest);
      }
    },
    [selectedPath, updateNode, setSchema, schema],
  );

  const handleRename = useCallback(
    (newKey: string) => {
      if (!selectedPath || selectedPath.length === 0) {
        return;
      }
      renameNode(selectedPath, newKey);
    },
    [selectedPath, renameNode],
  );

  return (
    <div className='border-l border-[#f0f0f0] overflow-y-auto px-4 py-3 bg-white h-full'>
      {/* 导航头 */}
      <div className='font-semibold mb-3 pb-2 border-b border-[#f0f0f0] flex items-center'>
        {selectedPath && selectedPath.length > 0 ? (
          <Button
            type='link'
            size='small'
            onClick={() => selectNode(null)}
            style={{ padding: 0, marginRight: 8 }}
          >
            ← 表单属性
          </Button>
        ) : null}
        {isFormLevel ? '表单属性' : '节点属性'}
      </div>

      {/* key 特殊性处理：key 不是 SchemaNode 属性，而是 properties 索引键 */}
      {!isFormLevel && currentKey && (
        <KeyEditor
          oldKey={currentKey}
          locked={keyLocked}
          onRename={handleRename}
        />
      )}

      {/* 属性表单：完全基于 descriptor 驱动 */}
      <PropertyForm
        key={formKey}
        schema={formSchema}
        initialValues={
          selectedNode
            ? flattenNodeForPropertyEditor(
                selectedNode as unknown as Record<string, any>,
              )
            : (schema as unknown as Record<string, any>)
        }
        onValuesChange={handleValuesChange}
      />
    </div>
  );
}
