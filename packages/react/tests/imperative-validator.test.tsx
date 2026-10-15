import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useImperativeHandle, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

afterEach(() => {
  cleanup();
});

// ── 测试辅助 ──────────────────────────────────────────────────────────────

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

/**
 * 通过 `useImperativeHandle(addons.fieldRef, () => ({ validator }))` 暴露校验器的 widget
 * minLength 来自 schema props（可随重渲染变化）
 */
function RefValidatorWidget(props: any) {
  const { addons, path, value, onChange, minLength } = props;
  useImperativeHandle(addons?.fieldRef, () => ({
    validator: (val: unknown) => {
      const v = String(val ?? '');
      if (v && v.length < minLength) {
        return [`至少 ${minLength} 个字符`];
      }
      return [];
    },
  }));
  return (
    <input
      data-testid={`input-${path}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** 组件内部 state 参与校验：validator 闭包读取 limit */
function StatefulRefWidget(props: any) {
  const { addons, path, value, onChange } = props;
  const [limit, setLimit] = useState(3);
  useImperativeHandle(addons?.fieldRef, () => ({
    validator: (val: unknown) => {
      const v = String(val ?? '');
      if (v && v.length < limit) {
        return [`至少 ${limit} 个字符`];
      }
      return [];
    },
  }));
  return (
    <>
      <input
        data-testid={`input-${path}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <button data-testid='bump-limit' onClick={() => setLimit(8)} />
    </>
  );
}

/** 异步校验器 */
function AsyncRefWidget(props: any) {
  const { addons, path, value, onChange } = props;
  useImperativeHandle(addons?.fieldRef, () => ({
    validator: async (val: unknown) => {
      const v = String(val ?? '');
      if (!v) {
        return [];
      }
      await new Promise((r) => setTimeout(r, 10));
      return v === 'taken' ? [`"${v}" 已被占用`] : [];
    },
  }));
  return (
    <input
      data-testid={`input-${path}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** 测试用表单：widget 通过 NexusForm widgets 注册（引擎按名解析） */
function TestForm({
  schema,
  widgets,
  onForm,
}: {
  schema: unknown;
  widgets: Record<string, (props: any) => React.ReactNode>;
  onForm: (form: FormController) => void;
}) {
  const [form] = useForm();
  onForm(form);
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      widgets={{ input: StubInput, ...widgets }}
    />
  );
}

// ── addons.fieldRef 注册校验器 ───────────────────────────────────────────

describe('widget useImperativeHandle 注册 validator', () => {
  it('提交的字段校验触发 widget 暴露的 validator', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ refValidator: RefValidatorWidget }}
        schema={{
          type: 'object',
          properties: {
            code: {
              type: 'string',
              widget: 'refValidator',
              title: '编码',
              props: { minLength: 5 },
            },
          },
        }}
      />,
    );
    const form = holder.form!;

    await act(async () => {
      form.setValueByPath('code', 'abc');
    });

    const errors = await form.validateFields(['code']);
    expect(errors.get('code')).toEqual(['至少 5 个字符']);
  });

  it('值变更时实时校验（同步错误写入 fieldState）', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ refValidator: RefValidatorWidget }}
        schema={{
          type: 'object',
          properties: {
            nickname: {
              type: 'string',
              widget: 'refValidator',
              props: { minLength: 4 },
            },
          },
        }}
      />,
    );
    const form = holder.form!;

    await act(async () => {
      form.setValueByPath('nickname', 'ab');
    });
    expect(form.getFieldState('nickname')?.errors).toEqual(['至少 4 个字符']);

    await act(async () => {
      form.setValueByPath('nickname', 'abcd');
    });
    expect(form.getFieldState('nickname')?.errors).toEqual([]);
  });

  it('组件 state 变化后执行最新闭包的 validator', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ stateful: StatefulRefWidget }}
        schema={{
          type: 'object',
          properties: {
            title: { type: 'string', widget: 'stateful' },
          },
        }}
      />,
    );
    const form = holder.form!;

    await act(async () => {
      form.setValueByPath('title', 'abcd');
    });
    // limit = 3：'abcd' 通过
    expect((await form.validateFields(['title'])).size).toBe(0);

    // 组件内部 state → limit = 8，句柄重建后校验仍走最新闭包
    await act(async () => {
      fireEvent.click(document.querySelector('[data-testid="bump-limit"]')!);
    });
    const errors = await form.validateFields(['title']);
    expect(errors.get('title')).toEqual(['至少 8 个字符']);
  });

  it('异步 validator 在提交校验中被 await', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ asyncRef: AsyncRefWidget }}
        schema={{
          type: 'object',
          properties: {
            username: { type: 'string', widget: 'asyncRef' },
          },
        }}
      />,
    );
    const form = holder.form!;

    await act(async () => {
      form.setValueByPath('username', 'taken');
    });
    const errors = await form.validateFields(['username']);
    expect(errors.get('username')).toEqual(['"taken" 已被占用']);
  });

  it('未暴露 validator 的 widget 不注册校验器', () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{}}
        schema={{
          type: 'object',
          properties: {
            plain: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );

    expect(holder.form!._getEngine().getFieldValidators().has('plain')).toBe(
      false,
    );
  });

  it('字段移除后注销校验器', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ refValidator: RefValidatorWidget }}
        schema={{
          type: 'object',
          properties: {
            temp: {
              type: 'string',
              widget: 'refValidator',
              props: { minLength: 5 },
            },
          },
        }}
      />,
    );
    const form = holder.form!;
    const engine = form._getEngine();
    expect(engine.getFieldValidators().has('temp')).toBe(true);

    await act(async () => {
      form.setSchema({ type: 'object', properties: {} } as never);
    });
    expect(engine.getFieldValidators().has('temp')).toBe(false);
  });

  it('隐藏字段展示后补齐注册（version 重试）', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ refValidator: RefValidatorWidget }}
        schema={{
          type: 'object',
          properties: {
            toggle: { type: 'string', widget: 'input' },
            secret: {
              type: 'string',
              widget: 'refValidator',
              props: { minLength: 6 },
              hidden: '{{ formData.toggle !== "on" }}',
            },
          },
        }}
      />,
    );
    const form = holder.form!;
    const engine = form._getEngine();
    // 初始隐藏：widget 未渲染，尚未注册
    expect(engine.getFieldValidators().has('secret')).toBe(false);

    await act(async () => {
      form.setValueByPath('toggle', 'on');
      form.setValueByPath('secret', 'abc');
    });

    // 展示后 widget 挂载 → 句柄就绪 → 注册生效
    expect(engine.getFieldValidators().has('secret')).toBe(true);
    const errors = await form.validateFields(['secret']);
    expect(errors.get('secret')).toEqual(['至少 6 个字符']);
  });

  // ── 调试日志 + 调用点防护 ──────────────────────────────────────────────

  /**
   * 镜像 issue：用户在 widget 内部写
   * `useImperativeHandle(props?.addons?.fieldRef, () => ({ validator }))`，
   * 但反馈「字段值变化时没有触发校验器」。本用例使用真实 input.change 事件
   * 验证：NexusField 渲染层 → engine.setFieldValue → validateFieldRealtime
   * 整条链路能命中 widget 暴露的 validator，并把错误写入 fieldState。
   */
  it('input change 触发 widget 暴露的 validator（用户输入路径）', async () => {
    const holder: { form?: FormController } = {};

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ refValidator: RefValidatorWidget }}
        schema={{
          type: 'object',
          properties: {
            code: {
              type: 'string',
              widget: 'refValidator',
              title: '编码',
              props: { minLength: 5 },
            },
          },
        }}
      />,
    );
    const form = holder.form!;

    // 初次渲染后，命令式校验器应当已注册到引擎
    expect(form._getEngine().getFieldValidators().has('code')).toBe(true);

    // 模拟用户输入
    const input = document.querySelector(
      'input[data-testid="input-code"]',
    )! as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'ab' } });
    });
    expect(form.getFieldState('code')?.errors).toEqual(['至少 5 个字符']);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'abcde' } });
    });
    expect(form.getFieldState('code')?.errors).toEqual([]);
  });

  it('widget 未暴露 validator 时跳过注册并发出一次性 warn', async () => {
    const holder: { form?: FormController } = {};
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 制造一个看起来「提交校验正常但 useImperativeHandle 句柄内不含 validator」
    // 的 widget：refs 存在但 validator 字段为 undefined（模拟用户写错 API）
    function NoValidatorHandleWidget(props: any) {
      const { addons } = props;
      useImperativeHandle(addons?.fieldRef, () => ({ focus: () => {} }));
      return <input data-testid='input-noValidator' value='' readOnly />;
    }

    render(
      <TestForm
        onForm={(form) => {
          holder.form = form;
        }}
        widgets={{ noValidator: NoValidatorHandleWidget }}
        schema={{
          type: 'object',
          properties: {
            username: { type: 'string', widget: 'noValidator' },
          },
        }}
      />,
    );
    const form = holder.form!;

    // 未暴露 validator → 不应注册到引擎
    expect(form._getEngine().getFieldValidators().has('username')).toBe(false);

    // 应当看到来自 useImperativeValidator 的显式警告，而不是静默失败
    const warnings = warnSpy.mock.calls
      .map((args) => args[0])
      .filter(
        (msg): msg is string =>
          typeof msg === 'string' && msg.includes('imperative-validator'),
      );
    expect(warnings.length).toBeGreaterThanOrEqual(1);

    warnSpy.mockRestore();
  });

  it('调试开关打开时输出 register 日志', async () => {
    window.localStorage.setItem('NEXUS_DEBUG_IMPERATIVE_VALIDATOR', '1');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      render(
        <TestForm
          onForm={() => {}}
          widgets={{ refValidator: RefValidatorWidget }}
          schema={{
            type: 'object',
            properties: {
              code: {
                type: 'string',
                widget: 'refValidator',
                props: { minLength: 3 },
              },
            },
          }}
        />,
      );

      const registerLogs = logSpy.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('imperative-validator') &&
          args.some(
            (a) => typeof a === 'object' && a && 'path' in (a as object),
          ),
      );
      expect(registerLogs.length).toBeGreaterThanOrEqual(1);
    } finally {
      window.localStorage.removeItem('NEXUS_DEBUG_IMPERATIVE_VALIDATOR');
      logSpy.mockRestore();
    }
  });
});
