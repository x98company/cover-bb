# Bearbit Userscript (`cover-next.js`) - Project Memory

## Overview
This project involves a Tampermonkey userscript (`cover-next.js`) designed to enhance the UI and functionality of the Bearbit torrent tracker. The script replaces the default list view with a cleaner, thumbnail-rich interface, provides advanced downloading capabilities to bypass server-side protections, and automates common user interactions.

## Security Context
The original version of this script contained a large, obfuscated malicious payload designed to exfiltrate data or run unwanted background processes. The current version has been strictly audited and sanitized. The Tampermonkey configuration (`cover-next.user.js`) is set to load the script from the local filesystem (`file:///`) to prevent automatic updates from reverting the sanitization.

## Key Features Implemented

### 1. UI & Visual Enhancements
*   **Thumbnail System**: Automatically scrapes `ScreenShot`, `Cover`, or `รูปหน้าปก` from the torrent details page. Injects these as thumbnails into the main list's "รูป" (Poster) column.
*   **Hover Interactions**: Thumbnails feature a smooth `1.8x` zoom effect on hover (`onmouseover`) for quick previews.
*   **Lightbox Viewing**: Clicking a thumbnail opens a high-resolution version in an in-page modal (Lightbox), preventing navigation away from the list.
*   **UI Cleanup**: Aggressively removes redundant or legacy UI elements (old "View Image" buttons, original VIP buttons, Bookmark stars) to maintain a minimal aesthetic.

### 2. Advanced Downloading (Bypass Logic)
*   **Download Guard Bypass**: Replaces standard download links with a custom red "Download Torrent" button. To bypass the site's "Download Guard" (which checks if a user visited the details page first), the script uses a **Double-Fetch strategy**:
    1.  **Prime Session**: Uses `GM_xmlhttpRequest` to silently GET the `details.php` page, registering the view.
    2.  **Fetch File**: Uses a subsequent `GM_xmlhttpRequest` to download the actual torrent file, injecting the spoofed `Referer` header.
*   **Auto-Thanks**: During the "Prime Session" step, the script parses the HTML to find the "Say Thanks" (`กดขอบคุณที่นี่`) button and automatically sends a background GET request to trigger it.

### 3. Settings & Configuration
*   **Customizable UI**: Features a floating settings gear (⚙️) at the bottom-left of the screen.
*   **Dimension Control**: Allows users to set custom dimensions (`thumbWidth`, `thumbHeight`) for the thumbnails via prompt dialogs.
*   **Persistence**: Settings are saved in `localStorage` under the key `bb_cover_settings`.

### 4. Smart Caching
*   **Data Caching**: Scraped URLs (screenshots and download links) are cached in `localStorage` using the key format `cache_v2_<detailUrl>`.
*   **Expiry**: Cache entries are set to expire after 30 days to ensure data freshness while significantly reducing the number of requests sent to the Bearbit server.

## Technical Requirements
*   **Tampermonkey**: Requires Tampermonkey with "Allow access to file URLs" enabled.
*   **Permissions**: Relies on `@grant GM_xmlhttpRequest` to perform background fetches and Referer spoofing.

## Future Considerations
*   Ensure the script remains local. Do not sync with the original compromised repository.
*   Monitor changes to the Bearbit DOM structure, as changes to table layouts (`td[width="900"]`, `td.rowhead`) could break the scraping logic.
