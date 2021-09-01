import React from "react";
import { View, ScrollView } from "@tarojs/components";
import {
  AtSearchBar,
  AtRadio,
  AtActivityIndicator,
  AtMessage
} from "../TaroUI";
import Taro from "@tarojs/taro";
import { rootContext } from "../../hooks/useStore";
import { ResultWrapper } from "../../types/request.type";
import { getRequestRes } from "../../utils";

import "./index.scss";

export const SearchRoom = React.memo(() => {
  const [roomName, setName] = React.useState("");
  const [roomList, setRoomList] = React.useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const { store, updateStore } = React.useContext(rootContext);

  const handleSearchRoom = React.useCallback(
    (roomName: string) => {
      setName(roomName);
      if (!roomName) {
        setRoomList([]);
        setCurrentRoom("");
      }
    },
    [setName, setRoomList]
  );

  const handleSearch = React.useCallback(async () => {
    if (!roomName) {
      Taro.atMessage({
        message: "请输入房间名查询",
        type: "error"
      });
      return;
    }
    setIsLoading(true);
    const res: ResultWrapper = await Taro.cloud.callFunction({
      name: "room",
      data: {
        func: "find",
        params: {
          name: roomName
        }
      }
    });
    setIsLoading(false);

    const { code, data } = getRequestRes(res, ["code", "data"]);

    if (code) {
      setRoomList(data);
    }
  }, [roomName, setRoomList, setIsLoading]);

  const joinRoom = React.useCallback(async () => {
    const { userInfo } = store || {};
    const { avatarUrl, nickName } = userInfo;
    const res = await Taro.cloud.callFunction({
      name: "room",
      data: {
        func: "join",
        params: {
          roomId: currentRoom,
          creator: {
            nickName,
            avatarUrl
          }
        }
      }
    });

    const data = getRequestRes(res);

    if (data.code) {
      updateStore({
        type: "roomInfo",
        payload: roomList.find(room => room._id === currentRoom)
      });
      setTimeout(() => {
        Taro.redirectTo({
          url: "/pages/PlayRoom/index"
        });
      }, 500);
    } else {
      Taro.atMessage({
        message: data.message,
        type: "error"
      });
    }
  }, [currentRoom]);

  const handleRoom = React.useCallback(
    (roomId: string) => {
      setCurrentRoom(roomId);
    },
    [setCurrentRoom]
  );

  return (
    <View className="component-search-room">
      <AtMessage></AtMessage>
      <AtSearchBar
        value={roomName}
        onChange={handleSearchRoom}
        placeholder="输入房间名"
        onActionClick={handleSearch}
        actionName={
          isLoading
            ? ((
                <AtActivityIndicator color="#F1BA20"></AtActivityIndicator>
              ) as any)
            : "搜索"
        }
      />
      <ScrollView scrollY className="search-container">
        <AtRadio
          options={roomList.map(room => ({
            label: room?.name,
            value: room._id,
            desc: `房主：${room.creator.nickName}`
          }))}
          value={currentRoom}
          onClick={handleRoom}
        ></AtRadio>
      </ScrollView>
      {currentRoom ? (
        <View
          className="iconfont icon-tianjia join-icon"
          onClick={joinRoom}
        ></View>
      ) : (
        ""
      )}
    </View>
  );
});
