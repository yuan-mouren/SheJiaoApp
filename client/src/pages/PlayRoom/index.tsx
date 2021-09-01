import React from "react";
import { View } from "@tarojs/components";
import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import cls from "classnames";
import {
  AtAvatar,
  AtMessage,
  AtModal,
  AtTextarea
} from "../../components/TaroUI";
import { rootContext } from "../../hooks/useStore";
import { State } from "../../types/store.type";
import { getRequestRes, envId } from "../../utils";

import "./index.scss";

const getPositionByIdx = (index: number) => {
  const left = (index % 3) * 32;
  const top = Math.floor(index / 3) * 32;
  return {
    left: `${left}vw`,
    top: `${top}vw`
  };
};

const PlayRoom = () => {
  const [players, setPlayers] = React.useState<any[]>();
  const [start, setStart] = React.useState(false);
  const [openId, setOpenId] = React.useState();
  const [catchInfo, setCatchInfo] = React.useState<any>();
  const [isOpen, setOpen] = React.useState<boolean>();

  const { store, updateStore } = React.useContext(rootContext);

  const { userInfo, roomInfo } = store as State;

  const setUserInfo = React.useCallback(() => {
    const storageUserInfo = Taro.getStorageSync("userInfo");
    if (storageUserInfo && !userInfo) {
      updateStore({ type: "userInfo", payload: storageUserInfo });
    }
  }, [userInfo]);

  const catchPlayer = React.useCallback(
    async (catchPlayer: { catchPlayerId: string; catchWord: string }) => {
      const { _id } = roomInfo;
      const res = await Taro.cloud.callFunction({
        name: "game",
        data: {
          func: "catchPlayer",
          params: {
            roomId: _id,
            catchPlayer,
            nickName: userInfo?.nickName,
            avatarUrl: userInfo?.avatarUrl
          }
        }
      });

      const playerInfo = getRequestRes(res);

      if (playerInfo?.code) {
        return;
      }
    },
    [userInfo, roomInfo]
  );

  let watcher;

  /**
   * 建立实时监听
   */
  const createSocket = React.useCallback(
    async (openId: string) => {
      const db = Taro.cloud.database({
        env: envId
      });

      const { _id } = roomInfo || {};

      watcher = db
        .collection("rooms")
        .where({
          _id: _id
        })
        .watch({
          onChange: function(snapshot: any) {
            const { docs, docChanges } = snapshot || {};
            const dataType = docChanges[0].dataType;
            const players = docs?.[0]?.players;

            switch (dataType) {
              case "init":
                const doc = docs?.[0];
                if (!doc) {
                  return;
                }
                if (!roomInfo) {
                  updateStore({ type: "roomInfo", payload: doc });
                }
                for (let i = 0; i < players.length; i++) {
                  if (players[i].catchInfo && players[i].openId === openId) {
                    setCatchInfo(players[i].catchInfo);
                    break;
                  }
                }
                setPlayers(
                  (players || []).map(play => ({
                    ...play,
                    showMask: false
                  }))
                );
              case "update":
                for (let i = 0; i < players.length; i++) {
                  if (players[i].catchInfo && players[i].openId === openId) {
                    setCatchInfo(players[i].catchInfo);
                    break;
                  }
                }
                setPlayers(res => {
                  return (res || []).map((item, index) => {
                    if (
                      item.leftWords?.length !==
                      players[index]?.leftWords?.length
                    ) {
                      players[index].active = !item.active;
                    }
                    return { ...item, ...players[index] };
                  });
                });
            }
          },
          onError: function(err) {
            Taro.atMessage({
              type: "warning",
              message: "网络故障"
            });
          }
        });
    },
    [roomInfo, setPlayers, setCatchInfo]
  );

  useDidShow(async () => {
    setUserInfo();
    const res = await Taro.cloud.callFunction({
      name: "player",
      data: {
        func: "getOpenId"
      }
    });

    const players = getRequestRes(res);
    if (players.code) {
      setOpenId(players.data.openId);
    }

    createSocket(players.data.openId);
  });

  const showMask = React.useCallback(
    (openId: string) => {
      setPlayers(
        (players || []).map(player => {
          if (player.openId === openId) {
            player.showMask = !player.showMask;
          }
          return player;
        })
      );
    },
    [players, setPlayers, userInfo]
  );

  useDidHide(() => {
    watcher.close();
  });

  const handleGame = React.useCallback(async () => {
    const { _id, playerNum, roundNum } = roomInfo;
    if (!start) {
      const res = await Taro.cloud.callFunction({
        name: "game",
        data: {
          func: "start",
          params: {
            roomId: _id,
            playerNum,
            roundNum
          }
        }
      });
      const gameInfo = getRequestRes(res);
      if (!gameInfo.code) {
        return;
      }
    } else {
      setOpen(true);
    }
    setStart(!start);
  }, [setStart, start, roomInfo, setOpen]);

  const confirmCatch = React.useCallback(
    async (confirm: boolean) => {
      const res = await Taro.cloud.callFunction({
        name: "game",
        data: {
          func: "catchConfirm",
          params: {
            confirm,
            roomId: roomInfo._id
          }
        }
      });
      const comfirm = getRequestRes(res);
      if (!comfirm.code) {
        return Taro.atMessage({
          type: "warning",
          message: comfirm.message
        });
      }
      setCatchInfo("");
    },
    [setCatchInfo, roomInfo]
  );

  const currentPlayer = React.useMemo(() => {
    return (players || []).find(player => player.openId === openId);
  }, [players, openId]);

  const sortedPlayers = React.useMemo(() => {
    return (players || []).sort((pre, next) => {
      return pre.catchCount || 0 - next.catchCount || 0;
    });
  }, [players]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleConfirm = React.useCallback(async () => {
    const res = await Taro.cloud.callFunction({
      name: "room",
      data: {
        func: "exit",
        roomId: roomInfo?._id
      }
    });
    const exitRoom = getRequestRes(res);
    if (exitRoom.code) {
      Taro.redirectTo({
        url: "/pages/Home/index"
      });
    } else {
      Taro.atMessage({
        type: "error",
        message: exitRoom.message
      });
    }
  }, []);

  const setPlayerWord = React.useCallback(
    (openId: string, e) => {
      e.stopPropagation();
      setPlayers(res => {
        return (res || []).map(player => {
          if (player.openId === openId && !player.setWord) {
            return { ...player, setWord: true };
          }
          if (
            player.openId === openId &&
            player.setWord &&
            !player.customWord
          ) {
            return { ...player, setWord: false };
          }
          if (player.openId === openId && player.setWord && player.customWord) {
            Taro.cloud
              .callFunction({
                name: "player",
                data: {
                  func: "setCustomWord",
                  params: {
                    roomId: roomInfo._id,
                    openId,
                    customWord: player.customWord
                  }
                }
              })
              .then(res => {
                const { code, message } = getRequestRes(res) || {};
                if (!code) {
                  Taro.atMessage({
                    type: "warning",
                    message
                  });
                }
              });
            return { ...player, setWord: false, showMask: false };
          }
          return player;
        });
      });
    },
    [setPlayers, roomInfo]
  );

  const handleCustomWord = React.useCallback(
    (openId, value, e) => {
      e.stopPropagation();
      setPlayers(res => {
        return (res || []).map(player => {
          if (player.openId === openId && player.setWord) {
            return { ...player, customWord: value };
          }
          return player;
        });
      });
    },
    [setPlayers]
  );

  return (
    <View className="page-play-room">
      <AtModal
        isOpened={isOpen}
        cancelText="取消"
        confirmText="确认"
        onClose={handleClose}
        onCancel={handleClose}
        onConfirm={handleConfirm}
        title="是否结束游戏"
      />
      <View className="user-info">
        <View className="left-info">
          <AtAvatar circle image={userInfo?.avatarUrl}></AtAvatar>
          {openId && openId === roomInfo?.creator?.openId ? (
            <View className="create-game" onClick={handleGame}>
              {start ? "结束游戏" : "开始游戏"}
            </View>
          ) : (
            ""
          )}
        </View>
        <View className="right-info">
          <View className="play-info-wrapper">
            <View className="play-info">
              命中数: {currentPlayer?.catchCount || 0}
            </View>
            <View className="play-info">
              剩余词条: {currentPlayer?.leftWords?.length || 0}
            </View>
            <View className="play-info">
              当前名次:{" "}
              {(sortedPlayers || []).findIndex(
                player => player.openId === openId
              ) + 1}
            </View>
          </View>
          {!currentPlayer?.leftWords?.length && start ? (
            <View className="play-out">
              <View className="play-out-text">出局</View>
            </View>
          ) : (
            ""
          )}
        </View>
      </View>
      <View className="play-board">
        {(players || []).map((player, index) => {
          if (player.openId === openId) {
            return;
          }
          return (
            <View
              className={cls({
                "player-item": true,
                "show-mask": player.showMask
              })}
              key={player.openId}
              style={getPositionByIdx(
                sortedPlayers.filter(item => item.openId !== player.openId)
                  ? sortedPlayers.findIndex(
                      sort => sort.openId === player.openId
                    )
                  : index
              )}
              onClick={
                (start && player.leftWords?.[0]) || !start
                  ? showMask.bind(null, player.openId)
                  : null
              }
            >
              <View className="avatar-wrapper">
                {start && player.leftWords?.length ? (
                  <View
                    className={cls({
                      "flip-container": true,
                      active: player.active
                    })}
                  >
                    <View
                      className={cls({
                        active: player.active,
                        flip: true
                      })}
                    >
                      <View
                        className={cls({
                          "flip-front": true,
                          "word-card": true,
                          "play-out": !player.leftWords?.[0]
                        })}
                      >
                        {player.leftWords?.[0] || "出局"}
                      </View>
                      <View
                        className={cls({
                          "flip-back": true,
                          "word-card": true,
                          "play-out": !player.leftWords?.[0]
                        })}
                      >
                        {player.leftWords?.[0] || "出局"}
                      </View>
                    </View>
                  </View>
                ) : (
                  ""
                )}
                <AtAvatar circle image={player.avatarUrl}></AtAvatar>
              </View>
              <View className="player-name">{player.nickName}</View>
              {start && !player.leftWords?.length ? (
                ""
              ) : (
                <View
                  className={cls({
                    "custom-edit": player.setWord,
                    "control-item": true
                  })}
                >
                  {!start && (
                    <View className="custom-word">
                      {player.setWord ? (
                        <View
                          className="custom-word-text"
                          onClick={e => e?.stopPropagation()}
                        >
                          <AtTextarea
                            onChange={handleCustomWord.bind(
                              null,
                              player.openId
                            )}
                            count={false}
                            maxLength={20}
                            value={player.customWord}
                            placeholder="最多10个字"
                          />
                        </View>
                      ) : (
                        ""
                      )}
                      <View
                        className={cls({
                          "has-word": player.setWord,
                          "custom-word-btn": true
                        })}
                        onClick={setPlayerWord.bind(null, player.openId)}
                      >
                        {player.setWord ? "确定" : "自定义"}
                      </View>
                    </View>
                  )}
                  {start && player.leftWords?.length && (
                    <View
                      className="switch-word"
                      onClick={catchPlayer.bind(null, {
                        catchPlayerId: player.openId,
                        word: player.leftWords[0]
                      })}
                    >
                      换词条
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View
        className={cls({
          show: catchInfo,
          "catch-info": true
        })}
      >
        <View className="catch-avatar">
          <AtAvatar circle image={catchInfo?.avatarUrl}></AtAvatar>
        </View>

        <View className="catch-text">
          <View>您的词条被</View>
          <View className="catch-name">{catchInfo?.catcherName}</View>
          <View>命中？</View>
        </View>
        <View className="catch-btn-wrapper">
          <View
            className="catch-btn confirm"
            onClick={confirmCatch.bind(null, true)}
          >
            是的
          </View>
          <View
            className="catch-btn refuse"
            onClick={confirmCatch.bind(null, false)}
          >
            并没有
          </View>
        </View>
      </View>

      <AtMessage />
    </View>
  );
};

export default PlayRoom;
