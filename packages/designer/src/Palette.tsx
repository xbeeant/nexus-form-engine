// ============================================================================
// @nexus/form-engine-designer — 左侧组件目录面板
// ============================================================================

import type { SchemaNode } from '@nexus/form-engine';
import { Collapse, Input } from 'antd';
import type { DragEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
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
      className='group flex flex-col items-center gap-1 rounded-lg border border-[#f0f0f0] bg-white px-1 py-2 cursor-grab select-none transition-all hover:-translate-y-px hover:border-[#1677ff] hover:shadow-[0_2px_8px_rgba(22,119,255,0.12)] active:cursor-grabbing'
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(item)}
      title={`点击添加或拖拽「${item.label}」到画布`}
    >
      <span className='flex h-7 w-7 items-center justify-center rounded-md bg-[#f5f7fa] text-[15px] transition-colors group-hover:bg-[#e8f1ff]'>
        {item.icon}
      </span>
      <span className='w-full truncate text-center text-xs text-[#666] transition-colors group-hover:text-[#1677ff]'>
        {item.label}
      </span>
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
      className='flex items-center gap-2 rounded-lg border border-[#f0f0f0] bg-white px-2 py-1.5 cursor-grab select-none transition-all hover:-translate-y-px hover:border-[#1677ff] hover:shadow-[0_2px_8px_rgba(22,119,255,0.12)] active:cursor-grabbing'
      draggable
      onDragStart={handleDragStart}
      title={`id: ${field.id} · widget: ${field.widget}`}
    >
      <span className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#f5f7fa] text-[13px]'>
        🔧
      </span>
      <span className='truncate text-xs text-[#666]'>{field.name}</span>
    </div>
  );
}

export function Palette() {
  const { schema, addNode, fields, widgetCatalog, layoutCatalog } =
    useDesigner();
  const [keyword, setKeyword] = useState('');

  const handleAdd = useCallback(
    (item: CatalogItem) => {
      const base = item.widget || item.layoutType || 'field';
      const key = generateKey(schema.properties, base);
      const node = item.createNode() as unknown as SchemaNode;
      addNode([], key, node);
    },
    [schema, addNode],
  );

  const kw = keyword.trim().toLowerCase();

  const widgetItems = useMemo(
    () =>
      widgetCatalog
        .filter((item) => item.label.toLowerCase().includes(kw))
        .map((item) => (
          <PaletteItem key={item.widget} item={item} onAdd={handleAdd} />
        )),
    [widgetCatalog, kw, handleAdd],
  );

  const layoutItems = useMemo(
    () =>
      layoutCatalog
        .filter((item) => item.label.toLowerCase().includes(kw))
        .map((item) => (
          <PaletteItem key={item.layoutType} item={item} onAdd={handleAdd} />
        )),
    [layoutCatalog, kw, handleAdd],
  );

  const fieldItems = useMemo(
    () =>
      (fields ?? [])
        .filter((field) => field.name.toLowerCase().includes(kw))
        .map((field) => <FieldDefItem key={field.id} field={field} />),
    [fields, kw],
  );

  const sectionGrid = (items: React.ReactNode[], hasMore: boolean) =>
    items.length > 0 ? (
      <div className='grid grid-cols-2 gap-1.5 px-1 pb-2'>{items}</div>
    ) : (
      <div className='py-3 text-center text-xs text-[#c0c4cc]'>
        {hasMore ? '无匹配组件' : '暂无组件'}
      </div>
    );

  const collapseItems = [
    {
      key: 'widgets',
      label: (
        <span className='flex w-full items-center justify-between pr-1'>
          <span>表单组件</span>
          <span className='rounded-full bg-[#f0f0f0] px-1.5 py-px text-[11px] text-[#999]'>
            {widgetItems.length}
          </span>
        </span>
      ),
      children: sectionGrid(widgetItems, true),
    },
    {
      key: 'layouts',
      label: (
        <span className='flex w-full items-center justify-between pr-1'>
          <span>布局组件</span>
          <span className='rounded-full bg-[#f0f0f0] px-1.5 py-px text-[11px] text-[#999]'>
            {layoutItems.length}
          </span>
        </span>
      ),
      children: sectionGrid(layoutItems, true),
    },
  ];

  // 仅当传入 fields 时显示「字段列表」分组
  if (fields && fields.length > 0) {
    collapseItems.push({
      key: 'fieldList',
      label: (
        <span className='flex w-full items-center justify-between pr-1'>
          <span>字段列表</span>
          <span className='rounded-full bg-[#f0f0f0] px-1.5 py-px text-[11px] text-[#999]'>
            {fieldItems.length}
          </span>
        </span>
      ),
      children: (
        <div className='flex flex-col gap-1.5 px-1 pb-2'>
          {fieldItems.length > 0 ? (
            fieldItems
          ) : (
            <div className='py-3 text-center text-xs text-[#c0c4cc]'>
              无匹配字段
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <div className='flex h-full flex-col border-r border-[#f0f0f0] bg-[#f7f8fa]'>
      <div className='px-3 pb-2 pt-3'>
        <Input
          size='small'
          allowClear
          prefix={<span className='text-xs text-[#bbb]'>🔍</span>}
          placeholder='搜索组件…'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className='nexus-palette-search'
        />
      </div>
      <div className='flex-1 overflow-y-auto px-2 pb-3'>
        <Collapse
          className='nexus-palette-collapse'
          expandIconPosition='end'
          defaultActiveKey={['widgets', 'layouts']}
          items={collapseItems}
        />
      </div>
    </div>
  );
}
