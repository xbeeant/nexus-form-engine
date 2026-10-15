// ============================================================================
// tableList — 表格列表 widget（x-render 对齐）
// 以表格形式渲染数组，每个属性为一列，支持新增 / 删除行
// items 为 DataObjectSchema，每项是一个对象
// ============================================================================

import type {
  DataFieldSchema,
  DataObjectSchema,
  SchemaNode,
} from '@xbeeant/form-engine';
import { renderListItemField } from '@xbeeant/form-engine-react';
import { Button, Popconfirm, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  getEmptyObject,
} from './_list-shared';
import type { WidgetProps } from './_shared';

interface TableItemType {
  [key: string]: unknown;
  __index?: number;
}

/**
 * 空数组时的占位行数据（纯 UI 行）
 * ⚠️ 占位行本身不属于数据：不会进 engine fieldStates（Core 不为它造 item 状态），
 * 也不会变成 [{}] 脏空行——在占位行内的首次输入会被 handleFieldChange 转成
 * 第一行真实数据（[getEmptyObject(items) + 本次输入]）。
 */
const PLACEHOLDER_ROW: Record<string, unknown> = {};

export const tableListWidget = ({
  value,
  onChange,
  title,
  disabled,
  readOnly,
  errors,
  description,
  extra,
  required,
  items,
  displayType,
  labelWidth,
  width,
  placeholder: _ph,
  loading: _ld,
  options: _opt,
  column: _col,
  form: _form,
  dependValues: _dv,
  schema,
  path: _p,
  addText: _addText,
  hideAdd: _hideAdd,
  hideDelete: _hideDelete,
  hideMove: _hideMove,
  hideCopy: _hideCopy,
  scrollX: _scrollX,
  actionColumnProps: _actionColumnProps,
  remoteVersion: _rv,
  ...rest
}: WidgetProps) => {
  // dataPath 从 schema 获取（不再作为独立 prop 透传）
  const dataPath = (schema as SchemaNode & { dataPath?: string })?.dataPath;
  const addText = _addText as string | undefined;
  const hideAdd = _hideAdd as boolean | undefined;
  const hideDelete = _hideDelete as boolean | undefined;
  const hideMove = _hideMove as boolean | undefined;
  const hideCopy = _hideCopy as boolean | undefined;
  const scrollX = _scrollX as boolean | undefined;
  const actionColumnProps = _actionColumnProps as
    | Record<string, unknown>
    | undefined;

  // 数据行：严格取自数组字段值，是所有 onChange 的唯一数据来源
  const realItems: unknown[] = Array.isArray(value) ? value : [];
  // 渲染行：数组为空时补一行占位行（纯 UI 行，本身不进数据；
  // 在其中输入会由 handleFieldChange 直接落为第一行真实数据）
  const rows: unknown[] =
    realItems.length === 0 ? [PLACEHOLDER_ROW] : realItems;
  const isPlaceholderRow = () => realItems.length === 0;

  const itemSchema = items as DataObjectSchema | undefined;

  const itemProperties = itemSchema?.properties ?? {};

  const handleAdd = () => {
    onChange(
      arrayAdd(
        realItems,
        getEmptyObject({
          type: 'object',
          widget: 'object',
          properties: itemProperties,
        }),
      ),
    );
  };

  const handleRemove = (index: number) => {
    onChange(arrayRemove(realItems, index));
  };

  const handleMoveUp = (index: number) => {
    onChange(arrayMove(realItems, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    onChange(arrayMove(realItems, index, index + 1));
  };

  const handleCopy = (index: number) => {
    onChange(arrayCopy(realItems, index));
  };

  const handleFieldChange = (
    index: number,
    fieldKey: string,
    fieldValue: unknown,
  ) => {
    // 占位行首次输入：按 items schema 生成完整空对象并落为第一行真实数据。
    // 既不会向数据写入 [{}] 脏空行，也让 hideAdd 场景（无「添加一行」按钮）
    // 仍能从占位行直接开始录入。占位行随之消失（realItems.length > 0）。
    if (realItems.length === 0) {
      onChange([
        {
          ...getEmptyObject({
            type: 'object',
            widget: 'object',
            properties: itemProperties,
          }),
          [fieldKey]: fieldValue,
        },
      ]);
      return;
    }
    const newArr = [...realItems];
    newArr[index] = { ...(newArr[index] as object), [fieldKey]: fieldValue };
    onChange(newArr);
  };

  // 构建列定义
  const columns: ColumnsType<TableItemType> = [
    ...Object.entries(itemProperties).map(([key, fieldNode]) => {
      const fieldDef = fieldNode as DataFieldSchema;
      const title = (
        <span key={key}>
          {fieldDef.required && (
            <span style={{ color: 'red', marginRight: '3px' }}>*</span>
          )}
          <span>{fieldDef.title}</span>
        </span>
      );
      return {
        title: title,
        dataIndex: key,
        width: 160,
        render: (_val: unknown, record: TableItemType, index: number) => {
          // 占位行里 schema 声明 readOnly 的字段必须只读展示：
          // Core 不为占位行造项状态（查不到 fieldState，联动无法求值），因此只能读
          // schema 静态值；renderListItemField 内部 suppressFieldItemLayout=true
          // 抑制了 console.warn，此处传 undefined path 确保占位行无 fieldState。
          const phReadOnly = isPlaceholderRow() && fieldDef.readOnly === true;
          if (readOnly || phReadOnly) {
            return renderListItemField(
              {
                path: undefined,
                fieldSchema: fieldDef,
                value: record[key],
                readOnly: true,
              },
              true,
            );
          }
          // 占位行其余单元格保持可编辑：首次输入由 handleFieldChange 落为第一行真实数据，
          // 保证 hideAdd（无「添加一行」按钮）场景仍可开始录入
          return renderListItemField(
            {
              path: `${dataPath}[${index}].${key}`,
              fieldSchema: fieldDef,
              value: record[key],
              onChange: (v) => handleFieldChange(index, key, v),
              readOnly,
              disabled,
            },
            true,
          );
        },
      };
    }),
  ];

  // 操作列
  if (!readOnly && !actionColumnProps?.hidden) {
    const { hidden: _hidden, ...restColumnProps } = actionColumnProps ?? {};
    columns.push({
      title: '操作',
      key: '__action',
      width: 200,
      fixed: 'right' as const,
      ...restColumnProps,
      render: (_val: unknown, _record: TableItemType, index: number) => {
        // 占位行不可操作（行结构性操作仅对真实数据行生效）
        const rowDisabled = disabled || isPlaceholderRow();
        return (
          <Space size='small'>
            {!hideMove && (
              <>
                <Button
                  type='text'
                  size='small'
                  disabled={rowDisabled || index === 0}
                  onClick={() => handleMoveUp(index)}
                >
                  上移
                </Button>
                <Button
                  type='text'
                  size='small'
                  disabled={rowDisabled || index === rows.length - 1}
                  onClick={() => handleMoveDown(index)}
                >
                  下移
                </Button>
              </>
            )}
            {!hideCopy && (
              <Button
                type='text'
                size='small'
                disabled={rowDisabled}
                onClick={() => handleCopy(index)}
              >
                复制
              </Button>
            )}
            {!hideDelete && (
              <Popconfirm
                title='确认删除该行？'
                onConfirm={() => handleRemove(index)}
                okText='删除'
                cancelText='取消'
                disabled={rowDisabled}
              >
                <Button type='text' size='small' danger disabled={rowDisabled}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    });
  }

  // 为每行添加 key
  const dataSource = rows.map((item, index) => ({
    ...(item as object),
    __index: index,
  })) as TableItemType[];

  return (
    <div {...rest}>
      <Table<TableItemType>
        columns={columns}
        dataSource={dataSource}
        rowKey='__index'
        size='small'
        pagination={false}
        scroll={{ x: scrollX === false ? undefined : 'max-content' }}
        bordered
        locale={{ emptyText: '暂无数据' }}
      />
      {!readOnly && !hideAdd && !actionColumnProps?.hidden && (
        <Button
          type='dashed'
          onClick={handleAdd}
          disabled={disabled}
          block
          style={{ marginTop: 8 }}
        >
          + {addText ?? '添加一行'}
        </Button>
      )}
    </div>
  );
};
