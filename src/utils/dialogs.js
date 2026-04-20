import AlertDialog from "../components/common/dialogs/AlertDialog.js";
import ConfirmDialog from "../components/common/dialogs/ConfirmDialog.js";

let dialogQueue = Promise.resolve();

function enqueueDialog(createDialog) {
  const task = dialogQueue.then(() => createDialog());
  dialogQueue = task.catch(() => undefined);
  return task;
}

export function showAlert(options) {
  return enqueueDialog(() => {
    const dialog = new AlertDialog(
      typeof options === "string" ? { message: options } : options
    );

    return dialog.show();
  });
}

export function showConfirm(options) {
  return enqueueDialog(() => {
    const dialog = new ConfirmDialog(
      typeof options === "string" ? { message: options } : options
    );

    return dialog.show();
  });
}
