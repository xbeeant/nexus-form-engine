// ============================================================================
// list — 常规列表 widget（x-render 对齐）
// 以卡片形式渲染数组每一项，支持新增 / 删除 / 上移 / 下移 / 复制
// items 为 DataObjectSchema，每项是一个对象，按 properties 渲染字段
// ============================================================================

import type { DataFieldSchema, DataObjectSchema } from '@xbeeant/form-engine';
import { Button, Card, Form, Space, Typography } from 'antd';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  formatFieldValue,
  getEmptyObject,
  RenderItemControl,
} from './_listShared';
import type { WidgetProps } from './_shared';

export const listWidget = ({
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
  removeText: _removeText,
  copyText: _copyText,
  hideAddButton: _hideAddButton,
  hideDeleteButton: _hideDeleteButton,
  hideMoveButton: _hideMoveButton,
  hideCopyButton: _hideCopyButton,
  ...rest
}: WidgetProps) => {
  const addText = _addText as string | undefined;
  const removeText = _removeText as string | undefined;
  const copyText = _copyText as string | undefined;
  const hideAddButton = _hideAddButton as boolean | undefined;
  const hideDeleteButton = _hideDeleteButton as boolean | undefined;
  const hideMoveButton = _hideMoveButton as boolean | undefined;
  const hideCopyButton = _hideCopyButton as boolean | undefined;
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

  return (
    <div {...rest}>
      {array.length === 0 && (
        <div
          style={{ color: '#bfbfbf', textAlign: 'center', padding: '12px 0' }}
        >
          暂无数据
        </div>
      )}
      {array.map((item, index) => (
        <Card
          key={`list-item-${index}`}
          size='small'
          style={{ marginBottom: 8 }}
          title={
            <Space>
              <Typography.Text type='secondary' style={{ fontSize: 13 }}>
                #{index + 1}
              </Typography.Text>
            </Space>
          }
          extra={
            readOnly ? null : (
              <Space size='small'>
                {!hideMoveButton && (
                  <>
                    <Button
                      type='text'
                      size='small'
                      disabled={disabled || index === 0}
                      onClick={() => handleMoveUp(index)}
                    >
                      ↑
                    </Button>
                    <Button
                      type='text'
                      size='small'
                      disabled={disabled || index === array.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      ↓
                    </Button>
                  </>
                )}
                {!hideCopyButton && (
                  <Button
                    type='text'
                    size='small'
                    disabled={disabled}
                    onClick={() => handleCopy(index)}
                  >
                    {copyText ?? '复制'}
                  </Button>
                )}
                {!hideDeleteButton && (
                  <Button
                    type='text'
                    size='small'
                    danger
                    disabled={disabled}
                    onClick={() => handleRemove(index)}
                  >
                    {removeText ?? '删除'}
                  </Button>
                )}
              </Space>
            )
          }
        >
          {Object.entries(itemProperties).map(([key, fieldNode]) => {
            const fieldDef = fieldNode as DataFieldSchema;
            const fieldValue = (item as Record<string, unknown>)?.[key];
            const fieldLabel = fieldDef.title ?? key;

            return (
              <Form.Item
                key={key}
                label={fieldLabel}
                style={{ marginBottom: 8 }}
                labelCol={{ style: { width: 80 } }}
                wrapperCol={{ flex: 1 }}
              >
                {readOnly ? (
                  <Typography.Text>
                    {formatFieldValue(fieldValue, fieldDef)}
                  </Typography.Text>
                ) : (
                  <RenderItemControl
                    widget={fieldDef.widget}
                    fieldSchema={fieldDef}
                    path={`${dataPath}[${index}].${key}`}
                    value={fieldValue}
                    onChange={(v) => handleFieldChange(index, key, v)}
                    disabled={disabled}
                  />
                )}
              </Form.Item>
            );
          })}
        </Card>
      ))}
      {!readOnly && !hideAddButton && (
        <Button type='dashed' onClick={handleAdd} disabled={disabled} block>
          + {addText ?? '添加'}
        </Button>
      )}
    </div>
  );
};
