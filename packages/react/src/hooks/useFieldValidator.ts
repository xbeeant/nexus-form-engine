// ────────────────────────────────────────────────────────────────────────────
// useFieldValidator — 在 widget 组件内命令式注册字段校验规则
//
// 对齐 x-render 子表单内部校验思路：校验逻辑写在 UI 组件内部，
// 而非全部下沉到 Schema。组件通过自身 dataPath + form 实例注册校验器，
// 校验器可访问组件闭包内状态（实现与组件 state 联动）。
//
// 使用：
// ```tsx
// export const confirmPasswordWidget = withFormItem((props) => {
//   const { dataPath, form, value } = props;
//   const [strict, setStrict] = useState(false);
//   useFieldValidator(form, dataPath, (val, formData) => {
//     if (strict && val && val !== formData.password) {
//       return ['两次输入的密码不一致'];
//     }
//     return [];
//   }, { dependsOn: ['password'], deps: [strict] });
//   return <Input.Password ... />;
// });
// ```
// ────────────────────────────────────────────────────────────────────────────

import type { NexusEngine, NexusFormInstance } from '@nexus/form-engine';
import { useEffect, useRef } from 'react';
import { useNexusContext } from '../contexts/NexusContext.ts';

export type FieldValidator = (
  value: unknown,
  formData: Record<string, unknown>,
) => string[] | Promise<string[]>;

export interface UseFieldValidatorOptions {
  /**
   * 依赖字段路径列表。这些字段变化时自动对目标字段重校验，
   * 实现「组件内注册的跨字段校验」与依赖字段的实时联动
   * （等价于 schema 中 validate 表达式的依赖图联动）。
   */
  dependsOn?: string[];
  /**
   * 校验器闭包依赖的组件 state（useEffect 语义）。
   * 任意依赖值变化时，校验器会重新注册，新闭包捕获最新的组件 state，
   * 保证校验逻辑读到的是当前渲染的 state，而不是注册时刻的陈旧值。
   *
   * 用法：
   * ```tsx
   * const [strict, setStrict] = useState(false);
   * useFieldValidator(form, dataPath, (val, formData) => {
   *   if (strict && val && val !== formData.password) { ... }
   * }, { deps: [strict] });
   * ```
   */
  deps?: ReadonlyArray<unknown>;
}

/**
 * 在 widget 组件内注册字段校验规则
 *
 * - 挂载时调用 form.registerValidator(path, validator)
 * - 卸载时调用 form.unregisterValidator 清理，避免校验器累积
 * - validator 通过 ref 持有最新闭包；deps 变化时 effect 重跑，
 *   重新注册捕获最新组件 state 的新闭包（useEffect 语义），
 *   校验逻辑总能读到当前渲染的组件 state
 * - 传入 dependsOn 时，订阅依赖字段变化并实时重校验目标字段
 *
 * @param form - 表单实例（widget 的 props.form）
 * @param path - 字段路径（widget 的 props.dataPath）
 * @param validator - 校验函数，返回错误消息数组（空数组 = 通过）
 * @param options - 配置（dependsOn 依赖字段联动 / deps 闭包依赖的组件 state）
 */
export function useFieldValidator(
  form: NexusFormInstance | undefined,
  path: string | undefined,
  validator: FieldValidator,
  options?: UseFieldValidatorOptions,
): void {
  const { engine } = useNexusContext();

  // 用 ref 保存最新 validator/options，避免外部 inline 函数导致每次渲染重注册
  const validatorRef = useRef(validator);
  validatorRef.current = validator;
  const dependsRef = useRef(options?.dependsOn);
  dependsRef.current = options?.dependsOn;
  const deps = options?.deps;

  // 注册 / 注销校验器
  // deps 变化（useEffect 语义）时 effect 重跑：unregister 旧闭包 → register 新闭包，
  // 新闭包捕获 deps 中声明的最新组件 state。
  useEffect(() => {
    if (!form || !path) {
      return;
    }
    const current = validatorRef.current;
    form.registerValidator(path, current);
    return () => {
      form.unregisterValidator(path, current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, path, ...(deps ?? [])]);

  // 订阅依赖字段变化 → 实时重校验目标字段（跨字段联动）
  useEffect(() => {
    if (!path || !dependsRef.current || dependsRef.current.length === 0) {
      return;
    }
    const engineSafe = engine as NexusEngine | undefined;
    if (!engineSafe) {
      return;
    }
    const target = path;
    const unsubscribers = dependsRef.current.map((dep) =>
      engineSafe.subscribeField(dep, () => {
        form?.revalidateField(target);
      }),
    );
    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [engine, form, path]);
}
