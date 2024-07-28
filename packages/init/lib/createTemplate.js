import path from "node:path";
import { homedir } from "node:os";
import {
  makeList,
  log,
  makeInput,
  getLatestVersion,
  request,
  printErrorLog,
} from "@oweqian/utils";

const ADD_TYPE_PROJECT = "project";
const ADD_TYPE_PAGE = "page";
const ADD_TYPE = [
  {
    name: "项目",
    value: ADD_TYPE_PROJECT,
  },
  {
    name: "页面",
    value: ADD_TYPE_PAGE,
  },
];

const TEMP_HOME = ".cli-oweqian";

/**
 * 选择创建类型
 * 决定创建的是项目或者页面
 */
function getAddType() {
  return makeList({
    choices: ADD_TYPE,
    message: "请选择初始化类型",
    defaultValue: ADD_TYPE_PROJECT,
  });
}

/**
 * 输入项目名称
 */
function getAddName() {
  return makeInput({
    message: "请输入项目名称",
    defaultValue: "",
    validate: (v) => {
      if (v.length > 0) {
        return true;
      }
      return "项目名称必须输入";
    },
  });
}

/**
 * 选择项目模板
 */
function getAddTemplate(choices) {
  return makeList({
    choices,
    message: "请选择项目模板",
  });
}

/**
 * 选择所在团队
 * 不同的团队有不同的项目模板
 */
function getAddTeam(team) {
  return makeList({
    choices: team.map((item) => ({ name: item, value: item })),
    message: "请选择团队",
  });
}

/**
 * 模板缓存目录
 * os.homedir(): 返回当前用户的主目录的字符串路径
 */
function makeTargetPath() {
  return path.resolve(`${homedir()}/${TEMP_HOME}`, "addTemplate");
}

/**
 * 通过API获取项目模板
 */
async function getTemplateFromAPI() {
  try {
    const data = await request({
      url: "/v1/project",
      method: "get",
    });
    log.verbose("template", data);
    return data;
  } catch (e) {
    printErrorLog(e);
    return null;
  }
}

async function createTemplate(name, opts) {
  // 通过API获取项目模板
  const ADD_TEMPLATE = await getTemplateFromAPI();
  if (!ADD_TEMPLATE) {
    throw new Error("项目模板不存在");
  }

  /**
   * name：项目名称
   * type：创建类型（值：project/page）
   * template：模板名称
   */
  const { type = null, template = null } = opts;

  // 项目名称
  let addName;
  // 选择的创建类型
  let addType;
  // 选择的模板信息
  let selectedTemplate;

  // 兼容交互式（Options）和非交互式项目创建逻辑
  if (type) {
    addType = type;
  } else {
    addType = await getAddType();
  }
  log.verbose("addType", addType);

  if (addType === ADD_TYPE_PROJECT) {
    if (name) {
      addName = name;
    } else {
      addName = await getAddName();
    }
    log.verbose("addName", addName);

    if (template) {
      selectedTemplate = ADD_TEMPLATE.find((tp) => tp.value === template);
      if (!selectedTemplate) {
        throw new Error(`项目模板 ${template} 不存在`);
      }
    } else {
      // 获取团队信息
      let teamList = ADD_TEMPLATE.map((_) => _.team);
      teamList = [...new Set(teamList)];

      const addTeam = await getAddTeam(teamList);
      log.verbose("addTeam", addTeam);

      // 根据选择的团队信息过滤模板
      let addTemplate = await getAddTemplate(
        ADD_TEMPLATE.filter((_) => _.team === addTeam)
      );
      log.verbose("addTemplate", addTemplate);

      selectedTemplate = ADD_TEMPLATE.find((_) => _.value === addTemplate);
    }
    log.verbose("selectedTemplate", selectedTemplate);

    // 通过 package 名称从 npm 获取最新版本号
    const latestVersion = await getLatestVersion(selectedTemplate.npmName);
    log.verbose("latestVersion", latestVersion);
    selectedTemplate.version = latestVersion;

    // 模板缓存目录
    const targetPath = makeTargetPath();

    return {
      type: addType,
      name: addName,
      template: selectedTemplate,
      targetPath,
    };
  } else {
    throw new Error(`类型 ${addType} 不支持`);
  }
}

export default createTemplate;
