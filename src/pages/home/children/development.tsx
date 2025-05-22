import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula as SyntaxStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Skeleton } from '@/components/ui/skeleton';
import { AppApi } from '@/lib';
import i18n from '@/i18n';
import remarkGfm from 'remark-gfm';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function Development() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [toc, setToc] = useState<TocItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const generateHeadingId = (text: string) => {
    return `content-${text
      .toLowerCase() // 转小写
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 只保留英文、数字、下划线、空格、中文、连字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符替换为单个
      .replace(/^-|-$/g, '') // 删除首尾连字符
    }`;
  };

  const getHeadingText = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children.map(child => {
        if (typeof child === 'string') return child;
        if (child?.props?.children) return getHeadingText(child.props.children);
        return '';
      }).join('');
    }
    if (children?.props?.children) return getHeadingText(children.props.children);
    return '';
  };

  const generateToc = () => {
    if (!contentRef.current) return;

    const headings = contentRef.current.querySelectorAll('h1, h2, h3');
    const tocItems: TocItem[] = [];

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      const text = heading.textContent || '';
      const id = heading.id;

      tocItems.push({
        id,
        text,
        level
      });
    });

    // 如果第一层只有一个标题，删除它并提升其他层级
    if (tocItems.length > 0) {
      const firstLevelItems = tocItems.filter(item => item.level === 1);
      if (firstLevelItems.length === 1) {
        const filteredItems = tocItems
          .filter(item => item.level > 1)
          .map(item => ({
            ...item,
            level: item.level - 1
          }));
        setToc(filteredItems);
        return;
      }
    }

    setToc(tocItems);
  };

  const scrollToElement = (element: HTMLElement | null) => {
    if (!element) return;
    const elementTop = element.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({
      top: elementTop,
      behavior: 'smooth'
    });
  };

  const fetchContent = () => {
    setLoading(true);
    AppApi.getAppReadme('_').then(({data}) => {
      if (data) {
        setContent(data.content);
      }
    }).catch((err) => {
      console.error('Failed to load development guide:', err);
    }).finally(() => {
      setLoading(false);
    });
  };
  

  useEffect(() => {
    if (toc.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash === 'publish') {
      const h2Elements = contentRef.current?.querySelectorAll('h2');
      const targetElement = h2Elements?.[2];
      if (targetElement) {
        scrollToElement(targetElement as HTMLElement);
      }
    } else if (hash) {
      scrollToElement(contentRef.current?.querySelector(`#${hash}`) as HTMLElement);
    }
  }, [toc])

  useEffect(() => {
    fetchContent();

    const handleLanguageChange = () => {
      fetchContent();
    };
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setTimeout(generateToc, 0);
    }
  }, [loading, content]);

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const element = contentRef.current?.querySelector(`#${id}`) as HTMLElement;
    if (element) {
      e.preventDefault();
      window.history.replaceState(null, '', `#${id}`);
      scrollToElement(element);
    }
  };

  const renderSkeleton = () => {
    return (
      <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm sm:prose dark:prose-invert max-w-none">
        {/* 标题骨架屏 */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded" />
          <Skeleton className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-700 rounded" />
        </div>

        {/* 目录结构骨架屏 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3 bg-gray-200 dark:bg-zinc-700 rounded" />
          <div className="space-y-2 pl-4">
            <Skeleton className="h-4 w-full bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[90%] bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[85%] bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[95%] bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>

        {/* 配置文件说明骨架屏 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/4 bg-gray-200 dark:bg-zinc-700 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[95%] bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[90%] bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
          {/* 代码块骨架屏 */}
          <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-4/5 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>

        {/* 开发建议骨架屏 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3 bg-gray-200 dark:bg-zinc-700 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[95%] bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[90%] bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-4 w-[85%] bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>

        {/* 底部链接骨架屏 */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/4 bg-gray-200 dark:bg-zinc-700 rounded" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-zinc-700 rounded" />
            <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="px-8 md:px-16">
      <div className="container mx-auto py-8 md:py-12">
        {loading ? renderSkeleton() : (
          <div className="flex w-full gap-8">
            {/* 目录 */}
            <div className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24">
                <h4 className="text-sm font-semibold mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-4">目录</h4>
                <nav className="space-y-1.5 pl-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleTocClick(e, item.id)}
                      className={`block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors overflow-hidden text-ellipsis whitespace-nowrap py-1 px-2 ${
                        item.level === 1 ? 'font-medium' : ''
                      }`}
                      style={{
                        paddingLeft: `${(item.level - 1) * 1.25}rem`,
                      }}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 w-0 prose app-markdown-body" ref={contentRef}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  h2: ({node, ...props}) => <h2 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  h3: ({node, ...props}) => <h3 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  h4: ({node, ...props}) => <h4 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  h5: ({node, ...props}) => <h5 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  h6: ({node, ...props}) => <h6 id={generateHeadingId(getHeadingText(props.children))} {...props} />,
                  code(props) {
                    const {children, className, ...rest} = props;
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <SyntaxHighlighter
                        PreTag="div"
                        children={String(children).replace(/\n$/, '')}
                        language={match[1]}
                        style={SyntaxStyle}
                        customStyle={{
                          padding: 'var(--base-size-16)',
                          margin: 'calc(var(--base-size-16) * -1)',
                          backgroundColor: '#151b23',
                        }}
                      />
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                  a(props) {
                    const {children, ...rest} = props;
                    return (
                      <a {...rest} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    );
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
