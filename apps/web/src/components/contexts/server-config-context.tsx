"use client";

import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { defaultState } from "./default-state";


type IServerConfig = {
  useNotificationsStream: boolean;
  turnstileSiteKey: string;
  queueServer: string;
};

type ServerConfigContextType = {
  config: IServerConfig;
  setConfig: Dispatch<SetStateAction<IServerConfig>>;
};

const ServerConfigContext = createContext<ServerConfigContextType>({
  config: defaultState.config,
  setConfig: () => {
    throw new Error("setConfig function not implemented");
  },
});

export const ServerConfigProvider = ({
  children,
  initialConfig,
}: PropsWithChildren<{
  initialConfig: IServerConfig;
}>) => {
  const [config, setConfig] = useState<IServerConfig>(initialConfig);

  return (
    <ServerConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ServerConfigContext.Provider>
  );
};

export const useServerConfig = () => {
  const context = useContext(ServerConfigContext);
  if (!context) {
    throw new Error(
      "useServerConfig must be used within a ServerConfigProvider",
    );
  }
  return context;
};
