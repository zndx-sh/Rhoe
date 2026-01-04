export interface Task {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface BoardData {
  name?: string;
  columns: Column[];
  exportedAt: string;
  version: string;
}

export type ColumnId = 'todo' | 'inprogress' | 'done';
