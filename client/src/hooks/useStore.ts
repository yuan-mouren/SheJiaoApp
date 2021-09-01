import React from "react";
import { State, Store } from "../types/store.type";

const defaulteStore = {};

export const useStore = () => {
  const [state, dispatch] = React.useReducer(
    (state: State, action: { type: keyof State; payload?: any }) => {
      const { type, payload } = action;
      if (type) {
        return {
          ...state,
          [type]: payload
        };
      }
      return state;
    },
    defaulteStore
  );

  return { store: state, updateStore: dispatch };
};

export const rootContext = React.createContext<Store>({});
