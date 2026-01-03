import { useRef, useState } from 'react';
import { useKanban } from '@/hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { ThemeToggle } from './ThemeToggle';
import { Download, Upload, Trash2, Waves } from 'lucide-react';
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
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    exportBoard,
    importBoard,
    clearBoard,
  } = useKanban();

  const [draggedTask, setDraggedTask] = useState<{ taskId: string; columnId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, taskId: string, columnId: string) => {
    setDraggedTask({ taskId, columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedTask) {
      moveTask(draggedTask.taskId, draggedTask.columnId, targetColumnId);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Waves className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Rhoē</h1>
                <p className="text-sm text-muted-foreground">{totalTasks} tasks across {columns.length} columns</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
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
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6 overflow-x-auto pb-4">
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

      {/* Footer hint */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent py-6 pointer-events-none">
        <p className="text-center text-sm text-muted-foreground">
          Drag cards between columns • Export to save • Import to restore
        </p>
      </footer>
    </div>
  );
}
