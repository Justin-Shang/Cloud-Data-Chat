import { useGetDatasetsStats, getGetDatasetsStatsQueryKey, useListDatasets, getListDatasetsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, FileSpreadsheet, Search, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stats, isLoading: isStatsLoading } = useGetDatasetsStats({
    query: { queryKey: getGetDatasetsStatsQueryKey() }
  });

  const { data: datasets, isLoading: isDatasetsLoading } = useListDatasets({
    query: { queryKey: getListDatasetsQueryKey() }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLocation(`/chat?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">欢迎使用数据对话</h1>
        <p className="text-muted-foreground mt-2">您的专业结构化数据分析工作台。</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">数据集总数</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalDatasets || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">记录总数</CardTitle>
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalRecords?.toLocaleString() || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">字段总数</CardTitle>
            <Sparkles className="w-4 h-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-16 bg-primary-foreground/20" />
            ) : (
              <div className="text-3xl font-bold">{stats?.totalColumns || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle>快速查询</CardTitle>
          <CardDescription>向任意数据集提问</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="例如：查找销售额超过 10000 的客户..." 
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-quick-query"
              />
            </div>
            <Button type="submit" className="h-12 px-8" data-testid="button-quick-search">
              开始查询
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">最近上传</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/datasets">查看全部</Link>
          </Button>
        </div>
        
        {isDatasetsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
          </div>
        ) : datasets && datasets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {datasets.slice(0, 4).map((dataset) => (
              <Card key={dataset.id} className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" onClick={() => setLocation(`/datasets/${dataset.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold truncate pr-4" title={dataset.name}>
                      {dataset.name}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-md">
                      {new Date(dataset.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <CardDescription className="truncate" title={dataset.filename}>
                    {dataset.filename}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground flex gap-4">
                  <span>{dataset.rowCount.toLocaleString()} 行</span>
                  <span>{dataset.columnCount} 列</span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground border-dashed">
            <Database className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>暂无数据集。</p>
            <Button variant="link" className="mt-2" asChild>
              <Link href="/datasets">上传第一个数据集</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
