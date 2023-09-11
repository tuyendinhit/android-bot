import * as cp from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import util from "util";

import getPort from "./getport";

const exec = util.promisify(cp.exec);
const copyFile = util.promisify(fs.copyFile);
const unlink = util.promisify(fs.unlink);
const resove = (p: string) => path.resolve(__dirname, p);

// const CLIENT_PATH=process.env.NODE_ENV == 'production'?"./bin/autojs-server":"../bin/autojs-server"

// 获取设备列表
async function getDevicesList(): Promise<Array<string>> {
  const { stdout, stderr } = await exec("adb devices -l");
  const result: Array<string> = [];
  if (!stderr) {
    const devices = stdout
      .split(/[\r\n]+/gi)
      .map((item) => item.trim())
      .filter((item) => item.includes("product"))
      .filter(
        (item) => !item.includes("offline") || !item.includes("unauthorized")
      )
      .filter(Boolean);
    for (const item of devices) {
      const currentDeviceArr = item.split(/\s+/);
      result.push(currentDeviceArr[0] as string);
    }
  }
  return result;
}
interface ForwardInfo {
  deviceId: string;
  pcPort: string;
  devicePort: string;
}
// 获取端口映射列表
async function getForwardList(): Promise<Array<ForwardInfo>> {
  const { stdout, stderr } = await exec("adb forward --list");
  const result: Array<ForwardInfo> = [];
  if (!stderr) {
    const devices = stdout
      .split(/[\r\n]+/gi)
      .map((item) => item.trim())
      .filter((item) => item.includes("tcp:18080"))
      .filter(Boolean);
    for (const item of devices) {
      const currentDeviceArr = item.split(/\s+/);
      const deviceId = currentDeviceArr[0];
      const pcPort = currentDeviceArr[1].split(":")[1];
      const devicePort = currentDeviceArr[2].split(":")[1];
      result.push({
        deviceId,
        pcPort,
        devicePort,
      });
    }
  }
  return result;
}
//获取某个设备得映射信息

async function getForwardInfoByDeviceId(
  id: string
): Promise<ForwardInfo | null> {
  let forwardInfos = await getForwardList();
  let forwardInfo = forwardInfos.find((item) => item.deviceId === id);
  return forwardInfo;
}
// 自定义Adb命令
async function _execAdbShell(
  deviceId: string,
  shellStr: string,
  showlog = true
) {
  const mingling = `adb -s ${deviceId} ${shellStr}`;
  if (showlog) {
    console.log(mingling);
  }
  const { stdout, stderr } = await exec(mingling);
  if (!stderr) {
    console.log("命令执行成功");
  }
  return { stdout, stderr };
}

// 判断autojs-server是否安装
async function isInstallServer(deviceId: string) {
  const mingling = `shell ls /data/local/tmp`;
  const { stdout = "" } = await _execAdbShell(deviceId, mingling, false);
  if (stdout && stdout.includes("autojs-server")) {
    return true;
  } else {
    return false;
  }
}

// 判断autojs-server是否安装
async function activeDevice(deviceId: string) {
  const mingling = `shell "nohup app_process -Djava.class.path=/data/local/tmp/autobot-server /data/local/tmp cn.tntok.autobot.OooOO0o > /dev/null 2>&1 &"`;
  const { stderr } = await _execAdbShell(deviceId, mingling, false);
  if (stderr) console.error(stderr);
  return !!stderr;
}

// 判断autojs-server是否安装
async function forward2PC(
  deviceId: string,
  port: number,
  phonePort = 18080
): Promise<boolean> {
  if (!port) throw new Error("映射端口不能为空");
  const mingling = `forward tcp:${port} tcp:${phonePort}`;
  const { stderr } = await _execAdbShell(deviceId, mingling, false);
  if (stderr) console.error(stderr);
  return !!stderr;
}

// 判断autojs-server是否安装
async function removeForward(
  deviceId: string,
  port: string | number
): Promise<boolean> {
  if (!port) throw new Error("端口不能为空");
  const mingling = `forward --remove tcp:${port}`;
  const { stderr } = await _execAdbShell(deviceId, mingling, false);
  if (stderr) console.error(stderr);
  return !!stderr;
}

// base64编码
function base64Encode(text: string) {
  return Buffer.from(text).toString("base64");
}
function buildServerPara(para = {}) {
  return base64Encode(JSON.stringify(para));
}

// 传一个文件名获取一个临时文件
function getTempPath(filename: string) {
  const tmpDir = os.tmpdir();
  const resultDir = path.resolve(tmpDir, filename);
  return resultDir;
}
// 删除一个文件
async function delFile(filePath) {
  await unlink(filePath);
}

export {
  ForwardInfo,
  removeForward,
  getForwardList,
  getForwardInfoByDeviceId,
  forward2PC,
  getPort,
  activeDevice,
  isInstallServer,
  getDevicesList,
};