// Shared print driver: opens a window, writes the document, waits for load
// (so local barcode/data-URI images decode before the dialog opens), prints
// exactly once, and reports popup blocking to the caller.

export const printDocument = (html, { readyDelayMs = 150, safetyTimeoutMs = 5000 } = {}) => {
  const win = window.open('', '_blank');
  if (!win) {
    console.error('Print window blocked by the browser — allow popups for this site.');
    return false;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error('Print failed:', e);
    }
  };

  win.addEventListener('load', () => setTimeout(doPrint, readyDelayMs));
  setTimeout(doPrint, safetyTimeoutMs); // safety net if load already fired
  return true;
};
