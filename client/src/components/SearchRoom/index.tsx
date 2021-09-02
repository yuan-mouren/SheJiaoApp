import React from "react";
import { View, ScrollView } from "@tarojs/components";
import cls from 'classnames';
import {
  AtSearchBar,
  AtRadio,
  AtActivityIndicator,
  AtMessage,
  AtInput
} from "../TaroUI";
import Taro, {useDidHide} from "@tarojs/taro";
import { rootContext } from "../../hooks/useStore";
import { ResultWrapper } from "../../types/request.type";
import { getRequestRes } from "../../utils";

import "./index.scss";

export const SearchRoom = React.memo(() => {
  const [roomName, setName] = React.useState("");
  const [roomList, setRoomList] = React.useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [passWord, setPassWord] = React.useState(null);

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

  const roomInfo = React.useMemo(() => {
    return roomList.find(room => room._id === currentRoom)
  }, [roomList, currentRoom])

  const joinRoom = React.useCallback(async () => {
    const { userInfo } = store || {};
    const { avatarUrl, nickName } = userInfo;
    const roomPassWord = roomInfo?.roomPassWord
    if (roomPassWord && !passWord) {
      Taro.atMessage({
        type: 'warning',
        message: '请填写密码'
      })
      return 
    }
    if (roomPassWord && roomPassWord !== passWord) {
      Taro.atMessage({
        type: 'warning',
        message: '密码不正确'
      })
      return 
    }
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
        payload: roomInfo
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
  }, [currentRoom, passWord, roomList, roomInfo]);

  const handleRoom = React.useCallback(
    (roomId: string) => {
      setCurrentRoom(roomId);
    },
    [setCurrentRoom]
  );

  const handlePassWord = React.useCallback(
    value => {
      setPassWord(value)
    },
    [setPassWord]
  );

  useDidHide(() => {
    setRoomList([]);
    setPassWord(null)
  })

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
            value: room?._id,
            desc: `房主：${room.creator.nickName}`
          }))}
          value={currentRoom}
          onClick={handleRoom}
        ></AtRadio>
      </ScrollView>
      {currentRoom ? (
        <View className={cls({
          "join-icon": true,
          'has-wrapper': roomInfo?.roomPassWord
        })}>
          {roomInfo?.roomPassWord ? (
            <View className="password-ipt">
              <AtInput value={passWord || ''} onChange={handlePassWord} maxlength={4} placeholder='密码' />
            </View>
          ) : (
            ""
          )}
          <View className="iconfont icon-tianjia" onClick={joinRoom}></View>
        </View>
      ) : (
        ""
      )}
    </View>
  );
});
