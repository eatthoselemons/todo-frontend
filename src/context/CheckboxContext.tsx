import React, { createContext, PropsWithChildren, useState } from "react";
import { TaskID } from "../domain/Task";

export type CheckedItems = Record<TaskID, boolean>;

// Use records to make sure that the checkedItems listeners are updated everytime
// an item is changed
const DefaultCheckboxContextParameters: {
  checkedItems: CheckedItems;
  setCheckedItems: (map: CheckedItems) => void;
} = {
  checkedItems: {},
  setCheckedItems: (map) =>
    (DefaultCheckboxContextParameters.checkedItems = map),
};

export const CheckboxContext = createContext(DefaultCheckboxContextParameters);

export const CheckboxContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [checkedItems, setCheckedItems] = useState({});

  return (
    <CheckboxContext.Provider value={{ checkedItems, setCheckedItems }}>
      {children}
    </CheckboxContext.Provider>
  );
};
