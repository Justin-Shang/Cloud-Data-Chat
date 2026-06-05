import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useGetChatHistory, getGetChatHistoryQueryKey,
  useSendChatMessage, useListDatasets, getListDatasetsQueryKey,
  ChatMessage as APIChatMessage
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Database, Loader2, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatMessageDisplay extends Partial<APIChatMessage> {
  localId?: string;
  isOptimistic?: boolean;
  content: string;
  role: string;
  results?: any;
}

export function Chat() {
  const [location] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  const initialQuery = queryParams.get("q") || "";
  const initialDatasetId = queryParams.get("datasetId") || "all";

  const [input, setInput] = useState(initialQuery);
  const [datasetId, setDatasetId] = useState(initialDatasetId);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();

  const { data: datasets } = useListDatasets({
    query: { queryKey: getListDatasetsQueryKey() }
  });

  const { data: history, isLoading: isHistoryLoading } = useGetChatHistory({
    query: { queryKey: getGetChatHistoryQueryKey() }
  });

  const sendMessageMutation = useSendChatMessage({
    mutation: {
      onSuccess: (data) => {
        setMessages(prev => [
          ...prev.filter(m => !m.isOptimistic),
          {
            ...data.message,
            results: data.results.total > 0 ? data.results : undefined,
          },
        ]);
        queryClient.invalidateQueries({ queryKey: getGetChatHistoryQueryKey() });
      },
      onError: () => {
        setMessages(prev => [
          ...prev.filter(m => !m.isOptimistic),
          { localId: `err-${Date.now()}`, role: "assistant", content: "抱歉，处理您的请求时出现错误，请稍后重试。" }
        ]);
      }
    }
  });

  useEffect(() => {
    if (history && !sendMessageMutation.isPending && messages.length === 0 && !initialQuery) {
      setMessages(history);
    }
  }, [history, sendMessageMutation.isPending, initialQuery]);

  useEffect(() => {
    if (initialQuery && !sendMessageMutation.isPending && messages.length === 0) {
      handleSend(initialQuery);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("q");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [initialQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;
    
    const dId = datasetId === "all" ? null : parseInt(datasetId);
    
    setMessages(prev => [...prev, { 
      localId: `opt-${Date.now()}`, 
      role: "user", 
      content: text,
      isOptimistic: true 
    }]);
    
    setInput("");
    
    sendMessageMutation.mutate({
      data: {
        message: text,
        datasetId: dId
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> 数据助手
          </h1>
          <p className="text-sm text-muted-foreground mt-1">用自然语言查询您的数据集。</p>
        </div>
        
        <div className="w-[200px]">
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="全部数据集" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部数据集</SelectItem>
              {datasets?.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-border bg-card">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {messages.length === 0 && !isHistoryLoading && !sendMessageMutation.isPending && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">有什么可以帮您？</h3>
              <p className="max-w-md">试试输入关键词或短语，例如"查找状态为有效的记录"或搜索特定姓名、编号。</p>
              
              <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-lg">
                {["查找优先级高的记录", "搜索张三", "显示最新录入的数据", "我有哪些数据集？"].map((suggestion, i) => (
                  <Button 
                    key={i} 
                    variant="outline" 
                    className="justify-start text-xs h-auto py-3 px-4"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id || msg.localId || idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar className={`w-8 h-8 border ${msg.role === 'assistant' ? 'bg-primary border-primary' : 'bg-secondary border-border'}`}>
                <AvatarFallback className={msg.role === 'assistant' ? 'text-primary-foreground bg-transparent' : 'bg-transparent text-secondary-foreground'}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted text-foreground rounded-tl-sm'
                } ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                  {msg.content}
                </div>
                
                {msg.results && msg.results.results.length > 0 && (
                  <div className="mt-3 w-full max-w-full overflow-hidden border border-border rounded-xl bg-background shadow-sm">
                    <div className="px-4 py-2 border-b border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>匹配结果</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">共 {msg.results.total} 条</span>
                    </div>
                    <ScrollArea className="max-h-[300px] w-full">
                      <div className="p-0">
                        {msg.results.results.slice(0, 5).map((res: any, i: number) => (
                          <div key={i} className="p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Database className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">{res.datasetName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                              {Object.entries(res.rowData).slice(0, 4).map(([k, v]: [string, any], j) => (
                                <div key={j} className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</span>
                                  <span className="truncate" title={String(v)}>{v !== null ? String(v) : '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 border bg-primary border-primary">
                <AvatarFallback className="text-primary-foreground bg-transparent">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl bg-muted rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">正在搜索数据...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={onSubmit} className="relative flex items-center">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入关键词或问题..."
              className="pr-12 h-14 rounded-xl border-border bg-background shadow-inner-xs focus-visible:ring-primary/20 text-base"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-2 h-10 w-10 rounded-lg"
              disabled={!input.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">数据助手基于关键词匹配，结果仅供参考，请以原始数据为准。</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
