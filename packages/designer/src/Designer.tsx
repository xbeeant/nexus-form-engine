// ============================================================================
// @nexus/form-engine-designer — 主组件
// ============================================================================

import type { NexusEngine, NexusSchema, SchemaNode } from '@nexus/form-engine';
import {
  Button,
  Input,
  message,
  Popconfirm,
  Radio,
  Space,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { Canvas } from './Canvas';
import './Designer.css';
import { layoutCatalog, widgetCatalog } from './catalog';
import { DesignerProvider, useDesigner } from './DesignerContext';
import { Palette } from './Palette';
import { PropertyPanel } from './PropertyPanel';
import { ResizablePanel } from './ResizablePanel';
import type { CatalogItem, DesignerMode, FieldDef } from './types';

const DEFAULT_SCHEMA: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 110,
  properties: {},
};

export interface DesignerProps {
  schema?: NexusSchema;
  propertySchemaMap: Record<string, Record<string, SchemaNode>>;
  onSchemaChange?: (schema: NexusSchema) => void;
  /** UI 注册函数，用于向引擎注册 widgets 和 layouts（如 registerAntdUI） */
  registerUI?: (engine: NexusEngine) => void;
  /** 外部字段列表，传入后左侧 palette 多一个「字段列表」分组 */
  fields?: FieldDef[];
  /** 额外的 widget 目录项，与内置 widgetCatalog 合并（同 widget 名时外部覆盖内置） */
  widgetCatalog?: CatalogItem[];
  /** 额外的 layout 目录项，与内置 layoutCatalog 合并（同 layoutType 时外部覆盖内置） */
  layoutCatalog?: CatalogItem[];
}

export function Designer({
  schema,
  propertySchemaMap,
  onSchemaChange,
  registerUI,
  fields,
  widgetCatalog: extraWidgetCatalog,
  layoutCatalog: extraLayoutCatalog,
}: DesignerProps) {
  const initialSchema = useMemo<NexusSchema>(
    () => schema ?? DEFAULT_SCHEMA,
    [schema],
  );

  // 合并内置 catalog 与外部传入的 catalog：外部同名项覆盖内置
  const mergedWidgetCatalog = useMemo(
    () => mergeCatalog(widgetCatalog, extraWidgetCatalog, 'widget'),
    [extraWidgetCatalog],
  );
  const mergedLayoutCatalog = useMemo(
    () => mergeCatalog(layoutCatalog, extraLayoutCatalog, 'layoutType'),
    [extraLayoutCatalog],
  );

  return (
    <DesignerProvider
      initialSchema={initialSchema}
      onSchemaChange={onSchemaChange}
      registerUI={registerUI}
      fields={fields}
      propertySchemaMap={propertySchemaMap}
      widgetCatalog={mergedWidgetCatalog}
      layoutCatalog={mergedLayoutCatalog}
    >
      <DesignerForm />
    </DesignerProvider>
  );
}

// 合并内置与外部 catalog：外部项按 key 覆盖内置同名项，其余追加到末尾
function mergeCatalog(
  builtIn: CatalogItem[],
  extra: CatalogItem[] | undefined,
  keyField: 'widget' | 'layoutType',
): CatalogItem[] {
  if (!extra || extra.length === 0) {
    return builtIn;
  }
  const extraKeys = new Set(extra.map((c) => c[keyField]).filter(Boolean));
  const preserved = builtIn.filter((c) => !extraKeys.has(c[keyField]));
  return [...preserved, ...extra];
}

function DesignerForm() {
  const { mode, setMode, schema, setSchema, selectNode } = useDesigner();
  const [schemaText, setSchemaText] = useState('');
  const [schemaActive, setSchemaActive] = useState(false);

  // 清空画布：重置为空 schema 并取消选中（必须新建对象，保证触发重渲染）
  const handleClearSchema = () => {
    const emptySchema: NexusSchema = {
      type: 'object',
      displayType: 'row',
      labelWidth: 110,
      properties: {},
    };
    setSchema(emptySchema);
    selectNode(null);
    if (mode === 'schema') {
      setSchemaText(JSON.stringify(emptySchema, null, 2));
    }
  };

  // 进入 schema 模式时同步当前 schema 到编辑框
  const handleEnterSchema = () => {
    setSchemaText(JSON.stringify(schema, null, 2));
    setSchemaActive(true);
  };

  // 离开 schema 模式时尝试解析并写回
  const handleLeaveSchema = () => {
    if (!schemaActive) {
      return;
    }
    try {
      const parsed = JSON.parse(schemaText) as NexusSchema;
      if (parsed && parsed.type === 'object' && parsed.properties) {
        setSchema(parsed);
      } else {
        message.warning('Schema 必须包含 type: "object" 和 properties');
      }
    } catch {
      message.error('JSON 格式错误，无法解析');
    }
    setSchemaActive(false);
  };

  // Radio.Group 切换
  const handleModeChange = (value: DesignerMode) => {
    if (value === 'schema') {
      handleEnterSchema();
    } else {
      handleLeaveSchema();
    }
    setMode(value);
  };

  const handleExport = () => {
    const json = JSON.stringify(schema, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as NexusSchema;
          if (parsed && parsed.type === 'object' && parsed.properties) {
            setSchema(parsed);
          }
        } catch {
          // 忽略非法 JSON
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className='flex flex-col h-full bg-white'>
      <div className='flex items-center justify-between px-4 py-2 border-b border-[#f0f0f0] bg-[#fafafa]'>
        <Typography.Text strong>Nexus 表单设计器</Typography.Text>
        <Space>
          <Radio.Group
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as DesignerMode)}
          >
            <Radio.Button value='design'>设计</Radio.Button>
            <Radio.Button value='preview'>预览</Radio.Button>
            <Radio.Button value='schema'>Schema</Radio.Button>
          </Radio.Group>
          <Button onClick={handleImport}>导入</Button>
          <Button onClick={handleExport}>导出</Button>
          <Popconfirm
            title='清空画布'
            description='将移除画布上所有组件，此操作不可撤销'
            okText='清空'
            cancelText='取消'
            okButtonProps={{ danger: true }}
            onConfirm={handleClearSchema}
          >
            <Button danger>清空</Button>
          </Popconfirm>
        </Space>
      </div>
      {mode === 'schema' ? (
        <div className='flex-1 overflow-auto p-4 bg-[#1e1e1e]'>
          <Input.TextArea
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            autoSize={{ minRows: 20 }}
            className='font-mono! text-[13px]! leading-[1.6]! bg-[#1e1e1e]! text-[#d4d4d4]! border-[#3e3e42]!'
          />
        </div>
      ) : (
        <div className='flex flex-1 overflow-hidden'>
          <ResizablePanel
            side='left'
            defaultWidth={240}
            minWidth={160}
            maxWidth={420}
            collapsedTitle='组件面板'
          >
            <Palette />
          </ResizablePanel>
          <Canvas />
          <ResizablePanel
            side='right'
            defaultWidth={320}
            minWidth={240}
            maxWidth={560}
            collapsedTitle='属性面板'
          >
            <PropertyPanel />
          </ResizablePanel>
        </div>
      )}
    </div>
  );
}
