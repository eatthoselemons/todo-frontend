import React, { useEffect, useState } from "react";
import { Task } from "../../domain/Task";
import { useLegacyTaskOperations } from "../../features/tasks/compat/useLegacyTaskOperations";

const CompletedToday: React.FC = () => {
  const [startedToday, setStartedToday] = useState(0);
  const [finishedToday, setFinishedToday] = useState(0);
  const { getAllTasks } = useLegacyTaskOperations();

  useEffect(() => {
    const loadStats = async () => {
      const allTasks = await getAllTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      let started = 0;
      let finished = 0;

      allTasks.forEach((task) => {
        if (task.changeLog && task.changeLog.length > 0) {
          task.changeLog.forEach((change) => {
            const changeDate = new Date(change.time);
            changeDate.setHours(0, 0, 0, 0);

            if (changeDate.getTime() === todayTime) {
              if (change.newState === "in_progress") {
                started++;
              } else if (change.newState === "done") {
                finished++;
              }
            }
          });
        }
      });

      setStartedToday(started);
      setFinishedToday(finished);
    };

    loadStats();
  }, []);

  return (
    <div className="card" style={{ marginTop: "12px" }}>
      <div className="header">
        <div>Completed Today</div>
        <div className="spacer"></div>
      </div>
      <div style={{ padding: "12px" }}>
        <div className="stats stats-container">
          <div className="stat started">
            <div className="value">{startedToday}</div>
            <div className="label">Started</div>
            <div className="spark">
              <div className="bar" style={{ width: `${Math.min(startedToday * 10, 100)}%` }}></div>
            </div>
          </div>
          <div className="stat finished">
            <div className="value">{finishedToday}</div>
            <div className="label">Finished</div>
            <div className="spark">
              <div className="bar" style={{ width: `${Math.min(finishedToday * 10, 100)}%` }}></div>
            </div>
          </div>
        </div>
        <div className="small muted">A quick snapshot of your progress today.</div>
      </div>
    </div>
  );
};

export default CompletedToday;