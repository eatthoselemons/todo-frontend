import React, { createContext, PropsWithChildren, useContext } from "react";

const DefaultDepthContextParameters = {
  depth: 0,
};

export const DepthContext = createContext(DefaultDepthContextParameters);

export const DepthContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const depthContext = useContext(DepthContext);

  return (
    <DepthContext.Provider value={{ depth: depthContext.depth + 1 }}>
      {children}
    </DepthContext.Provider>
  );
};
