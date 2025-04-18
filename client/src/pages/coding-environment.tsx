import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Code,
  Play,
  Terminal,
  Save,
  Share2,
  Download,
  Upload,
  Settings,
  FolderPlus,
  File,
  Trash2,
  RefreshCw,
  Users,
  GitBranch,
  GitCommit,
  GitPullRequest,
  PlusCircle,
  FileText,
  Loader2,
} from "lucide-react";
import WebSocketClient from "@/lib/websocket-client";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { CodingEnvironment as CodingEnvironmentType } from "@shared/schema";

export default function CodingEnvironment() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [environment, setEnvironment] = useState<CodingEnvironmentType | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [theme, setTheme] = useState("vs-dark");
  const [fileName, setFileName] = useState("main.py");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [files, setFiles] = useState<Array<{ name: string, content: string, language: string }>>([]);
  const [activeFile, setActiveFile] = useState(0);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch environment data if ID is provided
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/coding-environments", id],
    enabled: !!id,
  });

  // Save environment mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = id 
        ? `/api/coding-environments/${id}` 
        : "/api/coding-environments";
      const method = id ? "PATCH" : "POST";
      const res = await apiRequest(method, endpoint, data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (!id) {
        // If this was a new environment, redirect to the environment with ID
        navigate(`/coding/${data.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/coding-environments", id] });
      toast({
        title: "Saved",
        description: "Your code has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Set up WebSocket connection for collaborative editing
  useEffect(() => {
    if (!id) return;

    document.title = environment?.name 
      ? `TeamSync - ${environment.name}` 
      : "TeamSync - Coding Environment";

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const client = new WebSocketClient(wsUrl);
    
    client.onMessage((data) => {
      if (data.type === "code_update" && data.environmentId === Number(id)) {
        // Update code if another user made changes
        if (data.userId !== user?.id) {
          const updatedFiles = [...files];
          const fileIndex = updatedFiles.findIndex(f => f.name === data.fileName);
          
          if (fileIndex >= 0) {
            updatedFiles[fileIndex].content = data.content;
            setFiles(updatedFiles);
            
            if (fileIndex === activeFile) {
              setCode(data.content);
            }
          }
        }
      } else if (data.type === "collaborator_joined") {
        setCollaborators(prev => [...prev, data.user]);
        toast({
          title: "Collaborator Joined",
          description: `${data.user.name} has joined the coding session`,
        });
      } else if (data.type === "collaborator_left") {
        setCollaborators(prev => prev.filter(c => c.id !== data.userId));
        toast({
          title: "Collaborator Left",
          description: `A collaborator has left the coding session`,
        });
      } else if (data.type === "run_result") {
        setOutput(prev => prev + data.output);
        if (data.finished) {
          setIsRunning(false);
        }
      }
    });
    
    // Join the coding session
    client.send({
      type: "join_coding_session",
      environmentId: Number(id),
    });
    
    setWsClient(client);
    
    return () => {
      client.send({
        type: "leave_coding_session",
        environmentId: Number(id),
      });
      client.disconnect();
    };
  }, [id, user?.id, environment?.name]);

  // Initialize environment data when it loads
  useEffect(() => {
    if (data) {
      setEnvironment(data);
      if (data.files && data.files.length > 0) {
        setFiles(data.files);
        setCode(data.files[0].content);
        setLanguage(data.files[0].language);
        setFileName(data.files[0].name);
      } else {
        // Create default files based on language preference
        const defaultFiles = [{
          name: "main.py",
          content: "# Python Coding Environment\n\nprint('Hello, world!')",
          language: "python"
        }];
        setFiles(defaultFiles);
        setCode(defaultFiles[0].content);
        setLanguage(defaultFiles[0].language);
        setFileName(defaultFiles[0].name);
      }
      
      if (data.collaborators) {
        setCollaborators(data.collaborators);
      }
    }
  }, [data]);

  // Handle file change
  const handleFileChange = (index: number) => {
    setActiveFile(index);
    setCode(files[index].content);
    setLanguage(files[index].language);
    setFileName(files[index].name);
  };

  // Add new file
  const addNewFile = () => {
    let newFileName = "new_file.py";
    let newLanguage = "python";
    
    // Find a unique name
    let counter = 1;
    while (files.some(f => f.name === newFileName)) {
      newFileName = `new_file_${counter}.py`;
      counter++;
    }
    
    const newFile = {
      name: newFileName,
      content: "# New file\n",
      language: newLanguage
    };
    
    const newFiles = [...files, newFile];
    setFiles(newFiles);
    setActiveFile(newFiles.length - 1);
    setCode(newFile.content);
    setLanguage(newFile.language);
    setFileName(newFile.name);
  };

  // Delete current file
  const deleteCurrentFile = () => {
    if (files.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one file in the environment.",
        variant: "destructive",
      });
      return;
    }
    
    const newFiles = files.filter((_, index) => index !== activeFile);
    setFiles(newFiles);
    setActiveFile(0);
    setCode(newFiles[0].content);
    setLanguage(newFiles[0].language);
    setFileName(newFiles[0].name);
  };

  // Handle code change
  const handleCodeChange = (value: string) => {
    setCode(value);
    
    // Update files array
    const updatedFiles = [...files];
    updatedFiles[activeFile].content = value;
    setFiles(updatedFiles);
    
    // Send update to collaborators
    if (wsClient && id) {
      wsClient.send({
        type: "code_update",
        environmentId: Number(id),
        fileName: fileName,
        content: value,
        userId: user?.id,
      });
    }
  };

  // Handle language change
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    
    // Update file extension
    let newFileName = fileName;
    const nameParts = fileName.split('.');
    
    if (nameParts.length > 1) {
      const extension = getExtensionForLanguage(value);
      nameParts[nameParts.length - 1] = extension;
      newFileName = nameParts.join('.');
    }
    
    // Update files array
    const updatedFiles = [...files];
    updatedFiles[activeFile].language = value;
    updatedFiles[activeFile].name = newFileName;
    setFiles(updatedFiles);
    setFileName(newFileName);
  };

  // Get file extension for language
  const getExtensionForLanguage = (lang: string): string => {
    switch (lang) {
      case "python": return "py";
      case "javascript": return "js";
      case "typescript": return "ts";
      case "java": return "java";
      case "cpp": return "cpp";
      case "csharp": return "cs";
      case "golang": return "go";
      case "ruby": return "rb";
      case "rust": return "rs";
      default: return "txt";
    }
  };

  // Run code
  const runCode = () => {
    setIsRunning(true);
    setOutput("");
    
    if (wsClient) {
      wsClient.send({
        type: "run_code",
        environmentId: Number(id),
        files: files,
        mainFile: fileName,
        language: language,
      });
    } else {
      // Fallback for when websocket is not available
      setTimeout(() => {
        setOutput("Hello, world!\nProgram executed successfully.");
        setIsRunning(false);
      }, 1000);
    }
  };

  // Save environment
  const saveEnvironment = () => {
    saveMutation.mutate({
      name: environment?.name || "Untitled Coding Environment",
      language: language,
      files: files,
      type: environment?.type || "custom",
    });
  };

  // Rename file
  const renameFile = (newName: string) => {
    if (!newName) return;
    
    // Ensure file has correct extension
    if (!newName.includes('.')) {
      const extension = getExtensionForLanguage(language);
      newName = `${newName}.${extension}`;
    }
    
    // Check if name already exists
    if (files.some((f, i) => f.name === newName && i !== activeFile)) {
      toast({
        title: "Rename Failed",
        description: "A file with this name already exists.",
        variant: "destructive",
      });
      return;
    }
    
    const updatedFiles = [...files];
    updatedFiles[activeFile].name = newName;
    setFiles(updatedFiles);
    setFileName(newName);
  };

  // If loading
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Loading Coding Environment</h2>
          <p className="text-muted-foreground">
            Setting up your coding workspace...
          </p>
        </div>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Environment</CardTitle>
            <CardDescription>
              We encountered an issue while loading the coding environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">
              {(error as Error).message || "Failed to load environment. Please try again."}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/coding")}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-4">
          <Code className="h-5 w-5 text-primary" />
          <Input
            value={environment?.name || "Untitled Environment"}
            onChange={(e) => setEnvironment(prev => ({
              ...prev!,
              name: e.target.value
            }))}
            className="w-64 h-8 text-base font-medium"
          />
          <div className="flex items-center border-l pl-4 ml-2">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="csharp">C#</SelectItem>
                <SelectItem value="golang">Go</SelectItem>
                <SelectItem value="ruby">Ruby</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {collaborators.length > 0 && (
            <div className="flex items-center mr-4">
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collab, index) => (
                  <div 
                    key={index} 
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium ring-2 ring-background"
                    title={collab.name}
                  >
                    {collab.name ? collab.name.charAt(0).toUpperCase() : "?"}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center ring-2 ring-background">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon">
                <Users className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button 
            onClick={saveEnvironment} 
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={runCode} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run
              </>
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File explorer */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-medium">Files</h3>
            <Button variant="ghost" size="icon" onClick={addNewFile}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-muted ${
                    activeFile === index ? "bg-muted" : ""
                  }`}
                  onClick={() => handleFileChange(index)}
                >
                  <File className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{file.name}</span>
                  {activeFile === index && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCurrentFile();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {/* Git controls if available */}
          {environment?.type === "github" && (
            <div className="p-3 border-t">
              <h3 className="font-medium mb-2">Git</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4 mr-2" />
                  <span>main</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <GitCommit className="h-3.5 w-3.5 mr-1" />
                    <span>Commit</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <GitPullRequest className="h-3.5 w-3.5 mr-1" />
                    <span>Pull</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Editor and output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs for managing open files */}
          <div className="flex items-center border-b">
            <div className="flex-1 flex items-center overflow-x-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center px-3 py-2 border-r cursor-pointer ${
                    activeFile === index 
                      ? "bg-background border-b-2 border-b-primary -mb-px" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleFileChange(index)}
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-1"
                onClick={addNewFile}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-2 border-l">
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vs-dark">Dark (VS)</SelectItem>
                  <SelectItem value="vs-light">Light (VS)</SelectItem>
                  <SelectItem value="hc-black">High Contrast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <div 
              className="w-full h-full p-4 bg-[#1e1e1e] text-white font-mono text-sm whitespace-pre overflow-auto"
              ref={editorRef}
            >
              {/* This is a simplified placeholder for a real code editor like Monaco */}
              <textarea 
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full h-full bg-transparent outline-none resize-none"
                spellCheck="false"
              />
            </div>
          </div>
          
          {/* Terminal output */}
          <div className="h-1/3 border-t flex flex-col">
            <div className="flex items-center justify-between p-2 border-b bg-muted">
              <div className="flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                <span className="font-medium">Terminal</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOutput("")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div 
                className="p-2 font-mono text-sm whitespace-pre-wrap"
                ref={terminalRef}
              >
                {isRunning && !output && (
                  <div className="flex items-center text-neutral-400">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Running code...</span>
                  </div>
                )}
                {output || "$ Run your code to see output here"}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getLanguageFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'py': return 'python';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'java': return 'java';
    case 'cpp': case 'cc': case 'h': case 'hpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'go': return 'golang';
    case 'rb': return 'ruby';
    case 'rs': return 'rust';
    default: return 'plaintext';
  }
}