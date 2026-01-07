import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Column, Task, BoardData } from '@/types/kanban';

const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultColumns: Column[] = [
  { id: 'todo', title: 'To Do', tasks: [] },
  { id: 'inprogress', title: 'In Progress', tasks: [] },
  { id: 'done', title: 'Done', tasks: [] },
];

const demoColumns: Column[] = [
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

export function useKanbanSync() {
  const { user } = useAuthContext();
  const [columns, setColumns] = useState<Column[]>(demoColumns);
  const [boardName, setBoardName] = useState('My Board');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load board from database when user logs in
  useEffect(() => {
    if (!user) {
      setColumns(demoColumns);
      setBoardName('My Board');
      setBoardId(null);
      setLoading(false);
      return;
    }

    loadBoard();
  }, [user]);

  const loadBoard = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get or create board
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (boardsError) throw boardsError;

      let board = boards?.[0];

      if (!board) {
        // Create new board with default columns
        const { data: newBoard, error: createError } = await supabase
          .from('boards')
          .insert({ user_id: user.id, name: 'My Board' })
          .select()
          .single();

        if (createError) throw createError;
        board = newBoard;

        // Create default columns
        const columnsToInsert = defaultColumns.map((col, index) => ({
          id: col.id,
          board_id: board.id,
          title: col.title,
          position: index,
        }));

        await supabase.from('columns').insert(columnsToInsert);
      }

      setBoardId(board.id);
      setBoardName(board.name);

      // Load columns
      const { data: dbColumns, error: columnsError } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', board.id)
        .order('position');

      if (columnsError) throw columnsError;

      // Load tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', board.id)
        .order('position');

      if (tasksError) throw tasksError;

      // Map to local format
      const loadedColumns: Column[] = (dbColumns || []).map((col) => ({
        id: col.id,
        title: col.title,
        tasks: (dbTasks || [])
          .filter((task) => task.column_id === col.id)
          .map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description || undefined,
            createdAt: task.created_at,
          })),
      }));

      setColumns(loadedColumns.length > 0 ? loadedColumns : defaultColumns);
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save to database with debounce
  const saveBoard = useCallback(async (newColumns: Column[], newName: string) => {
    if (!user || !boardId) return;

    setSyncing(true);
    try {
      // Update board name
      await supabase
        .from('boards')
        .update({ name: newName })
        .eq('id', boardId);

      // Get current columns and tasks from DB
      const { data: currentCols } = await supabase
        .from('columns')
        .select('id')
        .eq('board_id', boardId);

      const { data: currentTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('board_id', boardId);

      // Delete removed columns
      const newColIds = newColumns.map(c => c.id);
      const colsToDelete = (currentCols || []).filter(c => !newColIds.includes(c.id)).map(c => c.id);
      if (colsToDelete.length > 0) {
        await supabase.from('columns').delete().in('id', colsToDelete).eq('board_id', boardId);
      }

      // Upsert columns
      const columnsToUpsert = newColumns.map((col, index) => ({
        id: col.id,
        board_id: boardId,
        title: col.title,
        position: index,
      }));
      await supabase.from('columns').upsert(columnsToUpsert, { onConflict: 'board_id,id' });

      // Delete removed tasks
      const allNewTaskIds = newColumns.flatMap(c => c.tasks.map(t => t.id));
      const tasksToDelete = (currentTasks || []).filter(t => !allNewTaskIds.includes(t.id)).map(t => t.id);
      if (tasksToDelete.length > 0) {
        await supabase.from('tasks').delete().in('id', tasksToDelete).eq('board_id', boardId);
      }

      // Upsert tasks
      const tasksToUpsert = newColumns.flatMap((col) =>
        col.tasks.map((task, index) => ({
          id: task.id,
          column_id: col.id,
          board_id: boardId,
          title: task.title,
          description: task.description || null,
          position: index,
          created_at: task.createdAt,
        }))
      );
      if (tasksToUpsert.length > 0) {
        await supabase.from('tasks').upsert(tasksToUpsert, { onConflict: 'board_id,id' });
      }
    } catch (error) {
      console.error('Failed to save board:', error);
    } finally {
      setSyncing(false);
    }
  }, [user, boardId]);

  // Debounced save
  const debouncedSave = useCallback((newColumns: Column[], newName: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBoard(newColumns, newName);
    }, 1000);
  }, [saveBoard]);

  const updateColumns = useCallback((newColumns: Column[]) => {
    setColumns(newColumns);
    if (user && boardId) {
      debouncedSave(newColumns, boardName);
    }
  }, [user, boardId, boardName, debouncedSave]);

  const updateBoardName = useCallback((newName: string) => {
    setBoardName(newName);
    if (user && boardId) {
      debouncedSave(columns, newName);
    }
  }, [user, boardId, columns, debouncedSave]);

  const addTask = useCallback((columnId: string, title: string, description?: string) => {
    const newTask: Task = {
      id: generateId(),
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    const newColumns = columns.map((col) =>
      col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col
    );
    updateColumns(newColumns);
  }, [columns, updateColumns]);

  const updateTask = useCallback((columnId: string, taskId: string, updates: Partial<Task>) => {
    const newColumns = columns.map((col) =>
      col.id === columnId
        ? {
            ...col,
            tasks: col.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
          }
        : col
    );
    updateColumns(newColumns);
  }, [columns, updateColumns]);

  const deleteTask = useCallback((columnId: string, taskId: string) => {
    const newColumns = columns.map((col) =>
      col.id === columnId
        ? { ...col, tasks: col.tasks.filter((task) => task.id !== taskId) }
        : col
    );
    updateColumns(newColumns);
  }, [columns, updateColumns]);

  const moveTask = useCallback((taskId: string, fromColumnId: string, toColumnId: string, targetIndex?: number) => {
    const taskToMove = columns
      .find((col) => col.id === fromColumnId)
      ?.tasks.find((task) => task.id === taskId);

    if (!taskToMove) return;

    let newColumns: Column[];

    if (fromColumnId === toColumnId) {
      newColumns = columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        const tasks = [...col.tasks];
        const fromIndex = tasks.findIndex((t) => t.id === taskId);
        tasks.splice(fromIndex, 1);
        const insertIndex = targetIndex !== undefined ? targetIndex : tasks.length;
        tasks.splice(insertIndex, 0, taskToMove);
        return { ...col, tasks };
      });
    } else {
      newColumns = columns.map((col) => {
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
    }

    updateColumns(newColumns);
  }, [columns, updateColumns]);

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

  const importBoard = useCallback(async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const boardData: BoardData = JSON.parse(content);

          if (!boardData.columns || !Array.isArray(boardData.columns)) {
            throw new Error('Invalid board data format');
          }

          updateColumns(boardData.columns);
          if (boardData.name) {
            updateBoardName(boardData.name);
          }
          resolve();
        } catch {
          reject(new Error('Failed to parse board file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [updateColumns, updateBoardName]);

  const clearBoard = useCallback(() => {
    const emptyColumns: Column[] = [
      { id: 'todo', title: 'To Do', tasks: [] },
      { id: 'inprogress', title: 'In Progress', tasks: [] },
      { id: 'done', title: 'Done', tasks: [] },
    ];
    updateColumns(emptyColumns);
  }, [updateColumns]);

  return {
    columns,
    boardName,
    setBoardName: updateBoardName,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    exportBoard,
    importBoard,
    clearBoard,
    loading,
    syncing,
    isAuthenticated: !!user,
  };
}
