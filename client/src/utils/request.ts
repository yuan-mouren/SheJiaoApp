import { ResultWrapper, Result } from "../types/request.type";

export const getRequestRes = (
  res: ResultWrapper,
  fields?: (keyof Result)[]
): any => {
  console.log(res);
  if (!res) {
    return "";
  }
  const { result } = res;
  if (fields) {
    return fields.reduce((pre, next) => {
      pre[next] = result[next];
      return pre;
    }, {});
  }
  return result;
};
