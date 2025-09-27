import React, { useEffect, useState } from "react";
import { Task } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

interface DayStats {
  day: string;
  started: number;
  finished: number;
}

const History: React.FC = () => {
  const [weekStats, setWeekStats] = useState<DayStats[]>([]);
  const { getAllTasks } = useTaskHooks();

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
            <div className="row small" key={stat.day}>
              <span style={{ width: "60px" }} className="muted">
                {stat.day}
              </span>
              <div
                style={{
                  height: "8px",
                  background: "#1b273a",
                  width: "120px",
                  overflow: "hidden",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    height: "8px",
                    background: "#60a5fa",
                    width: `${(stat.started / maxCount) * 100}%`,
                    maxWidth: "100%",
                  }}
                ></div>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "#1b2a1f",
                  width: "120px",
                  marginLeft: "8px",
                  overflow: "hidden",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    height: "8px",
                    background: "#34d399",
                    width: `${(stat.finished / maxCount) * 100}%`,
                    maxWidth: "100%",
                  }}
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