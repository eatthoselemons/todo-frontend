// Mock implementation of Emittery for Jest
class Emittery {
  constructor() {
    this.events = new Map();
  }

  async emit(eventName, data) {
    const handlers = this.events.get(eventName) || [];
    await Promise.all(handlers.map(handler => handler(data)));

    // Call onAny handler if it exists
    if (this._anyHandler) {
      await this._anyHandler(eventName, data);
    }
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.events.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  async once(eventName) {
    return new Promise((resolve) => {
      const unsubscribe = this.on(eventName, (data) => {
        unsubscribe();
        resolve(data);
      });
    });
  }

  onAny(handler) {
    this._anyHandler = handler;
    return () => {
      this._anyHandler = null;
    };
  }

  off(eventName, handler) {
    const handlers = this.events.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  clearListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  listenerCount(eventName) {
    if (eventName) {
      return (this.events.get(eventName) || []).length;
    }
    let total = 0;
    for (const handlers of this.events.values()) {
      total += handlers.length;
    }
    return total;
  }
}

module.exports = Emittery;
module.exports.default = Emittery;
