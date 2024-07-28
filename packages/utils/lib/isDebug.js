/**
 * 检测当前 Node.js 进程是否以调试模式启动
 * 通过指定命令行参数 --debug 或 -d
 */
export default function isDebug() {
  return process.argv.includes("--debug") || process.argv.includes("-d");
}
