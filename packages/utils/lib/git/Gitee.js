import axios from "axios";
import { GitServer } from "./GitServer.js";
import log from "../log.js";

const BASE_URL = "https://gitee.com/api/v5";

class Gitee extends GitServer {
  constructor() {
    super();
    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 50000,
    });
    this.service.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  get(url, params, headers) {
    return this.service({
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      method: "get",
      headers,
    });
  }

  post(url, data, headers) {
    return this.service({
      url,
      data: {
        ...data,
        access_token: this.token,
      },
      method: "post",
      headers,
    });
  }

  searchRepositories(params) {
    return this.get("/search/repositories", params);
  }

  getTags(fullName) {
    return this.get(`/repos/${fullName}/tags`);
  }

  getRepoUrl(fullName) {
    return `https://gitee.com/${fullName}.git`;
  }

  getUser() {
    return this.get("/user");
  }

  getOrganization() {
    return this.get("/user/orgs");
  }

  getRepo(owner, repo) {
    return this.get(`/repos/${owner}/${repo}`).catch((err) => {
      return null;
    });
  }

  async createRepo(name) {
    // 检查远程仓库是否存在，如果存在，则跳过创建
    const repo = await this.getRepo(this.login, name);
    if (!repo) {
      log.info("仓库不存在，开始创建");
      if (this.own === "user") {
        return this.post("/user/repos", { name });
      } else if (this.own === "organization") {
        return this.post(`/orgs/${this.login}/repos`, { name });
      }
    } else {
      log.info("仓库存在，直接返回");
      return repo;
    }
  }
}

export default Gitee;
