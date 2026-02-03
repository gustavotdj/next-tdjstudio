export function normalizePath(path) {
    if (!path) return '';
    // Normalize to remove accents (João -> Joao)
    const normalizedInput = path.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    // Replace spaces with dashes and remove special chars (keep slashes for paths)
    // Note: We apply this segment by segment to avoid messing up slashes if we just did a global replace on the whole path string
    // But wait, the upload logic was: cleanFolder = normalizedInput.replace(/[^a-zA-Z0-9\-\_\/ ]/g, '').replace(/\s+/g, '-');
    // It allowed slashes. So if we have "Client Name/Project Name", it becomes "Client-Name/Project-Name".
    
    return normalizedInput.replace(/[^a-zA-Z0-9\-\_\/ ]/g, '').replace(/\s+/g, '-');
}
