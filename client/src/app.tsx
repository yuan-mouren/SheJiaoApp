import React, { useEffect } from "react";
// Taro 额外添加的 hooks 要从 '@tarojs/taro' 中引入
import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import { useStore, rootContext } from "./hooks/useStore";
import { envId } from "./utils";

// 全局样式
import "./app.scss";
import "./assets/iconfont.scss";

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {
    if (process.env.TARO_ENV === "weapp") {
      Taro.cloud.init({
        env: envId,
        traceUser: true
      });
    }
  }, []);

  const store = useStore();

  // 对应 onShow
  useDidShow(() => {});

  // 对应 onHide
  useDidHide(() => {
    Taro.cloud.callFunction({
      name: "player",
      data: {
        func: "userExit"
      }
    });
  });

  return (
    <rootContext.Provider value={store}>{props.children}</rootContext.Provider>
  );
}

export default App;
