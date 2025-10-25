// Simple content script injection for Smart Interviewer
console.log('🎤 Smart Interviewer content script loading...');

// Check if already loaded
if (typeof window.smartInterviewerLoaded === 'undefined') {
    window.smartInterviewerLoaded = true;
    
    // Load the main content script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content.js');
    script.onload = () => {
        console.log('✅ Smart Interviewer content script loaded successfully');
    };
    script.onerror = () => {
        console.error('❌ Failed to load Smart Interviewer content script');
    };
    document.head.appendChild(script);
    
    // Also load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(link);
} else {
    console.log('✅ Smart Interviewer already loaded');
}
