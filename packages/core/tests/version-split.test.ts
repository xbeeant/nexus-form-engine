import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/Engine';

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string', widget: 'input' },
    age: { type: 'number', widget: 'input' },
  },
};

describe('Engine 版本拆分（store / render）', () => {
  it('init 同时递增 store 版本与渲染树版本', () => {
    const engine = new NexusEngine();
    const storeBefore = engine.getSnapshot();
    const renderBefore = engine.getRenderSnapshot();
    engine.init(schema as never, { username: 'a' });

    expect(engine.getSnapshot()).toBeGreaterThan(storeBefore);
    expect(engine.getRenderSnapshot()).toBeGreaterThan(renderBefore);
  });

  it('setFieldValue 仅递增 store 版本，渲染树版本不变（字段级精准订阅）', () => {
    const engine = new NexusEngine();
    engine.init(schema as never);
    const renderBefore = engine.getRenderSnapshot();
    const storeBefore = engine.getSnapshot();

    engine.setFieldValue('username', 'zhangsan');

    expect(engine.getSnapshot()).toBeGreaterThan(storeBefore);
    expect(engine.getRenderSnapshot()).toBe(renderBefore);
  });

  it('validate 仅递增 store 版本（错误展示走字段级订阅）', () => {
    const engine = new NexusEngine();
    engine.init(schema as never);
    const renderBefore = engine.getRenderSnapshot();

    engine.setFieldValue('age', 0);
    engine.validate();

    expect(engine.getRenderSnapshot()).toBe(renderBefore);
  });

  it('subscribeRender 仅在结构变化时触发，数据变化不触发', () => {
    const engine = new NexusEngine();
    engine.init(schema as never);
    let renderNotifications = 0;
    const unsub = engine.subscribeRender(() => {
      renderNotifications++;
    });

    engine.setFieldValue('username', 'a');
    engine.setFieldValue('age', 1);
    expect(renderNotifications).toBe(0);

    engine.init(schema as never);
    expect(renderNotifications).toBeGreaterThan(0);
    unsub();
  });

  it('setFieldValue 仍通知 store 订阅者（useFormData 依赖）', () => {
    const engine = new NexusEngine();
    engine.init(schema as never);
    let storeNotifications = 0;
    const unsub = engine.subscribeStore(() => {
      storeNotifications++;
    });

    engine.setFieldValue('username', 'a');
    expect(storeNotifications).toBe(1);
    unsub();
  });
});