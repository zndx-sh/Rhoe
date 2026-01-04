import { useState, useCallback } from 'react';
import { Column, Task, BoardData } from '@/types/kanban';

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    tasks: [
      { id: generateId(), title: 'Research competitors', description: 'Analyze top 5 market players', createdAt: new Date().toISOString() },
      { id: generateId(), title: 'Design system setup', createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'inprogress',
    title: 'In Progress',
    tasks: [
      { id: generateId(), title: 'Build landing page', description: 'Create hero section and features', createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [
      { id: generateId(), title: 'Project kickoff', createdAt: new Date().toISOString() },
    ],
  },
];

export function useKanban() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [boardName, setBoardName] = useState('My Board');

  const addTask = useCallback((columnId: string, title: string, description?: string) => {
    const newTask: Task = {
      id: generateId(),
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
      )
    );
  }, []);

  const updateTask = useCallback((columnId: string, taskId: string, updates: Partial<Task>) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? {
              ...col,
              tasks: col.tasks.map((task) =>
                task.id === taskId ? { ...task, ...updates } : task
              ),
            }
          : col
      )
    );
  }, []);

  const deleteTask = useCallback((columnId: string, taskId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, tasks: col.tasks.filter((task) => task.id !== taskId) }
          : col
      )
    );
  }, []);

  const moveTask = useCallback((taskId: string, fromColumnId: string, toColumnId: string, targetIndex?: number) => {
    setColumns((prev) => {
      const taskToMove = prev
        .find((col) => col.id === fromColumnId)
        ?.tasks.find((task) => task.id === taskId);

      if (!taskToMove) return prev;

      // Same column reorder
      if (fromColumnId === toColumnId) {
        return prev.map((col) => {
          if (col.id !== fromColumnId) return col;
          
          const tasks = [...col.tasks];
          const fromIndex = tasks.findIndex((t) => t.id === taskId);
          tasks.splice(fromIndex, 1);
          const insertIndex = targetIndex !== undefined ? targetIndex : tasks.length;
          tasks.splice(insertIndex, 0, taskToMove);
          return { ...col, tasks };
        });
      }

      // Cross-column move
      return prev.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, tasks: col.tasks.filter((task) => task.id !== taskId) };
        }
        if (col.id === toColumnId) {
          const tasks = [...col.tasks];
          const insertIndex = targetIndex !== undefined ? targetIndex : tasks.length;
          tasks.splice(insertIndex, 0, taskToMove);
          return { ...col, tasks };
        }
        return col;
      });
    });
  }, []);

  const exportBoard = useCallback(() => {
    const boardData: BoardData = {
      name: boardName,
      columns,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const dataStr = JSON.stringify(boardData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const sanitizedName = boardName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizedName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [columns, boardName]);

  const importBoard = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const boardData: BoardData = JSON.parse(content);

          if (!boardData.columns || !Array.isArray(boardData.columns)) {
            throw new Error('Invalid board data format');
          }

          setColumns(boardData.columns);
          if (boardData.name) {
            setBoardName(boardData.name);
          }
          resolve();
        } catch {
          reject(new Error('Failed to parse board file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const clearBoard = useCallback(() => {
    setColumns([
      { id: 'todo', title: 'To Do', tasks: [] },
      { id: 'inprogress', title: 'In Progress', tasks: [] },
      { id: 'done', title: 'Done', tasks: [] },
    ]);
  }, []);

  return {
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
  };
}
