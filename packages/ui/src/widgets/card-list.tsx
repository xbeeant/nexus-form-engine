// ============================================================================
// cardList — 卡片列表 widget（x-render CardList 对齐）
//
// 处理逻辑与 simpleList 完全一致（同一套骨架）：
//   - items 判定（对象 / 简单类型）与空值生成
//   - 数组操作：新增 / 删除 / 上移 / 下移 / 复制
//   - 单项字段渲染：label + RenderItemControl（复用 _list-shared）
//   - 只读模式：formatFieldValue 纯文本展示
// 差异仅在列表项外观（样式）：
//   - 每项以 antd Card / Collapse / 标题行（theme）包裹；
//   - 「序号徽标 + 标题」置于项头部，操作区浮动于右上角；
//   - 操作按钮 text（图标+文字，竖线分隔）/ icon（仅图标）两态；
//   - 额外支持 max 上限 / hasBackground / *BtnProps / delConfirmProps。
// ============================================================================

import type {
  DataFieldSchema,
  DataObjectSchema,
  SchemaNode,
} from '@xbeeant/form-engine';
import {
  renderListItemField,
  useFieldsHidden,
} from '@xbeeant/form-engine-react';
import {
  Button,
  Card,
  Collapse,
  Divider,
  Popconfirm,
  Space,
  Typography,
} from 'antd';
import { useMemo } from 'react';
import {
  arrayAdd,
  arrayCopy,
  arrayMove,
  arrayRemove,
  getEmptyField,
  getEmptyObject,
} from './_list-shared';
import type { WidgetProps } from './_shared';

/** 三种主题：'card'（默认） / 'collapse' / 'lineTitle' */
type CardListTheme = 'card' | 'collapse' | 'lineTitle';

/** 操作按钮风格：'text'（默认：图标+文字 + 竖线分隔）/ 'icon'（仅图标） */
type OperateBtnType = 'text' | 'icon';

/**
 * getOperateFixed — 是否使用浮动（absolute）操作区
 * items 配置了 extra（自定义操作区）时与 extra 同行，否则浮动在项右上角。
 */
function getOperateFixed(items?: DataObjectSchema): boolean {
  return !items?.props?.extra;
}

/**
 * getOperateStyle — 浮动操作区内联定位
 * 不同主题「标题行」视觉高度不同，top 需对齐：
 *  - card / collapse：14px
 *  - lineTitle：3px（行高更紧凑）
 *  - 未设置 title：靠右贴齐（right: 0），避免与标题重叠
 */
function getOperateStyle(
  items: DataObjectSchema | undefined,
  theme: CardListTheme,
  isFixed: boolean,
): React.CSSProperties {
  if (!isFixed) {
    return {};
  }
  const style: React.CSSProperties = {
    position: 'absolute',
    right: 12,
    top: theme === 'lineTitle' ? 3 : 14,
    background: '#fff',
    paddingLeft: 8,
  };
  if (!items?.title) {
    style.right = 0;
  }
  return style;
}

/** 序号徽标（x-render CardList 风格） */
function renderIndexBadge(index: number) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 4px',
        marginRight: 8,
        borderRadius: 2,
        background: 'rgba(0,0,0,0.45)',
        color: '#fff',
        fontSize: 12,
        lineHeight: '20px',
        flexShrink: 0,
      }}
    >
      {index + 1}
    </span>
  );
}

