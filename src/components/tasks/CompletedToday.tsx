import React, { useEffect, useState } from "react";
import { Task } from "../../features/tasks/domain/TaskEntity";
import { useTaskQueries } from "../../features/tasks/hooks/useTaskQueries";

const CompletedToday: React.FC = () => {
  const [startedToday, setStartedToday] = useState(0);
  const [finishedToday, setFinishedToday] = useState(0);
  const { getAllTasks } = useTaskQueries();

  useEffect(() => {
    const loadStats = async () => {
      const allTasks = await getAllTasks();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      let started = 0;
      let finished = 0;

      allTasks.forEach((task) => {
        if (task.history && task.history.length > 0) {
          task.history.forEach((change) => {
            const changeDate = new Date(change.timestamp);
            changeDate.setHours(0, 0, 0, 0);

            if (changeDate.getTime() === todayTime) {
              // Check discriminated union state
              if (change.newState._tag === "InProgress") {
                started++;
              } else if (change.newState._tag === "Done") {
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
  }, [getAllTasks]);

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
