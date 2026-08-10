// ============================================================================
// DependencyGraph — 显式依赖图
// 目标：在 Schema 初始化时静态构建依赖边，提供 O(1) 的查询能力
// 严禁运行时动态扫描 Schema，保证 O(k) 的联动更新复杂度
// ============================================================================

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
   * 获取依赖指定字段的所有字段集合
   *
   * source 变化时，这些字段的 reactions 需要重新执行
   * 返回防御性拷贝，防止外部篡改依赖图
   *
   * @param path - 源字段路径
   * @returns 依赖该字段的所有字段集合（副本）
   */
  getDependents(path: string): Set<string> {
    return new Set(this.dependentsOf.get(path));
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
