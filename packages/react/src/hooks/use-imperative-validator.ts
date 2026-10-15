// ────────────────────────────────────────────────────────────────────────────
// useImperativeValidator — widget 通过 addons.fieldRef 命令式注册校验器
//
// 渲染层（NexusField / RenderItemControl）调用本 Hook 创建 ref 并挂到 addons，
// widget 内部用 useImperativeHandle 把校验方法暴露出来：
//
// ```tsx
// const MyWidget = (props: WidgetProps) => {
//   const { addons } = props;
//   useImperativeHandle(addons?.fieldRef, () => ({
//     // 将校验方法暴露出去，方便外部表单提交时触发校验
//     validator: (value, formData) => (value ? [] : ['该字段必填']),
//   }));
//   return <input value={props.value} onChange={(e) => props.onChange(e.target.value)} />;
// };
// ```
//
// 时序：widget 的 useImperativeHandle 走 layout effect，早于本 Hook 的 passive
// effect，因此首次渲染即可读到句柄并注册到引擎；注册后校验器与
// `form.registerValidator` 完全等价——参与实时校验（change / blur）与提交校验。
//
// 调试：可通过 `localStorage.setItem('NEXUS_DEBUG_IMPERATIVE_VALIDATOR', '1')`
// 打开本模块的详细日志，定位 "注册失败 / 校验器未被调用" 类问题。
// ────────────────────────────────────────────────────────────────────────────

import type { FieldValidator, NexusFormInstance } from '@xbeeant/form-engine';
import { type RefObject, useEffect, useRef } from 'react';

/**
 * widget 通过 `useImperativeHandle(addons.fieldRef, ...)` 暴露的命令式句柄
 */
export interface NexusFieldRefHandle {
  /**
   * 字段校验器：返回错误消息数组（空数组 = 校验通过），同步 / 异步（Promise）均可。
   * 签名与 `form.registerValidator` 保持一致。
   */
  validator?: FieldValidator;
  /** 扩展位：widget 可继续暴露其它命令式方法（如 focus / reset）供外部调用 */
  [key: string]: unknown;
}

/**
 * `addons.fieldRef` 的类型（可直接传给 useImperativeHandle）
 */
export type NexusFieldRefObject = RefObject<NexusFieldRefHandle | null>;

/**
 * 调试开关：可通过 (window as any).__NEXUS_DEBUG_IMPERATIVE_VALIDATOR = true
 * 或 localStorage `NEXUS_DEBUG_IMPERATIVE_VALIDATOR=1` 打开详细日志，
 * 便于定位「注册失败 / 校验器未被调用」类问题，避免对正常用户产生噪音。
 */
function isImperativeValidatorDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // 1) 全局开关（程序化开启，CI/测试场景）
  const w = window as unknown as {
    __NEXUS_DEBUG_IMPERATIVE_VALIDATOR?: boolean;
  };
  if (w.__NEXUS_DEBUG_IMPERATIVE_VALIDATOR === true) {
    return true;
  }
  // 2) localStorage 开关（开发期手动开启）
  try {
    return (
      window.localStorage?.getItem('NEXUS_DEBUG_IMPERATIVE_VALIDATOR') === '1'
    );
  } catch {
    return false;
  }
}

function debugLog(...args: unknown[]): void {
  if (isImperativeValidatorDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[NexusForm][imperative-validator]', ...args);
  }
}

/**
 * 创建 `addons.fieldRef`，并把 widget 暴露的 validator 注册到引擎
 *
 * - 注册时机：widget 挂载后（useImperativeHandle 已写入句柄）；句柄未就绪时
 *   随 `version` 变化重试（覆盖 hidden → visible 等延迟挂载场景）
 * - 闭包新鲜度：注册的是稳定包装器，实际调用时才读取 `fieldRef.current`，
 *   widget 每次渲染重建句柄也不会拿到过期闭包
 * - 卸载时注销，避免校验器累积
 *
 * @param form - 表单实例（NexusField 的 props.form，undefined 时跳过注册）
 * @param path - 字段数据路径（undefined 时跳过注册）
 * @param version - 字段版本号（引擎 fieldVersion），用于重试注册
 * @returns 需挂到 addons.fieldRef 的 ref 对象
 */
export function useImperativeValidator(
  form: NexusFormInstance | undefined,
  path: string | undefined,
  version?: number,
): NexusFieldRefObject {
  const fieldRef = useRef<NexusFieldRefHandle | null>(null);
  // 已注册的包装校验器（引用稳定，供注销使用）
  const wrapperRef = useRef<FieldValidator | null>(null);
  // 已尝试注册的次数（仅记录失败次数，供调试；不影响逻辑）
  const retryCountRef = useRef(0);

  // 注册：widget 的 useImperativeHandle（layout effect）早于本 passive effect，
  // 首次渲染即可读到句柄；未读到（如字段隐藏、widget 未渲染）时随 version 重试
  useEffect(() => {
    if (!form || !path) {
      debugLog('skip: form/path 缺失', { hasForm: !!form, path });
      return;
    }
    if (wrapperRef.current) {
      // 已注册，version 等变化只做重试机会（保留 wrapper）；这里直接返回
      debugLog('skip: 已注册 wrapper, 不重复注册', { path, version });
      return;
    }
    if (!fieldRef.current?.validator) {
      // 显式失败：句柄尚未就绪（旧实现下完全静默；现通过 version 触发重试，失败计数 +1）。
      // 对调用方可见 —— 调试模式会输出原因，普通模式下仅给出一次性 warn 避免噪音。
      retryCountRef.current += 1;
      if (retryCountRef.current === 1) {
        // eslint-disable-next-line no-console
        console.warn(
          `[NexusForm][imperative-validator] 暂未注册 "${path}" 的命令式校验器：` +
            'addons.fieldRef.current.validator 为空。' +
            '可能原因：widget 尚未挂载、widget 未通过 useImperativeHandle 暴露 validator，' +
            '或字段当前处于 hidden 状态。本次渲染会自动重试（version 变化/组件挂载完成时）。',
        );
      }
      debugLog('retry: 句柄就绪检查失败', {
        path,
        version,
        attempt: retryCountRef.current,
        hasFieldRef: !!fieldRef.current,
        hasValidator: !!fieldRef.current?.validator,
      });
      return;
    }

    // 包装器在调用时才解引用 ref：句柄重建后仍执行最新闭包的 validator
    const wrapper: FieldValidator = (value, formData) => {
      const validator = fieldRef.current?.validator;
      if (!validator) {
        // 引擎在 widget 卸载与 unregisterValidator 之间仍可能持有旧 wrapper
        // （同步事件循环里 setFieldValue → validateFieldRealtime 已被调度）；
        // 这种边界返回 [] 而不是抛错，符合「显式失败兜底为通过」语义。
        debugLog('invoke: 句柄已被清空，返回空错误兜底', { path });
        return [];
      }
      return validator(value, formData);
    };
    wrapperRef.current = wrapper;
    form.registerValidator(path, wrapper);

    debugLog('register: 已注册命令式校验器', {
      path,
      version,
      attempts: retryCountRef.current + 1,
    });
    // 成功后清零重试计数，避免后续误读
    retryCountRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, path, version]);

  // 注销：仅在卸载 / path 变化时执行（version 变化只做重试，不重复注册）
  useEffect(() => {
    return () => {
      const wrapper = wrapperRef.current;
      if (wrapper && form && path) {
        form.unregisterValidator(path, wrapper);
        debugLog('unregister: 注销命令式校验器', { path });
      }
      wrapperRef.current = null;
      retryCountRef.current = 0;
    };
  }, [form, path]);

  return fieldRef;
}
