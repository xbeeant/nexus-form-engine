// ============================================================================
// DependencyGraph — 显式依赖图
// 目标：在 Schema 初始化时静态构建依赖边，提供 O(1) 的查询能力
// 严禁运行时动态扫描 Schema，保证 O(k) 的联动更新复杂度
// 性能优化：增加 getDependentsRef 避免防御性拷贝
//
// 典型使用场景：
// - Engine.runReactionsForSource 通过 getDependentsRef(source) 作 O(k) 联动查询
// - Engine.getDependents / getDependencies 对外提供防御性拷贝的安全查询
// - 数组项子字段重建时先 removeDependencies 再 addDependencies，保证边始终指向最新字段
// ============================================================================

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * 依赖图结构：
 * - dependenciesOf: target → Set<source>（target 依赖哪些源字段）
 * - dependentsOf:   source → Set<target>（哪些字段依赖 source，即 getDependents 查询结果）
 */
export class DependencyGraph {
  /** 依赖边：target → Set<source> */
  private dependenciesOf = new Map<string, Set<string>>();
  /** 反向依赖边：source → Set<target> */
  private dependentsOf = new Map<string, Set<string>>();

  /**
   * 添加一条依赖边：target 依赖 source
   *
   * @param target - 目标字段路径（受联动影响的字段）
   * @param source - 源字段路径（被依赖的字段）
   */
  addDependency(target: string, source: string): void {
    let set = this.dependenciesOf.get(target);
    if (!set) {
      set = new Set();
      this.dependenciesOf.set(target, set);
    }
    set.add(source);

    set = this.dependentsOf.get(source);
    if (!set) {
      set = new Set();
      this.dependentsOf.set(source, set);
    }
    set.add(target);
  }

  /**
   * 批量添加依赖边
   *
   * @param target - 目标字段路径
   * @param sources - 源字段路径集合
   */
  addDependencies(target: string, sources: Iterable<string>): void {
    for (const source of sources) {
      this.addDependency(target, source);
    }
  }

  /**
   * 移除一条依赖边：target 不再依赖 source
   *
   * 用于运行时重建的字段（如数组项子字段随数组值增减而重建）：
   * 重建时先移除旧边的依赖关系，再为新的字段路径注册依赖边，
   * 保证依赖关系始终指向最新 fieldStates（移除后相关的空 Set 一并清理）。
   *
   * @param target - 目标字段路径
   * @param source - 源字段路径
   */
  removeDependency(target: string, source: string): void {
    const depSet = this.dependenciesOf.get(target);
    if (depSet) {
      depSet.delete(source);
      if (depSet.size === 0) {
        this.dependenciesOf.delete(target);
      }
    }

    const depSet2 = this.dependentsOf.get(source);
    if (depSet2) {
      depSet2.delete(target);
      if (depSet2.size === 0) {
        this.dependentsOf.delete(source);
      }
    }
  }

  /**
   * 批量移除依赖边
   *
   * @param target - 目标字段路径
   * @param sources - 源字段路径集合
   */
  removeDependencies(target: string, sources: Iterable<string>): void {
    for (const source of sources) {
      this.removeDependency(target, source);
    }
  }

/**
 * 返回依赖指定字段的所有字段集合（副本，供外部安全使用）
 *
 * source 变化时，这些字段的 reactions 需要重新执行。
 * 返回防御性拷贝，防止外部篡改依赖图。
 * 注意：热路径（如联动执行）应使用 getDependentsRef 避免拷贝开销。
 *
 * @param path - 源字段路径
 * @returns 依赖该字段的所有字段集合（副本）
 */
getDependents(path: string): Set<string> {
  return new Set(this.dependentsOf.get(path));
}

/**
 * 返回依赖指定字段的所有字段集合（只读引用，内部热路径使用，避免复制）
 *
 * 返回内部 Set 的直接引用（只读封装），调用方不应修改返回集合；
 * 引擎内部联动执行（runReactionsForSource）用它做 O(k) 遍历，避免每次拷贝。
 *
 * @param path - 源字段路径
 * @returns 只读的依赖字段集合；无依赖时返回空只读 Set（非 undefined）
 */
getDependentsRef(path: string): ReadonlySet<string> {
  return this.dependentsOf.get(path) ?? EMPTY_SET;
}

  /**
   * 获取指定字段所依赖的所有源字段集合
   *
   * @param path - 字段路径
   * @returns 该字段依赖的所有源字段集合（副本）
   */
  getDependencies(path: string): Set<string> {
    return new Set(this.dependenciesOf.get(path));
  }

  /**
   * 判断字段是否参与了依赖关系
   *
   * @param path - 字段路径
   * @returns 字段是否存在于依赖图中
   */
  hasNode(path: string): boolean {
    return this.dependenciesOf.has(path) || this.dependentsOf.has(path);
  }

  /**
   * 获取所有参与依赖关系的节点
   *
   * @returns 节点路径数组
   */
  getNodes(): string[] {
    const nodes = new Set<string>();
    for (const key of this.dependenciesOf.keys()) {
      nodes.add(key);
    }
    for (const key of this.dependentsOf.keys()) {
      nodes.add(key);
    }
    return Array.from(nodes);
  }

  /**
   * 清空依赖图
   */
  clear(): void {
    this.dependenciesOf.clear();
    this.dependentsOf.clear();
  }
}
