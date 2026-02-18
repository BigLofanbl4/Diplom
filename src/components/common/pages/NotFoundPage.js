export default class NotFoundPage {
  async draw() {
    document.getElementById("app").innerHTML = `
      <div class="not-found">
        <h1>404</h1>
        <p>Страница не найдена</p>
      </div>
    `;
  }

  destroy() {}
}