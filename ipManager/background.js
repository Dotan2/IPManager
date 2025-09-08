// Background script for Lab IP Manager
chrome.runtime.onInstalled.addListener(() => {
  try {
    // Create context menu for IP addresses
    chrome.contextMenus.create({
      id: 'addIpToManager',
      title: 'Add IP to Lab Manager',
      contexts: ['selection']
    });

    // Create omnibox keyword (only if omnibox is available)
    if (chrome.omnibox) {
      chrome.omnibox.setDefaultSuggestion({
        description: 'Lab IP Manager: Type host name to open'
      });
    }
  } catch (error) {
    console.error('Error in onInstalled:', error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  try {
    if (info.menuItemId === 'addIpToManager') {
      const selectedText = info.selectionText.trim();
      
      // Basic IP validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (ipRegex.test(selectedText)) {
        // Store the IP for the popup to pick up
        chrome.storage.local.set({ 
          pendingIp: selectedText,
          pendingIpSource: tab.url 
        });
        
        // Open the popup
        chrome.action.openPopup();
      } else {
        // Show notification for invalid IP (only if notifications API is available)
        if (chrome.notifications) {
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon48.png',
              title: 'Lab IP Manager',
              message: 'Selected text is not a valid IP address'
            });
          } catch (error) {
            console.error('Error creating notification:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in context menu click:', error);
  }
});

// Handle omnibox input (only if omnibox is available)
if (chrome.omnibox) {
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    // Get all hosts and filter by name
    chrome.storage.local.get(['ipManagerData'], (result) => {
      if (result.ipManagerData && result.ipManagerData.envs) {
        const allHosts = [];
        result.ipManagerData.envs.forEach(env => {
          env.items.forEach(item => {
            allHosts.push({
              content: item.id,
              description: `${item.name} - ${item.ip}`
            });
          });
        });
        
        const filtered = allHosts.filter(host => 
          host.description.toLowerCase().includes(text.toLowerCase())
        );
        
        suggest(filtered.slice(0, 5)); // Limit to 5 suggestions
      }
    });
  });

  // Handle omnibox selection
  chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    // Find the host by ID or name
    chrome.storage.local.get(['ipManagerData'], (result) => {
      if (result.ipManagerData && result.ipManagerData.envs) {
        let targetHost = null;
        
        // Search by ID first, then by name
        for (const env of result.ipManagerData.envs) {
          targetHost = env.items.find(item => item.id === text || item.name.toLowerCase() === text.toLowerCase());
          if (targetHost) break;
        }
        
        if (targetHost) {
          // Open the default action (web)
          const url = `http://${targetHost.ip}`;
          try {
            chrome.tabs.create({ url });
          } catch (error) {
            console.error('Error creating tab:', error);
          }
        }
      }
    });
  });
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'healthProbe') {
      // Improved health probe - try multiple methods
      performHealthCheck(request.ip)
        .then(result => {
          sendResponse(result);
        })
        .catch(error => {
          sendResponse({ 
            success: false, 
            status: 'offline',
            error: error.message
          });
        });
      
      return true; // Keep message channel open for async response
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    sendResponse({ 
      success: false, 
      status: 'error',
      error: error.message
    });
  }
});

// Periodic health checks (if enabled)
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    try {
      if (alarm.name === 'healthCheck') {
        performHealthChecks();
      }
    } catch (error) {
      console.error('Error in alarm listener:', error);
    }
  });

  // Create alarm for periodic health checks
  chrome.storage.local.get(['ipManagerSettings'], (result) => {
    try {
      if (result.ipManagerSettings && result.ipManagerSettings.enableHealthProbe) {
        chrome.alarms.create('healthCheck', { 
          delayInMinutes: 1, 
          periodInMinutes: 5 
        });
      }
    } catch (error) {
      console.error('Error creating alarm:', error);
    }
  });
}

// Improved health check function
async function performHealthCheck(ip) {
  const startTime = Date.now();
  
  // Method 1: Try HTTP (for web servers)
  try {
    const httpResponse = await fetch(`http://${ip}`, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    return {
      success: true,
      responseTime,
      status: 'online',
      method: 'http'
    };
  } catch (error) {
    // HTTP failed, try HTTPS
  }
  
  // Method 2: Try HTTPS (for secure web servers)
  try {
    const httpsResponse = await fetch(`https://${ip}`, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000)
    });
    
    const responseTime = Date.now() - startTime;
    return {
      success: true,
      responseTime,
      status: 'online',
      method: 'https'
    };
  } catch (error) {
    // HTTPS failed, try ping simulation
  }
  
  // Method 3: Try to connect to common ports (simulate ping)
  const commonPorts = [22, 23, 80, 443, 3389, 8080, 8443];
  
  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://${ip}:${port}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(2000) // 2 second timeout per port
      });
      
      const responseTime = Date.now() - startTime;
      return {
        success: true,
        responseTime,
        status: 'online',
        method: `port-${port}`
      };
    } catch (error) {
      // Port failed, try next
    }
  }
  
  // All methods failed
  return {
    success: false,
    status: 'offline',
    method: 'all-failed'
  };
}

async function performHealthChecks() {
  try {
    const result = await chrome.storage.local.get(['ipManagerData']);
    if (!result.ipManagerData || !result.ipManagerData.envs) return;
    
    const allHosts = [];
    result.ipManagerData.envs.forEach(env => {
      if (env.items) {
        env.items.forEach(item => {
          allHosts.push(item);
        });
      }
    });
    
    // Check health for each host
    for (const host of allHosts) {
      try {
        const healthResult = await performHealthCheck(host.ip);
        
        if (healthResult.success) {
          host.healthStatus = 'online';
          host.lastHealthCheck = Date.now();
          host.responseTime = healthResult.responseTime;
          host.healthMethod = healthResult.method;
        } else {
          host.healthStatus = 'offline';
          host.lastHealthCheck = Date.now();
          host.healthMethod = healthResult.method;
        }
      } catch (error) {
        host.healthStatus = 'offline';
        host.lastHealthCheck = Date.now();
        host.healthMethod = 'error';
      }
    }
    
    // Save updated data
    await chrome.storage.local.set({ ipManagerData: result.ipManagerData });
  } catch (error) {
    console.error('Health check error:', error);
  }
}
