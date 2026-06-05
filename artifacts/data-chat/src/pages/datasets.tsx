import { useState, useRef } from "react";
import { Link } from "wouter";
import { useListDatasets, getListDatasetsQueryKey, useDeleteDataset, getGetDatasetsStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Database, FileUp, MoreHorizontal, Trash2, Search, Table as TableIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function Datasets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: datasets, isLoading } = useListDatasets({
    query: { queryKey: getListDatasetsQueryKey() }
  });

  const deleteMutation = useDeleteDataset({
    mutation: {
      onSuccess: () => {
        toast({ title: "数据集已删除" });
        queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDatasetsStatsQueryKey() });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "删除失败", variant: "destructive" });
      }
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      toast({ title: "上传成功" });
      queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDatasetsStatsQueryKey() });
    } catch (error) {
      toast({ title: "上传失败", description: "无法解析该 Excel 文件，请重试。", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredDatasets = datasets?.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">数据集</h1>
          <p className="text-muted-foreground mt-1">管理您上传的数据来源。</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx,.xls" 
            onChange={handleFileChange} 
            data-testid="input-file-upload"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            data-testid="button-upload-dataset"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                上传中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                上传 Excel
              </span>
            )}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索数据集..." 
              className="max-w-sm pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-datasets"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredDatasets && filteredDatasets.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">名称</TableHead>
                  <TableHead>文件</TableHead>
                  <TableHead className="text-right">行数</TableHead>
                  <TableHead className="text-right">列数</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDatasets.map((dataset) => (
                  <TableRow key={dataset.id} className="group">
                    <TableCell className="font-medium">
                      <Link href={`/datasets/${dataset.id}`} className="hover:underline flex items-center gap-2" data-testid={`link-dataset-${dataset.id}`}>
                        <Database className="w-4 h-4 text-primary" />
                        {dataset.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dataset.filename}</TableCell>
                    <TableCell className="text-right">{dataset.rowCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{dataset.columnCount}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(dataset.createdAt), 'yyyy年M月d日', { locale: zhCN })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-dataset-options-${dataset.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/datasets/${dataset.id}`} className="cursor-pointer flex items-center gap-2">
                              <TableIcon className="w-4 h-4" /> 查看数据
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-2"
                            onClick={() => setDeleteId(dataset.id)}
                            data-testid={`menu-delete-dataset-${dataset.id}`}
                          >
                            <Trash2 className="w-4 h-4" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">暂无数据集</p>
              <p className="text-sm">上传 Excel 文件开始使用。</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除数据集</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该数据集吗？此操作不可撤销，将永久删除所有关联记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
