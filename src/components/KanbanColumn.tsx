import { useState } from 'react';
import { Column, Task } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const styles = columnStyles[column.id] || columnStyles.todo;

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(column.id, newTaskTitle.trim(), newTaskDescription.trim() || undefined);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setIsAddingTask(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    }
  };

  return (
    <div
      className="flex flex-col min-h-[400px]"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${styles.accent}`} />
        <h3 className="font-display text-xl font-semibold text-foreground">{column.title}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles.badge}`}>
          {column.tasks.length}
        </span>
      </div>

      <div className="flex-1 bg-column rounded-2xl p-4 shadow-column min-h-[350px]">
        <div className="space-y-4">
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
                placeholder="Task title..."
                autoFocus
                className="mb-2"
              />
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Description (optional)"
                className="mb-3 min-h-[60px] resize-none text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                    setNewTaskDescription('');
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