export const cardListWidget = ({
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
  // ── 操作按钮配置（与 simpleList 同源） ──
  addText: _addText,
  removeText: _removeText,
  copyText: _copyText,
  hideAdd: _hideAdd,
  hideDelete: _hideDelete,
  hideMove: _hideMove,
  hideCopy: _hideCopy,
  // ── cardList 专属 props ──
  theme: _theme,
  operateBtnType: _operateBtnType,
  hasBackground: _hasBackground,
  max: _max,
  addBtnProps: _addBtnProps,
  deleteBtnProps: _deleteBtnProps,
  copyBtnProps: _copyBtnProps,
  moveUpBtnProps: _moveUpBtnProps,
  moveDownBtnProps: _moveDownBtnProps,
  delConfirmProps: _delConfirmProps,
  remoteVersion: _rv,
  ...rest
}: WidgetProps) => {
  // dataPath 从 schema 获取（与 simpleList 同源）
  const dataPath = (schema as SchemaNode & { dataPath?: string })?.dataPath;

  // ── 数组与 items 判定（与 simpleList 完全一致） ──
  const array = Array.isArray(value) ? value : [];
  const isObjectItems = items?.type === 'object';
  const objSchema = isObjectItems ? (items as DataObjectSchema) : undefined;
  const objProperties = objSchema?.properties ?? {};
  const simpleSchema = !isObjectItems
    ? (items as DataFieldSchema | undefined)
    : undefined;

  // ── 批量订阅所有 item×field 的 hidden 联动状态 ──
  // 让 hidden 字段的整行（label + 控件）一起 display:none，
  // 避免单纯依赖 RenderItemControl 内部占位时 label 仍渲染造成的"空 label 行"
  const itemFieldPaths = useMemo(() => {
    if (!isObjectItems || !dataPath) {
      return [];
    }
    return array.flatMap((_, idx) =>
      Object.keys(objProperties).map((k) => `${dataPath}[${idx}].${k}`),
    );
  }, [array, isObjectItems, dataPath, objProperties]);
  const hiddenMap = useFieldsHidden(itemFieldPaths);

  // ── cardList 专属配置归一 ──
  const theme: CardListTheme = (_theme as CardListTheme) ?? 'card';
  const operateBtnType: OperateBtnType =
    (_operateBtnType as OperateBtnType) ?? 'text';
  const hasBackground = _hasBackground === true;
  const max = typeof _max === 'number' ? _max : undefined;
  const labelWidthPx = typeof labelWidth === 'number' ? labelWidth : 90;

  const addText = _addText as string | undefined;
  const removeText = _removeText as string | undefined;
  const copyText = _copyText as string | undefined;
  const hideAdd = _hideAdd === true;
  const hideDelete = _hideDelete === true;
  const hideMove = _hideMove === true;
  const hideCopy = _hideCopy === true;

  const addBtnProps =
    (_addBtnProps as Record<string, unknown> | undefined) ?? {};
  const deleteBtnProps =
    (_deleteBtnProps as Record<string, unknown> | undefined) ?? {};
  const copyBtnProps =
    (_copyBtnProps as Record<string, unknown> | undefined) ?? {};
  const moveUpBtnProps =
    (_moveUpBtnProps as Record<string, unknown> | undefined) ?? {};
  const moveDownBtnProps =
    (_moveDownBtnProps as Record<string, unknown> | undefined) ?? {};
  const delConfirmProps =
    (_delConfirmProps as Record<string, unknown> | undefined) ?? {};

  // 标题（items.title）为字符串 / 节点，用于项头部
  const baseTitle = objSchema?.title;

  // ── 数组操作（与 simpleList 完全一致） ──
  const handleAdd = () => {
    if (isObjectItems) {
      onChange(
        arrayAdd(
          array,
          getEmptyObject({
            type: 'object',
            widget: 'object',
            properties: objProperties,
          }),
        ),
      );
    } else {
      onChange(
        arrayAdd(
          array,
          getEmptyField(simpleSchema ?? { type: 'string', widget: 'input' }),
        ),
      );
    }
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

  // 简单类型：整个 item 值变更
  const handleSimpleItemChange = (index: number, itemValue: unknown) => {
    const newArr = [...array];
    newArr[index] = itemValue;
    onChange(newArr);
  };

  // 对象类型：某个字段变更
  const handleFieldChange = (
    index: number,
    fieldKey: string,
    fieldValue: unknown,
  ) => {
    const newArr = [...array];
    newArr[index] = { ...(newArr[index] as object), [fieldKey]: fieldValue };
    onChange(newArr);
  };

  // ── 操作按钮内容（cardList 样式：icon / text 两态 + *BtnProps 透传） ──
  // 沿用 listWidget 风格：使用 Unicode 字符（↑/↓/⎘/×），避免引入 @ant-design/icons
  const renderUpBtn = (index: number) => {
    const btnProps = {
      type: 'text' as const,
      size: 'small' as const,
      disabled: disabled || index === 0,
      onClick: () => handleMoveUp(index),
      ...moveUpBtnProps,
    };
    return operateBtnType === 'icon' ? (
      <Button {...btnProps}>↑</Button>
    ) : (
      <Button {...btnProps}>
        <span style={{ marginRight: 4 }}>↑</span>
        上移
      </Button>
    );
  };

  const renderDownBtn = (index: number) => {
    const btnProps = {
      type: 'text' as const,
      size: 'small' as const,
      disabled: disabled || index === array.length - 1,
      onClick: () => handleMoveDown(index),
      ...moveDownBtnProps,
    };
    return operateBtnType === 'icon' ? (
      <Button {...btnProps}>↓</Button>
    ) : (
      <Button {...btnProps}>
        <span style={{ marginRight: 4 }}>↓</span>
        下移
      </Button>
    );
  };

  const renderCopyBtn = (index: number) => {
    const btnProps = {
      type: 'text' as const,
      size: 'small' as const,
      disabled,
      onClick: () => handleCopy(index),
      ...copyBtnProps,
    };
    return operateBtnType === 'icon' ? (
      <Button {...btnProps}>⎘</Button>
    ) : (
      <Button {...btnProps}>
        <span style={{ marginRight: 4 }}>⎘</span>
        {copyText ?? '复制'}
      </Button>
    );
  };

  const renderDeleteBtn = (index: number) => {
    const btnProps = {
      type: 'text' as const,
      size: 'small' as const,
      danger: true,
      disabled,
      ...deleteBtnProps,
    };
    const delBtn =
      operateBtnType === 'icon' ? (
        <Button {...btnProps}>×</Button>
      ) : (
        <Button {...btnProps}>
          <span style={{ marginRight: 4 }}>×</span>
          {removeText ?? '删除'}
        </Button>
      );
    return (
      <Popconfirm
        title='确认删除该条目？'
        okText='删除'
        cancelText='取消'
        onConfirm={() => handleRemove(index)}
        disabled={disabled}
        {...delConfirmProps}
      >
        {delBtn}
      </Popconfirm>
    );
  };

  // 渲染操作按钮组（与 simpleList 同源：hide* 控制显隐，readOnly 时整体隐藏）
  const renderActions = (index: number) => {
    if (readOnly) {
      return null;
    }
    const nodes: React.ReactNode[] = [];
    if (!hideMove) {
      nodes.push(
        <span key='up'>{renderUpBtn(index)}</span>,
        <span key='down'>{renderDownBtn(index)}</span>,
      );
    }
    if (!hideCopy) {
      nodes.push(<span key='copy'>{renderCopyBtn(index)}</span>);
    }
    if (!hideDelete) {
      nodes.push(<span key='del'>{renderDeleteBtn(index)}</span>);
    }
    if (nodes.length === 0) {
      return null;
    }
    // operateBtnType='text' 时使用竖线分隔（x-render 视觉对齐）
    return (
      <Space
        size={4}
        split={
          operateBtnType === 'text' ? (
            <Divider type='vertical' style={{ margin: 0 }} />
          ) : undefined
        }
      >
        {nodes}
      </Space>
    );
  };

  // ── 项头部：序号徽标 + 标题 ──
  const renderItemHeader = (index: number) => {
    const displayTitle = baseTitle as React.ReactNode | undefined;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 500,
          color: 'rgba(0,0,0,0.85)',
          paddingRight: 120, // 给浮动操作区留位
        }}
      >
        {renderIndexBadge(index)}
        {displayTitle}
      </div>
    );
  };

  // ── 单项字段渲染（与 simpleList 同源：label + renderListItemField） ──
  const renderItemBody = (item: unknown, index: number) => {
    if (readOnly) {
      // 只读模式：键值对文本（label 左 / 值右）
      if (!isObjectItems) {
        // 简单类型只读
        return renderListItemField(
          {
            path: `${dataPath}[${index}]`,
            fieldSchema: simpleSchema ?? { type: 'string', widget: 'input' },
            value: item,
            readOnly: true,
          },
          true,
        );
      }
      const itemRecord = (item as Record<string, unknown>) ?? {};
      return (
        <div>
          {Object.entries(objProperties).map(([key, fieldNode]) => {
            const fieldDef = fieldNode as DataFieldSchema;
            const fieldLabel = fieldDef.title ?? key;
            const fieldPath = `${dataPath}[${index}].${key}`;
            // hidden 字段整行隐藏（label + 文本一起）
            const isRowHidden = hiddenMap[fieldPath] === true;
            return (
              <div
                key={key}
                data-nexus-row-hidden={isRowHidden ? fieldPath : undefined}
                style={{
                  display: isRowHidden ? 'none' : 'flex',
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: labelWidthPx,
                    flexShrink: 0,
                    color: 'rgba(0,0,0,0.45)',
                  }}
                >
                  {fieldLabel}
                </span>
                <span style={{ flex: 1, color: 'rgba(0,0,0,0.85)' }}>
                  {renderListItemField(
                    {
                      path: fieldPath,
                      fieldSchema: fieldDef,
                      value: itemRecord[key],
                      readOnly: true,
                    },
                    true,
                  )}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    if (!isObjectItems) {
      // 简单类型：整个项一个控件
      return renderListItemField(
        {
          path: `${dataPath}[${index}]`,
          fieldSchema: simpleSchema ?? { type: 'string', widget: 'input' },
          value: item,
          onChange: (v) => handleSimpleItemChange(index, v),
          readOnly,
          disabled,
          placeholder: simpleSchema?.placeholder,
        },
        true,
      );
    }

    // 对象类型：逐字段一行（label 左 / 控件右）
    const itemRecord = (item as Record<string, unknown>) ?? {};
    return (
      <div>
        {Object.entries(objProperties).map(([key, fieldNode]) => {
          const fieldDef = fieldNode as DataFieldSchema;
          const fieldLabel = fieldDef.title ?? key;
          const fieldPath = `${dataPath}[${index}].${key}`;
          // hidden 字段整行 display:none（label + 控件一起），与 NexusField 隐藏策略一致
          const isRowHidden = hiddenMap[fieldPath] === true;
          return (
            <div
              key={key}
              data-nexus-row-hidden={isRowHidden ? fieldPath : undefined}
              style={{
                display: isRowHidden ? 'none' : 'flex',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <Typography.Text
                type='secondary'
                style={{
                  width: labelWidthPx,
                  flexShrink: 0,
                  fontSize: 13,
                  lineHeight: '32px',
                }}
              >
                {fieldLabel}
              </Typography.Text>
              <div style={{ flex: 1 }}>
                {renderListItemField(
                  {
                    path: fieldPath,
                    fieldSchema: fieldDef,
                    value: itemRecord[key],
                    onChange: (v) => handleFieldChange(index, key, v),
                    readOnly,
                    disabled,
                  },
                  true,
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── 单项渲染（cardList 外观：三种主题） ──
  const renderItem = (item: unknown, index: number) => {
    const actions = renderActions(index);
    const header = renderItemHeader(index);
    const body = renderItemBody(item, index);
    const operateFixed = getOperateFixed(objSchema);
    const operateStyle = getOperateStyle(objSchema, theme, operateFixed);

    if (theme === 'collapse') {
      return (
        <Collapse
          key={`cardlist-collapse-${index}`}
          ghost
          bordered={false}
          style={{ marginBottom: 8 }}
          items={[
            {
              key: String(index),
              label: header,
              extra: actions,
              children: body,
            },
          ]}
        />
      );
    }

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      marginBottom: 12,
    };

    // lineTitle：无边框，仅标题行 + 分隔
    if (theme === 'lineTitle') {
      return (
        <div key={`cardlist-line-${index}`} style={containerStyle}>
          {header}
          {operateFixed ? <div style={operateStyle}>{actions}</div> : actions}
          <div style={{ paddingTop: 8 }}>{body}</div>
        </div>
      );
    }

    // card（默认）：antd Card 包裹
    return (
      <Card
        key={`cardlist-card-${index}`}
        size='small'
        style={{
          ...containerStyle,
          background: hasBackground ? '#fafafa' : '#fff',
        }}
        title={header}
        extra={operateFixed ? undefined : actions}
      >
        {operateFixed ? <div style={operateStyle}>{actions}</div> : null}
        {body}
      </Card>
    );
  };

  // 是否已达 max 上限（超过则隐藏新增按钮）
  const reachMax = typeof max === 'number' && array.length >= max;
  const showAdd = !readOnly && !hideAdd && !reachMax;
  const addButtonText =
    addText ??
    (typeof baseTitle === 'string' && baseTitle ? `添加${baseTitle}` : '添加');

  return (
    <div {...rest}>
      {array.length === 0 && (
        <div
          style={{
            color: 'rgba(0,0,0,0.25)',
            textAlign: 'center',
            padding: '12px 0',
            fontSize: 13,
          }}
        >
          暂无数据
        </div>
      )}
      {array.map(renderItem)}
      {showAdd && (
        <Button
          type='dashed'
          onClick={handleAdd}
          disabled={disabled}
          block
          {...addBtnProps}
        >
          {operateBtnType === 'icon' ? '+' : `+ ${addButtonText}`}
        </Button>
      )}
    </div>
  );
};
