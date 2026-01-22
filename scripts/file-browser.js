/**
 * Material You NewTab - File Browser
 * Displays the contents of the assetFiles folder
 */

(function () {
    'use strict';

    // Configuration
    const ASSET_FILES_PATH = 'assetFiles';
    
    // State
    let currentPath = ASSET_FILES_PATH;
    let isOpen = false;

    // DOM Elements
    const fileBrowserButton = document.getElementById('fileBrowserCont');
    const fileBrowserContainer = document.getElementById('fileBrowserContainer');
    const closeBrowserButton = document.getElementById('closeBrowser');
    const fileBrowserContent = document.getElementById('fileBrowserContent');
    const currentPathDisplay = document.getElementById('currentPath');

    /**
     * Initialize the file browser
     */
    function init() {
        if (!fileBrowserButton || !fileBrowserContainer) {
            console.warn('File browser elements not found');
            return;
        }

        // Event listeners
        fileBrowserButton.addEventListener('click', toggleFileBrowser);
        closeBrowserButton.addEventListener('click', closeFileBrowser);
        
        // Close on outside click
        document.addEventListener('click', handleOutsideClick);
    }

    /**
     * Toggle file browser visibility
     */
    function toggleFileBrowser(e) {
        e.stopPropagation();
        if (isOpen) {
            closeFileBrowser();
        } else {
            openFileBrowser();
        }
    }

    /**
     * Open the file browser
     */
    function openFileBrowser() {
        isOpen = true;
        fileBrowserContainer.style.display = 'flex';
        loadDirectory(currentPath);
    }

    /**
     * Close the file browser
     */
    function closeFileBrowser() {
        isOpen = false;
        fileBrowserContainer.style.display = 'none';
        currentPath = ASSET_FILES_PATH;
    }

    /**
     * Handle clicks outside the file browser
     */
    function handleOutsideClick(e) {
        if (isOpen && 
            !fileBrowserContainer.contains(e.target) && 
            !fileBrowserButton.contains(e.target)) {
            closeFileBrowser();
        }
    }

    /**
     * Load and display directory contents
     */
    async function loadDirectory(path) {
        currentPathDisplay.textContent = path + '/';
        fileBrowserContent.innerHTML = '<div class="loading-message">Loading files...</div>';

        try {
            // Try to fetch the directory contents using fetch API
            // Since we're in a browser extension/static page, we'll scan for known files
            const items = await scanDirectory(path);
            displayItems(items, path);
        } catch (error) {
            console.error('Error loading directory:', error);
            fileBrowserContent.innerHTML = '<div class="empty-message">Unable to load directory contents</div>';
        }
    }

    /**
     * Scan directory for files
     * This is a workaround since we can't directly access the file system
     */
    async function scanDirectory(path) {
        // For a browser extension/web page, we need to manually define what files exist
        // or use a generated manifest file
        
        // First, let's try to load a manifest file if it exists
        try {
            const response = await fetch(`${path}/manifest.json`);
            if (response.ok) {
                const manifest = await response.json();
                return manifest.files || [];
            }
        } catch (e) {
            // Manifest doesn't exist, continue with alternative method
        }

        // Alternative: Try to load common file types
        const commonExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
            '.mp4', '.webm', '.mp3', '.wav',
            '.pdf', '.txt', '.json', '.csv',
            '.html', '.css', '.js'
        ];

        const items = [];
        
        // Try to detect if it's the root assetFiles folder
        if (path === ASSET_FILES_PATH) {
            // Check for common subdirectories
            const commonFolders = ['images', 'videos', 'audio', 'documents'];
            
            for (const folder of commonFolders) {
                try {
                    // Try to fetch a file that might exist in this folder
                    const testPath = `${path}/${folder}/.gitkeep`;
                    const response = await fetch(testPath, { method: 'HEAD' });
                    if (response.ok) {
                        items.push({ name: folder, type: 'folder', path: `${path}/${folder}` });
                    }
                } catch (e) {
                    // Folder doesn't exist or isn't accessible
                }
            }
        }

        // If no items found, show a message
        if (items.length === 0) {
            return [{ 
                name: 'No files found', 
                type: 'empty',
                message: 'The assetFiles folder appears to be empty. Add files to see them here!'
            }];
        }

        return items;
    }

    /**
     * Display the items in the file browser
     */
    function displayItems(items, parentPath) {
        fileBrowserContent.innerHTML = '';

        // Add back button if not in root
        if (parentPath !== ASSET_FILES_PATH) {
            const backButton = createBackButton();
            fileBrowserContent.appendChild(backButton);
        }

        // Handle empty state
        if (items.length === 1 && items[0].type === 'empty') {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-message';
            emptyDiv.textContent = items[0].message || 'No files found';
            fileBrowserContent.appendChild(emptyDiv);
            return;
        }

        // Sort items: folders first, then files
        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        // Create and append file/folder elements
        items.forEach(item => {
            const itemElement = createFileItem(item);
            fileBrowserContent.appendChild(itemElement);
        });
    }

    /**
     * Create a back button element
     */
    function createBackButton() {
        const button = document.createElement('div');
        button.className = 'back-button';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            <span>Back</span>
        `;
        button.addEventListener('click', () => {
            const parentPath = currentPath.split('/').slice(0, -1).join('/') || ASSET_FILES_PATH;
            currentPath = parentPath;
            loadDirectory(parentPath);
        });
        return button;
    }

    /**
     * Create a file/folder item element
     */
    function createFileItem(item) {
        const div = document.createElement('div');
        div.className = `file-item ${item.type}`;

        const icon = item.type === 'folder' ? getFolderIcon() : getFileIcon(item.name);
        
        div.innerHTML = `
            ${icon}
            <span class="file-item-name">${item.name}</span>
        `;

        // Add click handler
        if (item.type === 'folder') {
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                currentPath = item.path;
                loadDirectory(item.path);
            });
        } else if (item.type === 'file') {
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                handleFileClick(item);
            });
        }

        return div;
    }

    /**
     * Get folder icon SVG
     */
    function getFolderIcon() {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
            </svg>
        `;
    }

    /**
     * Get file icon SVG based on file extension
     */
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        
        // PDF files
        if (ext === 'pdf') {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 10h-2v4h-2v-4H7v-2h6v2zm2-5.5V9h5.5L15 3.5z"/>
                </svg>
            `;
        }
        
        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
            `;
        }
        
        // Video files
        if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
            `;
        }
        
        // Audio files
        if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>
                </svg>
            `;
        }
        
        // Default file icon
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
        `;
    }

    /**
     * Handle file click
     */
    function handleFileClick(item) {
        // Open the file in a new tab for viewing in browser
        const fileUrl = item.path || `${currentPath}/${item.name}`;
        
        // Always open in new tab, browser will handle display/preview
        window.open(fileUrl, '_blank');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
