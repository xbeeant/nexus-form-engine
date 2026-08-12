import { createContext } from 'react';

/**
 * 字段继承上下文 — 数据对象容器（NexusObject）向下游字段下发继承属性
 *
 * 语义：
 * - 仅「激活」状态被下发：disabled/readOnly 只在父容器显式启用时
 *   携带 true（父级未设置时上下文不存在该键），子字段自行合并
 * - visible 为 false 表示祖先对象容器隐藏，子树整体不可见
 * - 合并优先级：祖先（已激活） > 字段自身状态 > 默认值
 */
export interface FieldInheritValue {
  /** 祖先对象容器禁用（仅 true 存在） */
  disabled?: boolean;
  /** 祖先对象容器只读（仅 true 存在） */
  readOnly?: boolean;
  /** 祖先对象容器隐藏 → 子树不可见（false 存在时子树全部隐藏） */
  visible?: boolean;
}

export const FieldInheritContext = createContext<FieldInheritValue>({});