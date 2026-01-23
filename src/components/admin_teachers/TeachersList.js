import template from './TeachersList.html?raw'
import TableComponent from '../../core/TableComponent';


export default class TeachersList extends TableComponent {
  fetchData() {
    console.log("Тянем данные...")
  }

  render() {
    this.template = template;
    console.log("Логика создание виртуального DOM...");
    // this.rows = ...
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.innerHTML = template;
    console.log("Логика монтирование элементов...");
  }

  handleEvents() {
    this.elements.editBtns = document.querySelectorAll('.table__body button[data-action="update"');
    this.elements.editBtns.forEach(btn => {
      btn.addEventListener("click", () => alert("Edit"));
    });

    this.elements.deleteBtns = document.querySelectorAll('.table__body button[data-action="delete"');
    this.elements.deleteBtns.forEach(btn => {
      btn.addEventListener("click", () => alert("delete"));
    });
  }

  removeEventListeners() {
    this.elements.editBtns.forEach(btn => btn.removeEventListeners());
    this.elements.deleteBtns.forEach(btn => btn.removeEventListeners());
  }

}