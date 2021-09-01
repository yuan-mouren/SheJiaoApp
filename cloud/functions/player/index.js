const cloud = require("wx-server-sdk");

// 初始化 cloud
cloud.init({
  // API 调用都保持和云函数当前所在环境一致
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 这个示例将经自动鉴权过的小程序用户 openid 返回给小程序端
 *
 * event 参数包含小程序端调用传入的 data
 *
 */
exports.main = async (event, context) => {
  const { OPENID, APPID, UNIONID, ENV } = cloud.getWXContext();
  const db = cloud.database();

  const { func, params, userInfo } = event;
  let res;
  try {
    switch (func) {
      case "getPlayers":
        res = await getPlayers(db, params, userInfo);
        return res;
      case "hasPlayer":
        res = await hasPlayer(db, params, userInfo);
        return res;
      case "getOpenId":
        res = await getOpenId(db, params, userInfo);
        return res;
      case "setCustomWord":
        res = await setWord(db, params, userInfo);
        return res;
      default:
        return 1;
    }
  } catch (err) {
    return { code: 0, status: "failed", data: err };
  }
};

const getOpenId = async (db, params, userInfo) => {
  return { code: 1, status: "success", data: userInfo };
};

const getPlayers = async (db, params, userInfo) => {
  const { roomId } = params;
  const players = await db
    .collection("players")
    .where({
      roomId,
    })
    .get();

  if (players && players.data && players.data.length) {
    return { code: 1, status: "success", data: players.data };
  }
};

const hasPlayer = async (db, params, userInfo) => {
  const { openId } = userInfo;
  const collection = db.collection("players");

  const playerInfo = await collection
    .where({
      openId,
    })
    .get();

  if (playerInfo && playerInfo.data && playerInfo.data.length) {
    const { roomId, _id } = playerInfo.data[0];
    if (roomId) {
      return { code: 1, status: "success", data: { roomId } };
    } else {
      await collection.doc(_id).remove();
      return { code: 1, status: "success", data: null };
    }
  }
  return { code: 1, status: "success", data: null };
};

/**
 *  用户自定义词条
 */
const setWord = async (db, params, userInfo) => {
  const { roomId, openId, customWord } = params;
  const res = await db.collection("rooms").doc(roomId).get();
  if (res && res.data) {
    const roomInfo = res.data;
    const players = roomInfo.players;
    const customPlayers = (players || []).map((player) => {
      if (player.openId === openId) {
        return { ...player, leftWords: [customWord] };
      }
      return player;
    });
    const update = await db
      .collection("rooms")
      .doc(roomId)
      .update({
        data: {
          players: customPlayers,
        },
      });
    if (update) {
      return { code: 1, status: "success", data: customPlayers };
    }
  }
  return { code: 0, status: "failed", message: "设置词条失败" };
};
