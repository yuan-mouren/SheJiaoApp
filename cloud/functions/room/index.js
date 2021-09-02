// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 “上传并部署”

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
  // 可执行其他自定义逻辑
  // console.log 的内容可以在云开发云函数调用日志查看

  // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID、及 UNIONID（需满足 UNIONID 获取条件）等信息
  const { OPENID, APPID, UNIONID, ENV } = cloud.getWXContext();
  const db = cloud.database();

  const { func, params, userInfo } = event;
  let res;
  // try {
  switch (func) {
    case "create":
      res = await createRoom(db, params, userInfo);
      return res;
    case "find":
      res = await findRoom(db, params, userInfo);
      return res;
    case "join":
      res = await joinRoom(db, params, userInfo);
      return res;
    case "exit":
      res = await distoryRoom(db, params, userInfo);
      return res;
    default:
      return 1;
  }
  // } catch (err) {
  //   return { code: 0, status: "failed", data: err };
  // }
};

const createRoom = async (db, params, userInfo) => {
  const { type, roomName, playerNum, roomPassWord, creator, roundNum } = params;
  const room = await db.collection("rooms").add({
    data: {
      type,
      name: roomName,
      playerNum,
      roomPassWord,
      creator: { ...creator, openId: userInfo.openId },
      players: [{ ...creator, openId: userInfo.openId }],
      createTime: db.serverDate(),
      roundNum,
    },
  });

  const player = await addPlayer(
    db,
    { creator, roomId: room._id, isCreator: true },
    userInfo
  );

  if (room && player) {
    return { code: 1, status: "success", data: room };
  }
};

const findRoom = async (db, params, userInfo) => {
  const { name } = params;
  const res = await db
    .collection("rooms")
    .where({
      name: db.RegExp({
        regexp: name,
        options: "i",
      }),
    })
    .get();
  if (res && res.data) {
    return { code: 1, status: "success", data: res.data };
  }
};

const joinRoom = async (db, params, userInfo) => {
  const { creator, roomId } = params;
  const { avatarUrl, nickName } = creator || {};
  const _ = db.command;
  const hasRoomRight = await checkRoomRight(db, params, userInfo);
  if (hasRoomRight) {
    return hasRoomRight;
  }
  const roomInfo = await db
    .collection("rooms")
    .doc(roomId)
    .update({
      data: {
        players: _.push([
          {
            nickName,
            avatarUrl,
            openId: userInfo.openId,
          },
        ]),
      },
    });

  const player = await addPlayer(db, { creator, roomId }, userInfo);

  if (roomInfo && player) {
    return { code: 1, status: "success", data: roomInfo, message: "新增成功" };
  }
};

/**
 *  检查是否有进入房间的权限
 */
const checkRoomRight = async (db, params, userInfo) => {
  const { roomId } = params;
  const { openId } = userInfo;
  const player = await db
    .collection("players")
    .where({
      openId,
    })
    .get();

  if (player.data && player.data.length) {
    return { code: 0, status: "error", message: "当前您已在游戏中" };
  }

  const room = await db.collection("rooms").doc(roomId);
  const isStart = room.isStart;
  const isMember = (room.players || []).some(
    (player) => player.openId === userInfo.openId
  );
  if (isStart) {
    return {
      code: 0,
      status: "error",
      message: "当前房间已在游戏中，请稍后加入",
    };
  }
  if (isMember) {
    return { code: 0, status: "error", message: "当前您已在房间中" };
  }
  if ((room.players || []).length === room.playerNum) {
    return { code: 0, status: "error", message: "当前房间已满员" };
  }
  return null;
};

/**
 *  添加玩家
 */
const addPlayer = async (db, params, userInfo) => {
  const { creator, roomId, isCreator } = params;
  const { avatarUrl, nickName } = creator || {};
  const play = await db.collection("players").add({
    data: {
      nickName,
      avatarUrl,
      roomId,
      openId: userInfo.openId,
      isCreator: !!isCreator,
    },
  });

  if (play && play._id) {
    return 1;
  }
  return 0;
};

const distoryRoom = async (db, params, userInfo) => {
  const { roomId } = params;
  const roomInfo = await db.collection("rooms").doc(roomId).get();
  let record;
  if (roomInfo && roomInfo.data) {
    record = await db.collection("records").add({
      data: roomInfo.data,
    });
    removePlayer = await db
      .collection("players")
      .where({
        roomId,
      })
      .remove();
    removeRoom = await db.collection("rooms").doc(roomId).remove();
  }
  if (record) {
    return { code: 1, status: "success", message: "游戏结束", data: record };
  }

  return {
    code: 0,
    status: "failed",
    message: "当前房间信息有误",
    data: roomInfo,
  };
};
