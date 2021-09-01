export type Result = {
  code: number;
  status: string;
  message?: string;
  res: any;
  data?: any[];
};

export type ResultWrapper = {
  errMsg: string;
  requestID?: string;
  result: Result | any;
};
