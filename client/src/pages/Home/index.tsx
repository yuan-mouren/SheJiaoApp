import React, { useEffect, useCallback } from "react";
import { View, Button } from "@tarojs/components";
import Taro, {
  useReady,
  useDidShow,
  useDidHide,
  usePullDownRefresh
} from "@tarojs/taro";
import { CreateRoom } from "../../components/CreateRoom";
import { SearchRoom } from "../../components/SearchRoom";
import { AtMessage } from "../../components/TaroUI";
import cls from "classnames";
import { rootContext } from "../../hooks/useStore";
import { Status } from "../../types/home.type";
import { State } from "../../types/store.type";
import { getRequestRes } from "../../utils";

import "./index.scss";

function Home() {
  // 可以使用所有的 React Hooks

  useEffect(() => {});

  const context = React.useContext(rootContext);

  const { store, updateStore } = context;

  const { userInfo, roomInfo } = store as State;

  // 对应 onReady
  useReady(() => {});

  // 对应 onShow
  useDidShow(async () => {
    const storageUserInfo = Taro.getStorageSync("userInfo");
    if (storageUserInfo) {
      updateStore({ type: "userInfo", payload: storageUserInfo });
    }
    if (!roomInfo) {
      const res = await Taro.cloud.callFunction({
        name: "player",
        data: {
          func: "hasPlayer"
        }
      });

      const roomInfo = getRequestRes(res);
      if (roomInfo.code) {
        updateStore({ type: "roomInfo", payload: roomInfo.data });
      }
    }
  });

  // 对应 onHide
  useDidHide(() => {});

  // Taro 对所有小程序页面生命周期都实现了对应的自定义 React Hooks 进行支持
  // 详情可查阅：【Hooks】
  usePullDownRefresh(() => {});

  const getUserInfo = useCallback(() => {
    if (!!userInfo) {
      return;
    }
    Taro.getSetting().then(res => {
      if (!res.authSetting["scope.userInfo"] || !userInfo) {
        Taro.getUserProfile({ desc: "用于完善会员信息", lang: "zh_CN" })
          .then(res => {
            updateStore({ type: "userInfo", payload: res.userInfo });
            Taro.setStorage({
              key: "userInfo",
              data: res.userInfo
            });
          })
          .catch(err => {
            if (err) {
              Taro.atMessage({
                message: "未授权用户信息，部分功能将不可用",
                type: "warning"
              });
            }
          });
      }
    });
  }, [userInfo]);

  // 当前选中的状态
  const [status, setStatus] = React.useState<Status>();

  const handleStatus = useCallback(
    (status: Status, e: React.MouseEvent) => {
      if (status) {
        e.stopPropagation();
      }
      setStatus(status);
    },
    [status]
  );

  const exitGame = React.useCallback(async () => {
    const res = await Taro.cloud.callFunction({
      name: "game",
      data: {
        func: "userExit",
        params: {
          roomId: roomInfo?._id
        }
      }
    });

    const exit = getRequestRes(res);
    if (exit.code) {
      updateStore({ type: "roomInfo", payload: null });
    }
  }, []);

  const goToPlayerRoom = () => {
    Taro.redirectTo({
      url: "/pages/PlayRoom/index"
    });
  };

  return (
    <>
      <AtMessage />
      <View className="home" onClick={handleStatus.bind(null, null)}>
        <View className="home-circle1"></View>
        <View className="home-circle2"></View>
        <View className="home-circle3"></View>
        {!userInfo ? <Button onClick={getUserInfo} className="userInfo" /> : ""}
        <View
          className={cls({
            "home-tab": true,
            isActive: status === Status.create,
            isCreate: status === Status.create
          })}
          onClick={handleStatus.bind(null, Status.create)}
        >
          <View className="create-room">
            <View className="room-title">
              创建房间<View className="iconfont icon-ziyuan-copy"></View>
            </View>
          </View>
          <View className="room-info">
            <CreateRoom />
          </View>
        </View>
        <View
          className={cls({
            "home-tab": true,
            isActive: status === Status.join,
            isCreate: status === Status.create
          })}
          onClick={handleStatus.bind(null, Status.join)}
        >
          <View className="join-room">
            <View className="room-title">
              加入房间<View className="iconfont icon-zhuyefaxian"></View>
            </View>
          </View>
          <View className="search-room">
            <SearchRoom />
          </View>
        </View>
        {roomInfo ? (
          <>
            <View className="join-room-icon" onClick={goToPlayerRoom}>
              进入房间
            </View>
            <View className="exit-room-icon" onClick={exitGame}>
              退出房间
            </View>
          </>
        ) : (
          ""
        )}
      </View>
    </>
  );
}

export default Home;
