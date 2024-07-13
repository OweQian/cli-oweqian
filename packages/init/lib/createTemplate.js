import path from "node:path";
import { homedir } from "node:os";
import { makeList, log, makeInput, getLatestVersion } from "@oweqian/utils";

const ADD_TYPE_PROJECT = "project";
const ADD_TYPE_PAGE = "page";
const ADD_TEMPLATE = [
  {
    name: "vue3项目模版",
    value: "template-vue3",
    npmName: "@oweqian/template-vue3",
    version: "1.0.1",
  },
  {
    name: "react18项目模版",
    value: "template-react18",
    npmName: "@oweqian/template-react18",
    version: "1.0.1",
  },
];
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

// 获取创建类型
function getAddType() {
  return makeList({
    choices: ADD_TYPE,
    message: "请选择初始化类型",
    defaultValue: ADD_TYPE_PROJECT,
  });
}

// 获取项目名称
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

// 选择项目模版
function getAddTemplate() {
  return makeList({
    choices: ADD_TEMPLATE,
    message: "请选择项目模版",
  });
}

// 安装缓存目录
function makeTargetPath() {
  console.log(homedir());
  return path.resolve(`${homedir()}/${TEMP_HOME}`, "addTemplate");
}
async function createTemplate(name, opts) {
  const { type = null, template = null } = opts;
  let addType;
  let addName;
  let selectedTemplate;
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
      let addTemplate = await getAddTemplate();
      log.verbose("addTemplate", addTemplate);
      selectedTemplate = ADD_TEMPLATE.find((_) => _.value === addTemplate);
    }

    log.verbose("selectedTemplate", selectedTemplate);
    // 获取最新版本号
    const latestVersion = await getLatestVersion(selectedTemplate.npmName);
    log.verbose("latestVersion", latestVersion);
    selectedTemplate.version = latestVersion;
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
