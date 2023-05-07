import React, {
  PropsWithChildren,
  ReactEventHandler,
  useCallback,
} from "react";

const EventBarrier: React.FC<PropsWithChildren> = ({ children }) => {
  const eventKiller: ReactEventHandler = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onClick={eventKiller}
      onMouseUp={eventKiller}
      onMouseDown={eventKiller}
    >
      {children}
    </div>
  );
};

export default EventBarrier;
