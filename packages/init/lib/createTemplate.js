import { makeList, log } from "@oweqian/utils";

const ADD_TYPE_PROJECT = "project";
const ADD_TYPE_PAGE = "page";
const ADD_TEMPLATE = [
  {
    name: "vue3项目模版",
    npmName: "@oweqian/template-vue3",
    version: "1.0.1",
  },
  {
    name: "react18项目模版",
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

// 获取创建类型
function getAddType() {
  return makeList({
    choices: ADD_TYPE,
    message: "请选择初始化类型",
    defaultValue: ADD_TYPE_PROJECT,
  });
}
async function createTemplate(name, opts) {
  const addType = await getAddType();
  log.verbose("addType", addType);
}

export default createTemplate;
