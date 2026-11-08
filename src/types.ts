export interface Question {
  id: number;
  questionText: string;
  type: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface Quiz {
  id?: string;
  title: string;
  subject: string;
  level: string;
  gradeClass: string;
  questions: Question[];
  includeKey: boolean;
  createdAt: string;
  userId: string;
}

export interface AttachedFile {
  name: string;
  size: string;
  mimeType: string;
  data: string;
}

export interface TypeConfig {
  [key: string]: {
    enabled: boolean;
    count: number;
  };
}

export interface GenerateConfig {
  prompt: string;
  subject: string;
  level: string;
  gradeClass: string;
  count: number;
  difficulty: string;
  type: string; // Keep for backward compatibility or as primary type
  typeConfig: TypeConfig;
  includeKey: boolean;
  attachedFile?: AttachedFile | null;
}

