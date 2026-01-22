import { Home, Admin } from "./pages.js";

const ROUTES = {
  "/": {
    component: Home, 
    meta: {
      title: "Главная",
    }
  },
  "/admin": {
    component: Admin,
    meta: {
      title: "Панель управления"
    }
  }
};

class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentPage = null;

    this.init();
  }

  init() {
    this.handleDOMContentLoaded();
    this.initNavigation();
    this.handlePopstate();
  }

  handleDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", () => {
      const url = window.location.pathname;
      console.log(url);
      this.resolvePath(url);
    });
  }

  initNavigation() {
    document.addEventListener("click", (event) => {
      if (event.target.hasAttribute("data-spa-link")) {
        event.preventDefault();
        const url = event.target.getAttribute("href");
        history.pushState(null, null, url);
        this.resolvePath(url);
      }
    });
  }

  handlePopstate() {
    window.addEventListener("popstate", () => {
      const url = window.location.pathname;
      this.resolvePath(url);
    });
  }

  resolvePath(url) {
    if (this.currentPage) {
      this.currentPage.destroy();
    }
    
    if (!this.routes[url]) {
      console.log("404");
      // отрисовка страницы 404
    }

    const Page = this.routes[url].component;
    this.currentPage = new Page();
    this.currentPage.drawPage();
  }
}

const router = new Router(ROUTES);
