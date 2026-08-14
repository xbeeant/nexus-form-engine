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
import { Input } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useDesigner } from './DesignerContext';
import {
  commonPropertyFields,
  dependencyPropertyFields,
  reactionPropertyFields,
  validationPropertyFields,
} from './property/basic-property.ts';
import {
  diffPropertyPatch,
  extractFormLevelConfig,
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
  onValuesChange: (
    allValues: Record<string, unknown>,
    changedFields: ReadonlySet<string>,
  ) => void;
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
  // 记录本表单实例中用户实际改动过的字段（组件随 formKey 重建，节点切换时自动重置）。
  // 用于区分「未触碰的字符串默认值 ''」与「用户主动清空」——
  // 后者需要回写 schema（删除属性），前者写回会污染 schema（如 bind:'' 导致数据 key 丢失）。
  const changedFieldsRef = useRef<Set<string>>(new Set());
  // '#' 全局 watcher 由 FormController._onFieldValueChange 调用，
  // 前两个参数为 (globalData, globalData)，第三参为本次实际变更的字段路径
  const handleWatch = useCallback(
    (value: unknown, _allValues: unknown, changedPath?: string) => {
      if (changedPath) {
        changedFieldsRef.current.add(changedPath);
      }
      onValuesChange(
        value as Record<string, unknown>,
        changedFieldsRef.current,
      );
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
    default: true,
  },
  label: {
    widget: 'switch',
    type: 'boolean',
    title: '显示 label（label）',
    default: true,
  },
  readOnly: {
    widget: 'switch',
    type: 'boolean',
    title: '整个表单只读（readOnly）',
    default: false,
  },
  column: {
    widget: 'number',
    type: 'number',
    title: '每行显示列数（column）',
    default: 1,
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
      <div className='mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2'>
        <div className='min-w-0'>
          <div className='mb-0.5 text-[11px] text-[#999]'>字段标识（key）</div>
          <code className='break-all font-mono text-[13px] text-[#333]'>
            {oldKey}
          </code>
        </div>
        <span className='shrink-0 rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[11px] text-[#999]'>
          🔒 锁定
        </span>
      </div>
    );
  }

  const onChange = (v: string) => {
    setValue(v);
    onRename(v);
  };

  return (
    <div className='mb-3'>
      <div className='mb-1.5 text-[11px] text-[#999]'>字段标识（key）</div>
      <Input
        size='small'
        value={value}
        onChange={(e) => {
          const trimmed = (e.target.value || '').trim();
          onChange(trimmed);
        }}
        autoFocus
        className='nexus-key-input'
      />
      <div className='mt-1 text-[11px] text-[#c0c4cc]'>
        用于数据路径与联动引用，修改后自动迁移子节点
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
            defaultActiveKey: [
              'sectionCommon',
              'sectionFieldProps',
              'sectionValidation',
              'sectionReaction',
              'sectionDependency',
            ],
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
              'sectionReaction',
              '联动配置',
              reactionPropertyFields,
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

  // 表单级属性面板的取值来源：只提取 NexusSchema 顶层的表单配置键，
  // 而非整个 schema 对象（schema 含 properties 与嵌套字段，不是表单级配置）
  const formLevelConfig = useMemo<Record<string, unknown>>(
    () =>
      extractFormLevelConfig(
        schema as unknown as Record<string, unknown>,
        Object.keys(formLevelProps),
      ),
    [schema],
  );

  const handleValuesChange = useCallback(
    (
      allValues: Record<string, unknown>,
      changedFields: ReadonlySet<string>,
    ) => {
      // 只写回「真正变化」的值：未触碰的空字符串（''/undefined/null）视为未赋值，
      // 不写回 Schema（否则 bind:'' / hidden:'' / required:'' 会导致 key 丢失 / 空联动）；
      // 用户主动清空的字段（changedFields 命中）以 undefined 回写，由
      // updateNodeWithNesting 从节点删除对应属性（详见 diffPropertyPatch）
      const initial = selectedNode
        ? flattenNodeForPropertyEditor(
            selectedNode as unknown as Record<string, any>,
          )
        : formLevelConfig;

      const patch = diffPropertyPatch(initial, allValues, changedFields);
      if (Object.keys(patch).length === 0) {
        return;
      }

      if (!selectedPath || selectedPath.length === 0) {
        // form-level：修改 NexusSchema 顶层属性（undefined 表示清空，删除该键）
        const next = { ...(schema as unknown as Record<string, unknown>) };
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) {
            delete next[key];
          } else {
            next[key] = value;
          }
        }
        setSchema(next as unknown as NexusSchema);
        return;
      }

      // 节点级：key 已由 KeyEditor 单独处理，此处跳过
      const { key: _key, ...rest } = patch;
      if (Object.keys(rest).length > 0) {
        updateNode(selectedPath, rest);
      }
    },
    [
      selectedPath,
      updateNode,
      setSchema,
      schema,
      selectedNode,
      formLevelConfig,
    ],
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

  // 节点类型徽标：字段取 widget，布局/对象取 type
  const nodeKind = selectedNode
    ? (
        (selectedNode.widget as string) ||
        (selectedNode.type as string) ||
        ''
      ).toLowerCase()
    : '';

  return (
    <div className='flex h-full flex-col border-l border-[#f0f0f0] bg-white'>
      {/* 导航头 */}
      <div className='flex items-center justify-between border-b border-[#f0f0f0] px-4 py-2.5'>
        <div className='flex min-w-0 items-center gap-1'>
          {!isFormLevel && (
            <button
              type='button'
              onClick={() => selectNode(null)}
              className='-ml-1 mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#333]'
              title='返回表单属性'
            >
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'
              >
                <polyline points='15 18 9 12 15 6' />
              </svg>
            </button>
          )}
          <span className='truncate pl-5 text-[13px] font-semibold text-[#333]'>
            {isFormLevel ? '表单属性' : '节点属性'}
          </span>
        </div>
        {!isFormLevel && nodeKind && (
          <span className='ml-2 shrink-0 rounded-md bg-[#e8f1ff] px-1.5 py-0.5 text-[11px] text-[#1677ff]'>
            {nodeKind}
          </span>
        )}
      </div>

      <div className='nexus-property-body flex-1 overflow-y-auto px-4 py-3'>
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
              : formLevelConfig
          }
          onValuesChange={handleValuesChange}
        />
      </div>
    </div>
  );
}
