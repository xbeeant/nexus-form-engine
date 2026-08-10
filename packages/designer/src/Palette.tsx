// ============================================================================
// @nexus/form-engine-designer — 左侧组件目录面板
// ============================================================================

import type { SchemaNode } from '@nexus/form-engine';
import { Collapse } from 'antd';
import type { DragEvent } from 'react';
import { useCallback } from 'react';
import { useDesigner } from './DesignerContext';
import { generateKey } from './schemaUtils';
import type { CatalogItem, FieldDef } from './types';

// 拖拽负载：palette 组件目录项 or 外部字段定义
export interface PaletteDragPayload {
  source: 'palette';
  catalogItem: CatalogItem;
}
export interface FieldDefDragPayload {
  source: 'fieldDef';
  fieldDef: FieldDef;
}
export type PaletteDragData = PaletteDragPayload | FieldDefDragPayload;

function PaletteItem({
  item,
  onAdd,
}: {
  item: CatalogItem;
  onAdd: (item: CatalogItem) => void;
}) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const payload: PaletteDragPayload = {
      source: 'palette',
      catalogItem: item,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className='flex items-center px-2 py-1.5 border border-[#e8e8e8] rounded bg-white cursor-grab select-none text-[13px] overflow-hidden transition-all hover:border-[#1677ff] hover:text-[#1677ff] hover:shadow-[0_1px_4px_rgba(22,119,255,0.15)] active:cursor-grabbing'
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(item)}
    >
      <span className='mr-1.5'>{item.icon}</span>
      <span>{item.label}</span>
    </div>
  );
}

function FieldDefItem({ field }: { field: FieldDef }) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const payload: FieldDefDragPayload = {
      source: 'fieldDef',
      fieldDef: field,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className='flex items-center px-2 py-1.5 border border-[#e8e8e8] rounded bg-white cursor-grab select-none text-[13px] overflow-hidden transition-all hover:border-[#1677ff] hover:text-[#1677ff] hover:shadow-[0_1px_4px_rgba(22,119,255,0.15)] active:cursor-grabbing'
      draggable
      onDragStart={handleDragStart}
      title={`id: ${field.id} · widget: ${field.widget}`}
    >
      <span className='mr-1.5'>🔧</span>
      <span className='truncate'>{field.name}</span>
    </div>
  );
}

export function Palette() {
  const { schema, addNode, fields, widgetCatalog, layoutCatalog } =
    useDesigner();

  const handleAdd = useCallback(
    (item: CatalogItem) => {
      const base = item.widget || item.layoutType || 'field';
      const key = generateKey(schema.properties, base);
      const node = item.createNode() as unknown as SchemaNode;
      addNode([], key, node);
    },
    [schema, addNode],
  );

  const widgetItems = widgetCatalog.map((item) => (
    <PaletteItem key={item.widget} item={item} onAdd={handleAdd} />
  ));

  const layoutItems = layoutCatalog.map((item) => (
    <PaletteItem key={item.layoutType} item={item} onAdd={handleAdd} />
  ));

  const fieldItems = (fields ?? []).map((field) => (
    <FieldDefItem key={field.id} field={field} />
  ));

  const collapseItems = [
    {
      key: 'widgets',
      label: '表单组件',
      children: (
        <div className='grid grid-cols-2 gap-1 py-1'>{widgetItems}</div>
      ),
    },
    {
      key: 'layouts',
      label: '布局组件',
      children: (
        <div className='grid grid-cols-2 gap-1 py-1'>{layoutItems}</div>
      ),
    },
  ];

  // 仅当传入 fields 时显示「字段列表」分组
  if (fields && fields.length > 0) {
    collapseItems.push({
      key: 'fieldList',
      label: '字段列表',
      children: <div className='flex flex-col gap-1 py-1'>{fieldItems}</div>,
    });
  }

  return (
    <div className='border-r border-[#f0f0f0] overflow-y-auto bg-[#fafafa] h-full'>
      <Collapse
        defaultActiveKey={['widgets', 'layouts']}
        items={collapseItems}
      />
    </div>
  );
}
