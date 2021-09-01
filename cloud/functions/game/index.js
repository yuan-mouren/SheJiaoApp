const cloud = require("wx-server-sdk");

// 初始化 cloud
cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID, ENV } = cloud.getWXContext();
  const db = cloud.database();

  const { func, params, userInfo } = event;
  let res;
  try {
    switch (func) {
      case "start":
        res = await startGame(db, params, userInfo);
        return res;
      case "catchPlayer":
        res = await catchPlayer(db, params, userInfo);
        return res;
      case "catchConfirm":
        res = await catchConfirm(db, params, userInfo);
        return res;
      case "userExit":
        res = await userExit(db, params, userInfo);
        return res;
      default:
        return 1;
    }
  } catch (err) {
    console.log(err);
  }
};

const startGame = async (db, params, userInfo) => {
  const { roomId, playerNum, roundNum } = params;
  const words = await db
    .collection("words")
    .aggregate()
    .sample({
      size: playerNum * roundNum,
    })
    .end();

  const roomCollection = db.collection("rooms");
  const roomInfo = await roomCollection.doc(roomId).get();
  const wordsList = (words.list || []).map((word) => word.name);
  if (roomInfo && roomInfo.data && wordsList) {
    const hasWordPlayers = (roomInfo.data.players || []).map((play, index) => {
      play.leftWords = (play.leftWords || [])
        .concat(wordsList.slice(index * roundNum, (index + 1) * roundNum))
        .splice(0, roundNum);
      return play;
    });
    const res = await roomCollection.doc(roomId).update({
      data: {
        players: hasWordPlayers,
      },
    });
    return { code: 1, status: "success", data: wordsList };
  }
  return {
    code: 0,
    status: "failed",
    message: "词条分发错误",
    data: { roomInfo, words },
  };
};

const catchPlayer = async (db, params, userInfo) => {
  const { roomId, catchPlayer, nickName, avatarUrl } = params;
  const { openId } = userInfo;
  const { catchPlayerId, catchWord } = catchPlayer;

  const roomCollection = db.collection("rooms");
  const roomInfo = await roomCollection.doc(roomId).get();

  if (roomInfo && roomInfo.data) {
    const updatePlayers = (roomInfo.data.players || []).map((player) => {
      if (player.openId === catchPlayerId) {
        player.catchInfo = {
          catchWord,
          catcherId: openId,
          catcherName: nickName,
          avatarUrl,
        };
      }
      return player;
    });
    const update = await roomCollection.doc(roomId).update({
      data: {
        players: updatePlayers,
      },
    });
    if (update) {
      return { code: 1, status: "success", data: updatePlayers };
    }
  }

  return { code: 0, status: "failed", message: "换词失败" };
};

const catchConfirm = async (db, params, userInfo) => {
  const { roomId, confirm } = params;

  const roomCollection = db.collection("rooms");
  const roomInfo = await roomCollection.doc(roomId).get();
  const { openId } = userInfo;

  if (roomInfo && roomInfo.data) {
    const catchedPlayers = (roomInfo.data.players || []).map((player) => {
      const { catchInfo } = player;
      const { catchWord, catcherId } = catchInfo || {};
      if (player.openId === openId && catcherId && confirm) {
        player.beCatched = (player.beCatched || []).concat([
          { openId: player.openId, catchWord },
        ]);
        player.leftWords.shift();
        player.catchInfo = null;
      }
      if (player.openId === openId && catcherId && !confirm) {
        player.catchInfo = null;
      }
      if (player.openId === catcherId && confirm) {
        player.catchCount = player.catchCount ? player.catchCount + 1 : 1;
      }
      return player;
    });
    const update = await roomCollection.doc(roomId).update({
      data: {
        players: catchedPlayers,
      },
    });
    if (update) {
      return { code: 1, status: "success", data: catchedPlayers };
    }
  }

  return { code: 0, status: "failed", message: "换词失败" };
};

const userExit = async (db, params, userInfo) => {
  const { openId } = userInfo;
  const playerInfo = await db
    .collection("players")
    .where({
      openId,
    })
    .get();
  let roomInfo;
  if (playerInfo && playerInfo.data && playerInfo.data.length) {
    const player = playerInfo.data[0];
    roomInfo = await db.collection("rooms").doc(player.roomId).get();
  }
  if (roomInfo && roomInfo.data) {
    const { creator, players } = roomInfo.data;
    let updateCreator;
    let updatePlayers;
    if (players.some((player) => player.openId === openId)) {
      updatePlayers = players.filter((player) => player.openId === openId);
    }
    if (creator.openId === openId) {
      updateCreator = {
        openId: players[0].openId,
        nickName: players[0].nickName,
        avatarUrl: players[0].avatarUrl,
      };
    }
    if (updateCreator || updatePlayers) {
      db.collection("rooms")
        .doc(player.roomId)
        .update({
          data: {
            creator: updateCreator || creator,
            players: updatePlayers || players,
          },
        });
    }
  }
  db.collection("players")
    .where({
      openId,
    })
    .remove();
};
