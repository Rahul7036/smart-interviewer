// Background service worker for Smart Interviewer extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('Smart Interviewer extension installed');
    
    // Set default settings
    chrome.storage.local.set({
        settings: {
            autoStart: false,
            language: 'en-US',
            aiProvider: 'openai',
            apiKey: '',
            notifications: true
        }
    });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'interviewStatus':
            // Update badge text based on interview status
            if (message.active) {
                chrome.action.setBadgeText({ text: 'ON' });
                chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
            } else {
                chrome.action.setBadgeText({ text: '' });
            }
            break;
            
        case 'questionDetected':
            // Update badge with question count
            chrome.action.setBadgeText({ text: 'Q' });
            chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
            break;
            
        case 'answerRated':
            // Show notification for rating
            if (message.rating >= 8) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon48.png',
                    title: 'Great Answer!',
                    message: `Rated ${message.rating}/10 - Excellent response!`
                });
            }
            break;
    }
});

// Handle tab updates and inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Only inject on regular web pages
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
            // Check if content script is already loaded
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    return typeof smartInterviewer !== 'undefined';
                }
            }).then((results) => {
                if (!results[0].result) {
                    // Content script not loaded, inject it
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['content.js']
                    }).then(() => {
                        console.log('✅ Content script injected into:', tab.url);
                    }).catch((error) => {
                        console.log('⚠️ Could not inject content script:', error.message);
                    });
                } else {
                    console.log('✅ Content script already loaded in:', tab.url);
                }
            }).catch((error) => {
                console.log('⚠️ Error checking content script:', error.message);
            });
        }
    }
});

// Handle extension icon click - ensure content script is loaded
chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
        try {
            // Check if content script is loaded
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => typeof smartInterviewer !== 'undefined'
            });
            
            if (!results[0].result) {
                // Inject content script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                console.log('✅ Content script injected on icon click');
            }
        } catch (error) {
            console.log('⚠️ Error handling icon click:', error.message);
        }
    }
});

// Note: Extension icon click is handled by the manifest action (popup)

// Clean up when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
    console.log('Smart Interviewer extension suspended');
});
