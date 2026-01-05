import { useRef, useState, useCallback } from 'react';
import { useKanban } from '@/hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { ThemeToggle } from './ThemeToggle';
import { Download, Upload, Trash2, LayoutDashboard, FileJson, Pencil, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function KanbanBoard() {
  const {
    columns,
    boardName,
    setBoardName,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    exportBoard,
    importBoard,
    clearBoard,
  } = useKanban();

  const [draggedTask, setDraggedTask] = useState<{ taskId: string; columnId: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(boardName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, taskId: string, columnId: string) => {
    setDraggedTask({ taskId, columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string, targetIndex?: number) => {
    e.preventDefault();
    if (draggedTask) {
      moveTask(draggedTask.taskId, draggedTask.columnId, targetColumnId, targetIndex);
      setDraggedTask(null);
    }
  };

  const handleExport = () => {
    exportBoard();
    toast({
      title: 'Board exported',
      description: 'Your Kanban board has been saved as a JSON file.',
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Invalid file type',
        description: 'Please drop a JSON file.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await importBoard(file);
      toast({
        title: 'Board imported',
        description: 'Your Kanban board has been restored successfully.',
      });
    } catch {
      toast({
        title: 'Import failed',
        description: 'Could not import the board. Please check the file format.',
        variant: 'destructive',
      });
    }
  }, [importBoard, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the main container
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileImport(file);
    }
  }, [handleFileImport]);

  const handleStartEditName = () => {
    setEditedName(boardName);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      setBoardName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(boardName);
    }
  };

  const handleClear = () => {
    clearBoard();
    toast({
      title: 'Board cleared',
      description: 'All tasks have been removed.',
    });
  };

  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);

  return (
    <div 
      className="min-h-screen bg-background relative"
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      {/* File drop overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 shadow-lg animate-scale-in">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileJson className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">Drop to import</h3>
                <p className="text-muted-foreground text-sm mt-1">Release to restore your board</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={nameInputRef}
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      onBlur={handleSaveName}
                      className="h-8 text-lg font-bold w-40 sm:w-48"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/name cursor-pointer" onClick={handleStartEditName}>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
                      {boardName}
                    </h1>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                  </div>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground">{totalTasks} tasks</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={handleImportClick} className="hidden sm:flex">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="icon" onClick={handleImportClick} className="sm:hidden h-9 w-9">
                <Upload className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport} className="sm:hidden h-9 w-9">
                <Download className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline-destructive" size="sm" className="hidden sm:flex">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogTrigger asChild>
                  <Button variant="outline-destructive" size="icon" className="sm:hidden h-9 w-9">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display">Clear entire board?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all tasks from all columns. This action cannot be undone.
                      Consider exporting your board first.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear} className="bg-destructive hover:bg-destructive/90">
                      Clear all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 pb-16 sm:pb-20">
        {/* SEO-friendly description - visually hidden but accessible */}
        <section aria-label="About Rhoē" className="sr-only">
          <h2>Simple Task Management</h2>
          <p>
            Rhoē is a free, elegant Kanban board to organize your workflow. 
            Create tasks, drag and drop between columns, and track progress 
            with an intuitive interface. Export your board as JSON to save 
            your work, or import existing boards. Works offline and respects 
            your privacy with local storage. Perfect for personal projects, 
            team collaboration, and agile workflows.
          </p>
        </section>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto" role="region" aria-label="Kanban columns">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </main>

      {/* Footer hint - hidden on mobile */}
      <footer className="hidden sm:block fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent py-6 pointer-events-none">
        <p className="text-center text-sm text-muted-foreground">
          Drag cards between columns • Drop JSON to import • Export to save
        </p>
      </footer>
    </div>
  );
}
