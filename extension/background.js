/**
 * background.js - Service worker for native PDF generation
 * Uses chrome.tabs.printToPDF for Chrome/Edge (vector PDFs)
 */

// Listen for PDF generation requests from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_PDF_NATIVE') {
    handleNativePDFGeneration(message, sendResponse);
    return true; // Keep channel open for async response
  }
});

/**
 * Generate PDF using Chrome's native print engine
 * @param {Object} message - Message containing HTML and filename
 * @param {Function} sendResponse - Callback to send response
 */
async function handleNativePDFGeneration(message, sendResponse) {
  let tabId = null;

  try {
    const { html, filename } = message;

    // Create data URL with HTML content
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

    // Create hidden tab with the HTML
    const tab = await chrome.tabs.create({
      url: dataUrl,
      active: false // Hidden from user
    });

    tabId = tab.id;

    // Wait for tab to fully load
    await new Promise((resolve) => {
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);

      // Fallback timeout in case load event doesn't fire
      setTimeout(resolve, 2000);
    });

    // Additional wait for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate PDF using Chrome's native print engine
    const pdfData = await chrome.tabs.printToPDF(tabId, {
      paperFormat: 'A4',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 15,
      marginRight: 15,
      printBackground: true,
      preferCSSPageSize: false
    });

    // Close the temporary tab
    await chrome.tabs.remove(tabId);
    tabId = null;

    // Convert ArrayBuffer to Array for message passing
    const pdfArray = Array.from(new Uint8Array(pdfData));

    // Send PDF data back to popup
    sendResponse({
      success: true,
      pdfData: pdfArray,
      filename: filename.replace(/\.md$/, '.pdf')
    });
  } catch (error) {
    // Clean up tab if it exists
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
      } catch (e) {
        // Tab might already be closed
      }
    }

    sendResponse({
      success: false,
      error: error.message || 'Failed to generate PDF'
    });
  }
}
