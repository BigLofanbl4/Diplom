import NotFoundPage from "./components/common/pages/NotFoundPage.js";
import { initAuthState, getAuthState } from "./core/auth/state.js";
import { HOME_BY_ROLE } from "./core/auth/constants.js";

export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentLayout = null;
    this.currentComponent = null;
    this.currentURL = null;

    this.init();
  }

  init() {
    this.handleDOMContentLoaded();
    this.initNavigation();
    this.handlePopstate();
  }

  handleDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", async () => {
      this.currentURL = window.location.pathname;
      await initAuthState();
      await this.resolvePath(this.currentURL);
    });
  }

  initNavigation() {
    document.addEventListener("click", async (event) => {
      const link = event.target.closest("[data-spa-link]");
      if (link) {
        event.preventDefault();
        const targetURL = link.getAttribute("href");
        history.pushState(null, null, targetURL);

        const nextURL = window.location.pathname;
        if (this.currentURL === nextURL) return;

        await this.resolvePath(nextURL);
      }
    });
  }

  handlePopstate() {
    window.addEventListener("popstate", async () => {
      const url = window.location.pathname;
      await this.resolvePath(url);
    });
  }

  _matchRoute(routePath, url) {
    const paramNames = [];
    const regexPath = routePath.replace(/:([^\/]+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^\/]+)';
    });

    const regex = new RegExp(`^${regexPath}$`);
    const match = url.match(regex);

    if (!match) return null;

    const params = {};
    match.slice(1).forEach((value, index) => params[paramNames[index]] = value);
    return params;
  }

  back() {
    history.back();
  }

  async navigate(url) {
    history.pushState(null, null, url);
    const nextURL = window.location.pathname;
    await this.resolvePath(nextURL);
  }

  async resolvePath(nextURL) {
    const { user, role } = getAuthState()
    this.currentURL = nextURL;
    const componentContainer = document.getElementById("component");
    const previousHeight = componentContainer?.offsetHeight ?? 0;

    if (componentContainer && previousHeight > 0) {
      componentContainer.style.minHeight = `${previousHeight}px`;
    }

    try {
      let route = null;
      let params = {};

      for (const path in this.routes) {
        const matchedParams = this._matchRoute(path, nextURL);
        if (matchedParams) {
          route = this.routes[path];
          params = matchedParams;
          break;
        }
      }

      if (!route) {
        if (this.currentComponent) this.currentComponent.destroy();
        if (this.currentLayout) this.currentLayout.destroy();

        this.currentLayout = null;
        this.currentComponent = null;

        const notFoundPage = new NotFoundPage();
        await notFoundPage.draw();
        return;
      }

      if (route.meta.access === "requiresAuth" && !user) {
        return this.navigate("/login");
      }

      if (route.meta.access === "requiresAuth" && route.meta.role !== role) {
        alert("Отказано в доступе");
        return this.navigate(HOME_BY_ROLE[role] || "/login");
      }

      if (route.meta.access === "guestOnly" && user) {
        return this.navigate(HOME_BY_ROLE[role] || "/");
      }

      if (this.currentLayout?.constructor !== route.Layout) {
        this.currentLayout?.destroy?.();
        this.currentLayout = new route.Layout();
        await this.currentLayout.draw();
      }

      this.currentComponent?.destroy?.();
      this.currentComponent = null;

      if (route.Component) {
        this.currentComponent = new route.Component(params);
        await this.currentComponent.draw();
      }
    } finally {
      if (componentContainer) {
        componentContainer.style.minHeight = "";
      }
    }
  }
}
