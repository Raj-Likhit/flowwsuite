// Static storage for File objects to avoid React State overhead
// and Proxy wrapping issues with Web Workers.

const fileStorage = new Map<string, File>();

export const FileStorage = {
    add: (id: string, file: File) => {
        fileStorage.set(id, file);
    },
    get: (id: string) => {
        return fileStorage.get(id);
    },
    remove: (id: string) => {
        fileStorage.delete(id);
    },
    clear: () => {
        fileStorage.clear();
    },
    getAll: () => {
        // Debugging helper
        return new Map(fileStorage);
    }
};
