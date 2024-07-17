import inquirer from "inquirer";

function make({
  type = "list",
  message = "请选择",
  defaultValue,
  validate,
  require = true,
  pageSize,
  mask = "*",
  choices,
  loop,
}) {
  const options = {
    name: "name",
    type,
    message,
    default: defaultValue,
    validate,
    require,
    pageSize,
    mask,
    loop,
  };
  if (type === "list") {
    options.choices = choices;
  }
  return inquirer.prompt(options).then((answer) => answer.name);
}

export function makeList(params) {
  return make({ ...params });
}

export function makeInput(params) {
  return make({
    ...params,
    type: "input",
  });
}

export function makePassword(params) {
  return make({
    ...params,
    type: "password",
  });
}
