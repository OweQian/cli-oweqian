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
      params,
      method: "get",
      headers,
    });
  }

  post(url, data, headers) {
    return this.service({
      url,
      data,
      method: "post",
      headers,
    });
  }

  searchRepositories(params) {
    return this.get("/search/repositories", params);
  }

  searchCode(params) {
    return this.get("/search/code", params);
  }

  getTags(fullName, params) {
    console.log(`/repos/${fullName}/tags`);
    return this.get(`/repos/${fullName}/tags`, params);
  }

  getRepoUrl(fullName) {
    return `git@github.com:${fullName}.git`; // ssh
  }

  getUser() {
    return this.get("/user");
  }

  getOrganization() {
    return this.get("/user/orgs");
  }

  getRepo(owner, repo) {
    return this.get(
      `/repos/${owner}/${repo}`,
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
