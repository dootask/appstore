import { useState, useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { darcula as SyntaxStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AppApi } from '@/lib';
import i18n from '@/i18n';

export default function Development() {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");

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
    fetchContent();

    // 监听语言变化
    const handleLanguageChange = () => {
      fetchContent();
    };
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

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
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12">
          {loading ? renderSkeleton() : (
            <div className="flex w-full">
              <div className="flex-1 w-0 prose app-markdown-body">
                <ReactMarkdown
                  children={content}
                  components={{
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
                />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
