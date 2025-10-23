import React, { useEffect, useState } from "react";
import { Task, TaskId } from "../../features/tasks/domain";
import { useTaskQueries } from "../../features/tasks/hooks/useTaskQueries";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

interface TaskWithPath {
  task: Task;
  breadcrumbs: string;
}

const TodayUpcoming: React.FC = () => {
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithPath[]>([]);
  const { getAllTasks, getTask } = useTaskQueries();

  useEffect(() => {
    const loadUpcomingTasks = async () => {
      const allTasks = await getAllTasks();
      const tasksWithDueDates = allTasks.filter((task) => task.dueDate);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sortedTasks = tasksWithDueDates
        .sort((a, b) => {
          const dateA = new Date(a.dueDate!).getTime();
          const dateB = new Date(b.dueDate!).getTime();
          return dateA - dateB;
        })
        .slice(0, 10);

      const tasksWithPaths = await Promise.all(
        sortedTasks.map(async (task) => {
          const breadcrumbs = await buildBreadcrumbs(task);
          return { task, breadcrumbs };
        })
      );

      setUpcomingTasks(tasksWithPaths);
    };

    loadUpcomingTasks();
  }, [getAllTasks, getTask]);

  const buildBreadcrumbs = async (task: Task): Promise<string> => {
    if (!task.path || task.path.length === 0) return "";

    const parentTasks = await Promise.all(
      task.path.map((parentId) => getTask(parentId))
    );

    return parentTasks
      .filter((t) => t !== undefined)
      .map((t) => t!.text)
      .join(" ▸ ");
  };

  const getDueStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / MILLISECONDS_PER_DAY);

    if (diffDays < 0) return { text: "Overdue", className: "overdue" };
    if (diffDays === 0) return { text: "Today", className: "today" };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, className: "upcoming" };
    return { text: `Due ${dueDate}`, className: "upcoming" };
  };

  return (
    <div className="card">
      <div className="header">
        <div>Today & Upcoming</div>
        <div className="spacer"></div>
      </div>
      <div className="list">
        {upcomingTasks.length === 0 ? (
          <div className="muted small" style={{ padding: "12px" }}>
            No upcoming tasks with due dates
          </div>
        ) : (
          upcomingTasks.map(({ task, breadcrumbs }) => {
            const dueStatus = getDueStatus(task.dueDate!);
            return (
              <div key={task.id}>
                <div>
                  {task.text}{" "}
                  <span className={`due ${dueStatus.className}`}>{dueStatus.text}</span>
                </div>
                {breadcrumbs && <div className="breadcrumbs">{breadcrumbs}</div>}
              </div>
            );
          })
        )}
      </div>
      <div style={{ padding: "12px" }} className="small muted">
        Items show their parent path so you always know context.
      </div>
    </div>
  );
};

export default TodayUpcoming;
