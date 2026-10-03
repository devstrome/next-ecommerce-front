export function getStorage(key) {
  if (typeof window !== "undefined") {
    try { return window.localStorage.getItem(key) } catch(e) {}
  }
  return null
}

export function setStorage(key, value) {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(key, value) } catch(e) {}
  }
}

export function removeStorage(key) {
  if (typeof window !== "undefined") {
    try { window.localStorage.removeItem(key) } catch(e) {}
  }
}
