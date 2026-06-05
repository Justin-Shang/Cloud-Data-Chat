import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { 
  useGetDataset, getGetDatasetQueryKey, 
  useListRecords, getListRecordsQueryKey 
} from "@workspace/api-client-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export function DatasetViewer() {
  const [, params] = useRoute("/datasets/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? parseInt(params.id) : 0;

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const { data: dataset, isLoading: isDatasetLoading } = useGetDataset(id, {
    query: { enabled: !!id, queryKey: getGetDatasetQueryKey(id) }
  });

  const { data: recordsData, isLoading: isRecordsLoading } = useListRecords(
    id, 
    { query: searchQuery || undefined, limit, offset }, 
    { query: { enabled: !!id, queryKey: getListRecordsQueryKey(id, { query: searchQuery || undefined, limit, offset }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
    setPage(1);
  };

  const totalPages = recordsData?.total ? Math.ceil(recordsData.total / limit) : 1;

  if (isDatasetLoading && !dataset) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-32" />
        <Card className="mt-8">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold">数据集不存在</h2>
        <Button variant="link" className="mt-4" asChild>
          <Link href="/datasets">返回数据集列表</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground" asChild>
            <Link href="/datasets" className="flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> 返回数据集
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{dataset.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dataset.filename} · {dataset.rowCount.toLocaleString()} 行 · 上传于 {format(new Date(dataset.createdAt), 'yyyy年M月d日', { locale: zhCN })}
          </p>
        </div>
        
        <Button onClick={() => setLocation(`/chat?datasetId=${dataset.id}`)} className="flex items-center gap-2" data-testid="button-chat-dataset">
          <MessageSquare className="w-4 h-4" />
          对话查询
        </Button>
      </div>

      <Card className="shadow-sm border-border flex-1 flex flex-col overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/50 flex flex-row items-center justify-between flex-shrink-0">
          <form onSubmit={handleSearch} className="flex items-center relative flex-1 max-w-md">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="筛选记录..." 
              className="pl-9" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-filter-records"
            />
            <Button type="submit" variant="secondary" className="absolute right-1 h-7 text-xs">筛选</Button>
          </form>
          
          {recordsData && (
            <div className="text-sm text-muted-foreground ml-4 hidden sm:block">
              显示第 {offset + 1}–{Math.min(offset + limit, recordsData.total)} 条，共 {recordsData.total.toLocaleString()} 条
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {isRecordsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recordsData?.records && recordsData.records.length > 0 ? (
            <div className="relative">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    {dataset.columns.map((col, i) => (
                      <TableHead key={i} className="whitespace-nowrap font-semibold">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsData.records.map((record) => (
                    <TableRow key={record.id}>
                      {dataset.columns.map((col, i) => {
                        const val = record.rowData[col];
                        return (
                          <TableCell key={i} className="max-w-[300px] truncate" title={String(val ?? '')}>
                            {val !== null && val !== undefined ? String(val) : <span className="text-muted-foreground/40 italic">空</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg font-medium text-foreground">未找到记录</p>
              {searchQuery && <p className="text-sm mt-1">请尝试修改筛选条件</p>}
            </div>
          )}
        </CardContent>
        
        {recordsData && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between flex-shrink-0 bg-muted/20">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
            </Button>
            <span className="text-sm font-medium">
              第 {page} 页，共 {totalPages} 页
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              下一页 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
