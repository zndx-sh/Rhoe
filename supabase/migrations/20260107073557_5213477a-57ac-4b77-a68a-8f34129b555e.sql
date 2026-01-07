-- Create boards table to store user's kanban boards
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Board',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create columns table for kanban columns
CREATE TABLE public.columns (
  id TEXT NOT NULL,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (board_id, id)
);

-- Create tasks table for kanban tasks
CREATE TABLE public.tasks (
  id TEXT NOT NULL,
  column_id TEXT NOT NULL,
  board_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, id),
  FOREIGN KEY (board_id, column_id) REFERENCES public.columns(board_id, id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for boards
CREATE POLICY "Users can view their own boards" 
ON public.boards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards" 
ON public.boards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" 
ON public.boards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" 
ON public.boards FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for columns (access via board ownership)
CREATE POLICY "Users can view columns of their boards" 
ON public.columns FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can create columns in their boards" 
ON public.columns FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can update columns in their boards" 
ON public.columns FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can delete columns from their boards" 
ON public.columns FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid()));

-- RLS policies for tasks (access via board ownership)
CREATE POLICY "Users can view tasks in their boards" 
ON public.tasks FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = tasks.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can create tasks in their boards" 
ON public.tasks FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = tasks.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their boards" 
ON public.tasks FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = tasks.board_id AND boards.user_id = auth.uid()));

CREATE POLICY "Users can delete tasks from their boards" 
ON public.tasks FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.boards WHERE boards.id = tasks.board_id AND boards.user_id = auth.uid()));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for boards timestamp
CREATE TRIGGER update_boards_updated_at
BEFORE UPDATE ON public.boards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();