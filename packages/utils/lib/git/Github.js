import axios from "axios";
import { GitServer } from "./GitServer.js";
import log from "../log.js";

const BASE_URL = "https://api.github.com";

class Github extends GitServer {
  constructor() {
    super();

    this.service = axios.create({
      baseURL: BASE_URL,
      timeout: 50000,
    });

    // 请求拦截器
    this.service.interceptors.request.use(
      (config) => {
        config.headers["Authorization"] = `Bearer ${this.token}`;
        config.headers["Accept"] = "application/vnd.github+json";
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.service.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // 封装 get 方法
  get(url, params, headers) {
    return this.service({
      url,
      params,
      method: "get",
      headers,
    });
  }

  // 封装 post 方法
  post(url, data, headers) {
    return this.service({
      url,
      data,
      method: "post",
      headers,
    });
  }

  // 搜索仓库
  searchRepositories(params) {
    return this.get("/search/repositories", params);
  }

  // 搜索源码
  searchCode(params) {
    return this.get("/search/code", params);
  }

  // 获取 tags
  getTags(fullName, params) {
    console.log(`/repos/${fullName}/tags`);
    return this.get(`/repos/${fullName}/tags`, params);
  }

  getRepoUrl(fullName) {
    return `https://github.com/${fullName}.git`;
  }

  getUser() {
    return this.get("/user");
  }

  getOrganization() {
    return this.get("/user/orgs");
  }

  getRepo(login, repo) {
    return this.get(
      `/repos/${login}/${repo}`,
      {},
      {
        accept: "application/vnd.github+json",
      }
    ).catch((err) => {
      return null;
    });
  }

  async createRepo(name) {
    // 检查远程仓库是否存在，如果存在，则跳过创建
    const repo = await this.getRepo(this.login, name);
    if (!repo) {
      log.info("仓库不存在，开始创建");
      if (this.own === "user") {
        return this.post(
          "/user/repos",
          { name },
          {
            accept: "application/vnd.github+json",
          }
        );
      } else if (this.own === "organization") {
        return this.post(
          `/orgs/${this.login}/repos`,
          { name },
          {
            accept: "application/vnd.github+json",
          }
        );
      }
    } else {
      log.info("仓库存在，直接返回");
      return repo;
    }
  }
}

export default Github;
