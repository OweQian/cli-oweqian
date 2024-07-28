import log from "npmlog";
import isDebug from "./isDebug.js";

/**
 * 打印日志
 */
if (isDebug()) {
  log.level = "verbose";
} else {
  log.level = "info";
}

log.heading = "oweqian";
log.addLevel("success", 2000, { fg: "green", bold: true });

export default log;
