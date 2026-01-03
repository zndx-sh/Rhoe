import { useState } from 'react';
import { Column, Task } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KanbanColumnProps {
  column: Column;
  onAddTask: (columnId: string, title: string, description?: string) => void;
  onUpdateTask: (columnId: string, taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
}

const columnStyles: Record<string, { accent: string; badge: string }> = {
  todo: { accent: 'bg-muted-foreground/20', badge: 'bg-muted text-muted-foreground' },
  inprogress: { accent: 'bg-primary/20', badge: 'bg-primary/10 text-primary' },
  done: { accent: 'bg-primary', badge: 'bg-primary/10 text-primary' },
};

export function KanbanColumn({
  column,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDrop,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const styles = columnStyles[column.id] || columnStyles.todo;

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(column.id, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div
      className="flex flex-col w-80 flex-shrink-0"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${styles.accent}`} />
        <h3 className="font-display text-lg font-semibold text-foreground">{column.title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
          {column.tasks.length}
        </span>
      </div>

      <div className="flex-1 bg-column rounded-xl p-3 shadow-column min-h-[200px]">
        <div className="space-y-3">
          {column.tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              columnId={column.id}
              onUpdate={(taskId, updates) => onUpdateTask(column.id, taskId, updates)}
              onDelete={(taskId) => onDeleteTask(column.id, taskId)}
              onDragStart={onDragStart}
            />
          ))}

          {isAddingTask ? (
            <div className="bg-card rounded-lg p-3 shadow-card border border-border animate-scale-in">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter task title..."
                autoFocus
                className="mb-2"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleAddTask}>
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add task
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
