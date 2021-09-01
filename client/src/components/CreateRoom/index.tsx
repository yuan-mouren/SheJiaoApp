import React from "react";
import { View, Picker, Switch } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { rootContext } from "../../hooks/useStore";
import { AtInput, AtInputNumber, AtMessage } from "../TaroUI";
import { getRequestRes } from "../../utils";

import "./index.scss";

export enum GameName {
  guessHeart = "guessHeart",
  diceGame = "diceGame"
}

const games: { type: GameName; name: string }[] = [
  { type: GameName.guessHeart, name: "害你在心口难开" },
  { type: GameName.diceGame, name: "摇骰子" }
];

export const CreateRoom = () => {
  const [gameName, setGameName] = React.useState<string>("害你在心口难开");
  const [roomName, setRoomName] = React.useState<string>();
  const [gameMember, setGameMember] = React.useState<number>(1);
  const [roomPassWord, setRoomPassWord] = React.useState<string>();
  const [hasPassWord, setHasPassWord] = React.useState<boolean>(false);
  const [roundNum, setRoundNum] = React.useState<number>(1);

  const { store, updateStore } = React.useContext(rootContext);

  const handleGameType = React.useCallback(
    game => {
      setGameName(games[game.detail.value].name);
    },
    [setGameName]
  );

  const handleRoomName = React.useCallback(
    (roomName: string) => {
      setRoomName(roomName);
    },
    [setRoomName]
  );

  const handleMenber = React.useCallback(
    (member: number) => {
      setGameMember(member);
    },
    [setGameMember]
  );

  const handleRoundNum = React.useCallback((number: number) => {
    setRoundNum(number);
  }, []);

  const createRoom = React.useCallback(() => {
    if (!roomName) {
      Taro.atMessage({
        message: "请填写房间名",
        type: "error"
      });
      return;
    }

    const { userInfo } = store || {};

    Taro.cloud.callFunction({
      name: "room",
      data: {
        func: "create",
        params: {
          type: games.find(game => game.name === gameName)?.type,
          roomName: roomName,
          playerNum: gameMember,
          roomPassWord: hasPassWord ? roomPassWord : "",
          creator: {
            nickName: userInfo?.nickName,
            avatarUrl: userInfo?.avatarUrl
          },
          roundNum
        }
      },
      complete: res => {
        const { code, data } = getRequestRes(res as any, ["code", "data"]);
        if (code) {
          updateStore({ type: "roomInfo", payload: data });
          Taro.redirectTo({
            url: "/pages/PlayRoom/index"
          });
        }
      }
    });
  }, [roomName, gameName, gameMember, hasPassWord, roomPassWord, roundNum]);

  const handlePassWord = React.useCallback(
    (e: any) => {
      setHasPassWord(e?.detail?.value);
    },
    [setHasPassWord]
  );

  const handleRoomPassWord = React.useCallback(
    (passWord: string) => {
      setRoomPassWord(passWord);
    },
    [setRoomPassWord]
  );

  return (
    <View className="component-create-room">
      <AtMessage />
      <View className="create-item">
        <View className="item-label" onClick={createRoom}>
          游戏类型
        </View>
        <View className="form-item">
          <Picker
            mode="selector"
            range={games.map(game => game.name)}
            onChange={handleGameType}
          >
            <View className="game-item">{gameName}</View>
          </Picker>
        </View>
      </View>
      <View className="create-item">
        <View className="item-label">游戏人数</View>
        <View className="form-item">
          <AtInputNumber
            min={1}
            max={10}
            step={1}
            value={gameMember}
            onChange={handleMenber}
            type="number"
          />
        </View>
      </View>
      <View className="create-item">
        <View className="item-label">房间名</View>
        <View className="form-item">
          <AtInput value={roomName} onChange={handleRoomName} />
        </View>
      </View>
      <View className="create-item">
        <View className="item-label">回合数</View>
        <View className="form-item">
          <AtInputNumber
            min={1}
            max={5}
            step={1}
            value={roundNum}
            onChange={handleRoundNum}
            type="number"
          />
        </View>
      </View>
      <View className="create-item">
        <View className="item-label">房间密码</View>
        <View className="form-item flex">
          <Switch
            checked={hasPassWord}
            onChange={handlePassWord}
            style={{
              transform: "scale(0.6)",
              position: "relative",
              left: "-2px"
            }}
          />

          {hasPassWord ? (
            <AtInput
              value={roomPassWord}
              onChange={handleRoomPassWord}
              type="number"
              maxlength={4}
              className="password"
            />
          ) : (
            ""
          )}
        </View>
      </View>
      <View
        className="creat-icon iconfont icon-jiantou2"
        onClick={createRoom}
      ></View>
    </View>
  );
};
