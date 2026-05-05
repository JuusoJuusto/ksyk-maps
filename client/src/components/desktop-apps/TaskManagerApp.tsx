import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

export default function TaskManagerApp() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Tarkista sähköpostit", completed: false, priority: "high" },
    { id: "2", title: "Valmista raportti", completed: false, priority: "medium" },
    { id: "3", title: "Kokouksen muistiot", completed: true, priority: "low" },
  ]);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, {
        id: Date.now().toString(),
        title: newTask,
        completed: false,
        priority,
      }]);
      setNewTask("");
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h2 className="text-xl font-bold">Tehtävät</h2>
        <p className="text-sm opacity-90">{completedCount} / {tasks.length} valmis</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-100 p-3">
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
              task.completed
                ? "bg-gray-50 border-gray-200"
                : "bg-white border-blue-200 hover:border-blue-300"
            }`}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="flex-shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.completed ? "line-through text-gray-500" : "text-gray-900"}`}>
                {task.title}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority === "high" ? "Kiireellinen" : task.priority === "medium" ? "Normaali" : "Matala"}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="flex-shrink-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Task */}
      <div className="border-t p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTask()}
            placeholder="Uusi tehtävä..."
            className="text-sm"
          />
          <Button onClick={addTask} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          className="w-full text-sm border rounded px-2 py-1"
        >
          <option value="low">Matala prioriteetti</option>
          <option value="medium">Normaali prioriteetti</option>
          <option value="high">Kiireellinen</option>
        </select>
      </div>
    </div>
  );
}
