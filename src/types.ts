export interface User {
  id: number;
  username: string;
  email?: string;
  role: "admin" | "user";
  permissions: string[];
  status: "pending" | "approved" | "rejected";
}

export interface Worker {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  name: string;
  target_quantity: number;
}

export interface DailyEvaluation {
  id: number;
  worker_id: number;
  worker_name: string;
  date: string;
  total_score: number;
}

export interface TaskEntry {
  id: number;
  evaluation_id: number;
  task_id: number;
  task_name: string;
  target_quantity: number;
  quantity: number;
  score: number;
}

export interface EvaluationDetail extends DailyEvaluation {
  entries: TaskEntry[];
}

export interface MonthlyReportItem {
  worker_id: number;
  worker_name: string;
  days_worked: number;
  average_score: number;
}
