/**
 * 封装 Command 类
 */
class Command {
  constructor(instance) {
    // 命令行程序的实例
    if (!instance) {
      throw new Error("command instance must not be null!");
    }

    this.program = instance;

    const cmd = this.program.command(this.command);
    cmd.description(this.description);

    cmd.hook("preAction", () => {
      this.preAction();
    });

    cmd.hook("postAction", () => {
      this.postAction();
    });

    if (this.options?.length > 0) {
      this.options.forEach((option) => {
        cmd.option(...option);
      });
    }

    cmd.action((...params) => {
      this.action(params);
    });
  }

  // 命令的名称
  get command() {
    throw new Error("command must be implements");
  }

  // 命令的描述信息
  get description() {
    throw new Error("description must be implements");
  }

  // 命令的选项
  get options() {
    return [];
  }

  // 命令执行时的动作
  action() {
    throw new Error("action must be implements");
  }

  // 命令执行前的钩子
  preAction() {
    // empty
  }

  // 命令执行后的钩子
  postAction() {
    // empty
  }
}

export default Command;
