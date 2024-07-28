import { printErrorLog } from "@oweqian/utils";

// 处理未捕获的异常
process.on("uncaughtException", (e) => printErrorLog(e, "error"));

// 处理未处理的Promise Reject
process.on("unhandledRejection", (e) => printErrorLog(e, "promise"));
