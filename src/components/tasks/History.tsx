import React, { useEffect, useState } from "react";
import { Task } from "../../domain/Task";
import { useLegacyTaskOperations } from "../../features/tasks/compat/useLegacyTaskOperations";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

interface DayStats {
  day: string;
  started: number;
  finished: number;
}

const History: React.FC = () => {
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const { getAllTasks } = useLegacyTaskOperations();

  useEffect(() => {
    const loadHistory = async () => {
      const allTasks = await getAllTasks();
      const today = new Date();
      const stats: DayStats[] = [];

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * MILLISECONDS_PER_DAY);
        date.setHours(0, 0, 0, 0);
        const dateTime = date.getTime();

        let started = 0;
        let finished = 0;

        allTasks.forEach((task) => {
          if (task.changeLog && task.changeLog.length > 0) {
            task.changeLog.forEach((change) => {
              const changeDate = new Date(change.time);
              changeDate.setHours(0, 0, 0, 0);

              if (changeDate.getTime() === dateTime) {
                if (change.newState === "in_progress") {
                  started++;
                } else if (change.newState === "done") {
                  finished++;
                }
              }
            });
          }
        });

        stats.push({
          day: dayNames[date.getDay()],
          started,
          finished,
        });
      }

      setWeekStats(stats);
    };

    loadHistory();
  }, []);

  const maxCount = Math.max(
    ...weekStats.map((s) => Math.max(s.started, s.finished)),
    1
  );

  return (
    <div className="card" style={{ marginTop: "12px" }}>
      <div className="header">
        <div>History (This Week)</div>
      </div>
      <div style={{ padding: "12px" }}>
        <div className="small muted" style={{ marginBottom: "6px" }}>
          Daily counts (Started vs Finished)
        </div>
        <div style={{ display: "grid", gap: "6px" }}>
          {weekStats.map((stat) => (
            <div className="history-day-row" key={stat.day}>
              <span className="history-day-label muted">{stat.day}</span>
              <div className="history-bar history-bar-started">
                <div
                  className="bar"
                  style={{ width: `${Math.min((stat.started / maxCount) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="history-bar history-bar-finished ml">
                <div
                  className="bar"
                  style={{ width: `${Math.min((stat.finished / maxCount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default History;