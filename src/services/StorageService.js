const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '..', '..', '_storage.json');

class StorageService {
  static storage = {};

  static init() {
    if (fs.existsSync(STORAGE_PATH)) {
      StorageService.getAll();
    } else {
      StorageService.setAll();
    }
  }

  static getAll() {
    StorageService.storage = JSON.parse(fs.readFileSync(STORAGE_PATH));
    return StorageService.storage;
  }

  static setAll() {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(StorageService.storage, null, 2));
  }

  static get(key) {
    return StorageService.storage[key];
  }

  static set(key, value) {
    StorageService.storage[key] = value;
    StorageService.setAll();
  }
}

module.exports = StorageService;
