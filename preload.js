const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe API for RSS parsing and feed management
contextBridge.exposeInMainWorld('rssAPI', {
  fetchFeed: async (feedUrl) => {
    const result = await ipcRenderer.invoke('fetch-feed', feedUrl);
    if (result.feed) return result.feed;
    else return { error: result.error };
  }
  // Add more methods as needed
});
