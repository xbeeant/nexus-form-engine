import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

const renders: Record<string, number> = {};

function StubInput(props: any) {
  renders[props.path] = (renders[props.path] ?? 0) + 1;
  return (
    <input
      data-testid={`input-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

const holder: { form?: FormController } = {};

function TestForm({
  schema,
  widgets,
  onFinish,
  onFinishFailed,
  watch,
  onValuesChange,
}: {
  schema: unknown;
  widgets?: Record<string, (props: any) => React.ReactNode>;
  onFinish?: (data: Record<string, unknown>) => void;
  onFinishFailed?: (errors: Map<string, string[]>) => void;
  watch?: Record<
    string,
    (value: unknown, allValues: Record<string, unknown>) => void
  >;
  onValuesChange?: (
    changedValue: unknown,
    allValues: Record<string, unknown>,
    changedPath: string,
  ) => void;
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      widgets={{ input: StubInput, ...widgets }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      watch={watch}
      onValuesChange={onValuesChange}
    />
  );
}

const simpleSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', widget: 'input', title: '用户名' },
    email: { type: 'string', widget: 'input', title: '邮箱' },
  },
};

// ── FormController 聚合 API 路由 ──────────────────────────────────────────

describe('FormController 聚合 API', () => {
  it('setValues：聚合写入全部实例', async () => {
    const { container } = render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setValues({ username: 'alice' });
    await new Promise((r) => setTimeout(r, 50));
    expect(form.getValueByPath('username')).toBe('alice');
  });

  it('getValues：聚合读取全部实例', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setValueByPath('username', 'charlie');
    form.setValueByPath('email', 'c@test.com');
    const all = form.getValues();
    expect(all).toHaveProperty('username', 'charlie');
    expect(all).toHaveProperty('email', 'c@test.com');
  });

  it('resetFields：重置全部实例', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setValueByPath('username', 'test');
    form.setValueByPath('email', 'test@test.com');
    form.resetFields();
    expect(form.getValueByPath('username')).toBe('');
    expect(form.getValueByPath('email')).toBe('');
  });

  it('setSchema：聚合替换全部实例 Schema', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const newSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名' },
      },
    };
    form.setSchema(newSchema);
    expect(form.getSchema()).toEqual(newSchema);
  });

  it('setSchemaByPath：按路径更新 Schema', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setSchemaByPath('username', { title: '新标题' });
    const engine = form._getEngine();
    const state = engine.getFieldState('username');
    expect(state?.meta.title).toBe('新标题');
  });

  it('removeErrorField：移除指定字段的校验错误', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setErrorFields([{ path: 'username', errors: ['必填'] }]);
    expect(form.getFieldError('username')).toEqual(['必填']);
    form.removeErrorField('username');
    expect(form.getFieldError('username')).toEqual([]);
  });

  it('setErrorFields：批量设置服务端校验错误', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.setErrorFields([
      { path: 'username', errors: ['用户名不存在'] },
      { path: 'email', errors: ['邮箱格式错误'] },
    ]);
    const errors = form.getFieldsError();
    expect(errors.get('username')).toEqual(['用户名不存在']);
    expect(errors.get('email')).toEqual(['邮箱格式错误']);
  });

  it('scrollToPath：定位到指定字段', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    form.scrollToPath('username');
    expect(scrollIntoView).toHaveBeenCalled();
    scrollIntoView.mockClear();
    form.scrollToPath('nonexistent');
  });

  it('getFieldState：返回字段状态', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const state = form.getFieldState('username');
    expect(state).toBeDefined();
    expect(state?.value).toBe('');
  });

  it('reloadRemoteData：聚合转发到全部实例', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const engine = form._getEngine();
    expect(engine.getRemoteDataVersion('username')).toBe(0);
    form.reloadRemoteData('username');
    expect(engine.getRemoteDataVersion('username')).toBe(1);
  });
});

// ── FormController submit 全流程 ──────────────────────────────────────────

describe('FormController submit 流程', () => {
  it('submit 成功：校验通过 → onFinish 触发', async () => {
    let resolveFinish: () => void = () => {};
    const finishPromise = new Promise<void>((resolve) => {
      resolveFinish = resolve;
    });
    const onFinish = vi.fn(() => finishPromise);

    function SubmitForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={simpleSchema}
          widgets={{ input: StubInput }}
          onFinish={onFinish}
        />
      );
    }
    render(<SubmitForm />);
    const form = holder.form!;
    const submitPromise = form.submit();
    resolveFinish();
    await submitPromise;
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toMatchObject({
      username: '',
      email: '',
    });
  });

  it('submit 失败：校验不通过 → onFinishFailed 触发', async () => {
    const onFinishFailed = vi.fn();

    function FailForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              required: {
                type: 'string',
                widget: 'input',
                required: true,
              },
            },
          }}
          widgets={{ input: StubInput }}
          onFinishFailed={onFinishFailed}
        />
      );
    }

    render(<FailForm />);
    const form = holder.form!;
    await form.submit();
    expect(onFinishFailed).toHaveBeenCalledTimes(1);
  });
});

// ── FormController 校验 API ──────────────────────────────────────────────

describe('FormController 校验 API', () => {
  it('validateFields：校验指定字段', async () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const errors = await form.validateFields(['username']);
    expect(errors).toBeDefined();
  });

  it('validate 异步校验：通过 registerValidator 注册', async () => {
    function AsyncValidateForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              code: { type: 'string', widget: 'input', title: '验证码' },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<AsyncValidateForm />);
    const form = holder.form!;
    form.registerValidator('code', (val) => {
      if (val !== '1234') {
        return ['验证码错误'];
      }
      return [];
    });
    form.setValueByPath('code', '0000');
    await new Promise((r) => setTimeout(r, 500));
  });
});

// ── FormController watch 路由 ─────────────────────────────────────────────

describe('FormController watch 路由', () => {
  it('watch：路径匹配时触发回调', () => {
    const watchFn = vi.fn();
    let capturedForm: any = null;

    function WatchForm() {
      const [form] = useForm();
      capturedForm = form;
      return (
        <NexusForm
          form={form}
          schema={simpleSchema}
          widgets={{ input: StubInput }}
          watch={{
            username: watchFn,
          }}
        />
      );
    }
    render(<WatchForm />);
    capturedForm.setValueByPath('username', 'alice');
    expect(watchFn).toHaveBeenCalledTimes(1);
    expect(watchFn.mock.calls[0][0]).toBe('alice');
  });

  it('onValuesChange：值变更回调携带 changedPath', () => {
    const onChange = vi.fn();
    let capturedForm: any = null;

    function ChangeForm() {
      const [form] = useForm();
      capturedForm = form;
      return (
        <NexusForm
          form={form}
          schema={simpleSchema}
          widgets={{ input: StubInput }}
          onValuesChange={onChange}
        />
      );
    }
    render(<ChangeForm />);
    capturedForm.setValueByPath('username', 'eve');
    expect(onChange).toHaveBeenCalledTimes(1);
    const [, , changedPath] = onChange.mock.calls[0];
    expect(changedPath).toBe('username');
  });
});

// ── FormController 工具方法 ───────────────────────────────────────────────

describe('FormController 工具方法', () => {
  it('getHiddenValues：获取 hidden 字段值', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const hidden = form.getHiddenValues();
    expect(hidden).toBeDefined();
  });

  it('getAllValues：获取所有字段值（含 hidden）', () => {
    render(<TestForm schema={simpleSchema} />);
    const form = holder.form!;
    const all = form.getAllValues();
    expect(all).toHaveProperty('username');
    expect(all).toHaveProperty('email');
  });

  it('getSchema：返回当前 Schema', () => {
    const testSchema = {
      type: 'object',
      properties: { name: { type: 'string', widget: 'input' } },
    };
    render(<TestForm schema={testSchema} />);
    const form = holder.form!;
    expect(form.getSchema()).toEqual(testSchema);
  });
});
