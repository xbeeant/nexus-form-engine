import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import { useMDXComponents } from '../lib/mdx';
import { docs } from '../lib/source';

export function MdxDocsPage({ path }: { path: string }) {
  const page =
    docs.getPage(path) ??
    docs.getPage(`${path}/index`) ??
    docs.getPage(`${path}.mdx`);

  if (!page) {
    return (
      <DocsPage>
        <DocsTitle>页面不存在</DocsTitle>
        <DocsBody>未找到文档：{path}</DocsBody>
      </DocsPage>
    );
  }

  return (
    <DocsPage toc={page.toc}>
      <DocsTitle>{page.title}</DocsTitle>
      {page.description ? (
        <DocsDescription>{page.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <page.body components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
