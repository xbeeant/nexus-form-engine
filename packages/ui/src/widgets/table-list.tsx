// ============================================================================
// tableList — 表格列表 widget（x-render 对齐）
// 以表格形式渲染数组，每个属性为一列，支持新增 / 删除行
// items 为 DataObjectSchema，每项是一个对象
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';
import { Button, Popconfirm, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  formatFieldValue,
  getEmptyObject,
  RenderItemControl,
} from './_list-shared';
import type { WidgetProps } from './_shared';

interface TableItemType {
  [key: string]: unknown;
  __index?: number;
}

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
  dataPath,
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
  const addText = _addText as string | undefined;
  const hideAdd = _hideAdd as boolean | undefined;
  const hideDelete = _hideDelete as boolean | undefined;
  const hideMove = _hideMove as boolean | undefined;
  const hideCopy = _hideCopy as boolean | undefined;
  const scrollX = _scrollX as boolean | undefined;
  const actionColumnProps = _actionColumnProps as
    | Record<string, unknown>
    | undefined;
  const array = Array.isArray(value) ? value : [];
  const itemSchema = items as DataObjectSchema | undefined;
  const itemProperties = itemSchema?.properties ?? {};

  const handleAdd = () => {
    onChange(
      arrayAdd(
        array,
        getEmptyObject({
          type: 'object',
          widget: 'object',
          properties: itemProperties,
        }),
      ),
    );
  };

  const handleRemove = (index: number) => {
    onChange(arrayRemove(array, index));
  };

  const handleMoveUp = (index: number) => {
    onChange(arrayMove(array, index, index - 1));
  };

  const handleMoveDown = (index: number) => {
    onChange(arrayMove(array, index, index + 1));
  };

  const handleCopy = (index: number) => {
    onChange(arrayCopy(array, index));
  };

  const handleFieldChange = (
    index: number,
    fieldKey: string,
    fieldValue: unknown,
  ) => {
    const newArr = [...array];
    newArr[index] = { ...(newArr[index] as object), [fieldKey]: fieldValue };
    onChange(newArr);
  };

  // 构建列定义
  const columns: ColumnsType<TableItemType> = [
    ...Object.entries(itemProperties).map(([key, fieldNode]) => {
      const fieldDef = fieldNode as DataFieldSchema;
      return {
        title: fieldDef.title ?? key,
        dataIndex: key,
        width: 160,
        render: (_val: unknown, record: TableItemType, index: number) => {
          if (readOnly) {
            return (
              <Typography.Text>
                {formatFieldValue(record[key], fieldDef)}
              </Typography.Text>
            );
          }
          return (
            <RenderItemControl
              widget={fieldDef.widget}
              fieldSchema={fieldDef}
              path={`${dataPath}[${index}].${key}`}
              value={record[key]}
              onChange={(v) => handleFieldChange(index, key, v)}
              disabled={disabled}
            />
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
      render: (_val: unknown, _record: TableItemType, index: number) => (
        <Space size='small'>
          {!hideMove && (
            <>
              <Button
                type='text'
                size='small'
                disabled={disabled || index === 0}
                onClick={() => handleMoveUp(index)}
              >
                上移
              </Button>
              <Button
                type='text'
                size='small'
                disabled={disabled || index === array.length - 1}
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
              disabled={disabled}
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
              disabled={disabled}
            >
              <Button type='text' size='small' danger disabled={disabled}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    });
  }

  // 为每行添加 key
  const dataSource = array.map((item, index) => ({
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
      {!readOnly && !hideAdd && (
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
