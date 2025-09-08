// Lab IP Manager - Main popup functionality
class IPManager {
  constructor() {
    this.data = {
      version: 1,
      envs: [
        {
          id: 'default',
          name: 'Default',
          items: []
        }
      ]
    };
    this.currentEnv = 'default';
    this.settings = {
      enableHealthProbe: true,
      enableDarkMode: false,
      defaultSSHUser: 'admin',
      defaultRDPUser: 'Administrator',
      defaultSSHPort: 22,
      defaultRDPPort: 3389
    };
    this.filteredItems = [];
    this.activeTags = new Set();
    
    this.init();
  }

  async init() {
    await this.loadData();
    await this.loadSettings();
    this.setupEventListeners();
    this.applyDarkMode();
    this.render();
    
    // Perform health checks if enabled
    if (this.settings.enableHealthProbe) {
      this.performHealthChecks();
    }
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['ipManagerData']);
      if (result.ipManagerData) {
        this.data = result.ipManagerData;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({ ipManagerData: this.data });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['ipManagerSettings']);
      if (result.ipManagerSettings) {
        this.settings = { ...this.settings, ...result.ipManagerSettings };
      }
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ ipManagerSettings: this.settings });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.filterItems();
    });

    // Add button
    document.getElementById('addButton').addEventListener('click', () => {
      this.showAddModal();
    });

    // Add environment button
    document.getElementById('addEnvBtn').addEventListener('click', () => {
      this.addNewEnvironment();
    });

    // Environment filter
    document.getElementById('envFilter').addEventListener('change', (e) => {
      this.currentEnv = e.target.value;
      this.filterItems();
    });

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', () => {
      this.hideModal('hostModal');
    });

    document.getElementById('closeSettingsModal').addEventListener('click', () => {
      this.hideModal('settingsModal');
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.hideModal('hostModal');
    });

    // Form submission
    document.getElementById('hostForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveHost();
    });

    // Footer buttons
    document.getElementById('importBtn').addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Settings form
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettingsForm();
    });

    // Dark mode real-time toggle
    document.getElementById('enableDarkMode').addEventListener('change', () => {
      this.settings.enableDarkMode = document.getElementById('enableDarkMode').checked;
      this.applyDarkMode();
    });

    // File input for import
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileImport(e);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Click outside modal to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.hideModal(e.target.id);
      }
    });

    // Drag and drop functionality
    // Drag and drop functionality removed
  }

  // Drag and drop functionality removed

  handleKeyboardShortcuts(e) {
    // Focus search with /
    if (e.key === '/' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
      return;
    }

    // Add new host with N
    if (e.key === 'n' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      this.showAddModal();
      return;
    }

    // Delete with D
    if (e.key === 'd' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      const firstItem = this.filteredItems[0];
      if (firstItem) {
        this.deleteHost(firstItem);
      }
      return;
    }

    // Escape to close modals
    if (e.key === 'Escape') {
      this.hideModal('hostModal');
      this.hideModal('settingsModal');
    }
  }

  getCurrentEnv() {
    return this.data.envs.find(env => env.id === this.currentEnv) || this.data.envs[0];
  }

  getEnvironmentName(envId) {
    const env = this.data.envs.find(e => e.id === envId);
    return env ? env.name : 'Default';
  }

  filterItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedEnv = document.getElementById('envFilter').value;
    
    // Get all items from all environments first
    let allItems = [];
    this.data.envs.forEach(env => {
      env.items.forEach(item => {
        allItems.push({ ...item, envId: env.id });
      });
    });
    
    // Now filter by environment if one is selected
    if (selectedEnv) {
      allItems = allItems.filter(item => item.environment === selectedEnv || item.envId === selectedEnv);
    }
    
    // Apply search and tag filters
    this.filteredItems = allItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm) ||
        item.ip.toLowerCase().includes(searchTerm) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
      
      const matchesTags = this.activeTags.size === 0 || 
        (item.tags && item.tags.some(tag => this.activeTags.has(tag)));
      
      return matchesSearch && matchesTags;
    });

    // Sort: pinned first, then by name
    this.filteredItems.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.name.localeCompare(b.name);
    });

    this.renderHostList();
    this.renderTagFilters();
  }

  render() {
    this.renderEnvironmentFilter();
    this.filterItems();
    this.renderHostList();
  }

  renderEnvironmentFilter() {
    const envFilter = document.getElementById('envFilter');
    envFilter.innerHTML = '<option value="">All Environments</option>';
    
    this.data.envs.forEach(env => {
      const option = document.createElement('option');
      option.value = env.id;
      option.textContent = env.name;
      if (env.id === this.currentEnv) {
        option.selected = true;
      }
      envFilter.appendChild(option);
    });

    // Also populate the environment dropdown in the form
    const hostEnvSelect = document.getElementById('hostEnvironment');
    hostEnvSelect.innerHTML = '';
    
    this.data.envs.forEach(env => {
      const option = document.createElement('option');
      option.value = env.id;
      option.textContent = env.name;
      hostEnvSelect.appendChild(option);
    });
  }

  renderTagFilters() {
    const tagFilters = document.getElementById('tagFilters');
    
    // Get all unique tags from all environments
    const allTags = new Set();
    this.data.envs.forEach(env => {
      env.items.forEach(item => {
        if (item.tags) {
          item.tags.forEach(tag => allTags.add(tag));
        }
      });
    });

    tagFilters.innerHTML = '';
    Array.from(allTags).sort().forEach(tag => {
      const chip = document.createElement('span');
      chip.className = `tag-chip ${this.activeTags.has(tag) ? 'active' : ''}`;
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        if (this.activeTags.has(tag)) {
          this.activeTags.delete(tag);
        } else {
          this.activeTags.add(tag);
        }
        this.filterItems();
      });
      tagFilters.appendChild(chip);
    });
  }

  renderHostList() {
    const hostList = document.getElementById('hostList');
    
    if (this.filteredItems.length === 0) {
      hostList.innerHTML = `
        <div class="empty-state">
          <h3>No hosts found</h3>
          <p>Add your first host or adjust your search filters</p>
        </div>
      `;
      return;
    }

    hostList.innerHTML = this.filteredItems.map(item => this.renderHostItem(item)).join('');
    
    // Add event listeners to action buttons
    this.filteredItems.forEach(item => {
      this.attachHostItemListeners(item);
    });
  }

  renderHostItem(item) {
    const tags = item.tags ? item.tags.map(tag => `<span class="host-tag">${tag}</span>`).join('') : '';
    const pinnedClass = item.pinned ? 'pinned' : '';
    const port = item.port ? `:${item.port}` : '';
    const env = this.getEnvironmentName(item.environment || 'default');
    const rdpUser = item.rdpUser ? ` (RDP: ${item.rdpUser})` : '';
    
    return `
      <div class="host-item ${pinnedClass}" data-id="${item.id}">
        <div class="host-info">
          <div class="host-name">${this.escapeHtml(item.name)}</div>
          <div class="host-ip">${this.escapeHtml(item.ip)}${port}${rdpUser}</div>
          <div class="host-env">${this.escapeHtml(env)}</div>
          <div class="host-tags">${tags}</div>
        </div>
        <div class="host-actions">
          <button class="action-btn copy" title="Copy IP" data-action="copy" data-id="${item.id}">📋</button>
          <button class="action-btn web" title="Open in browser" data-action="web" data-id="${item.id}">🌐</button>
          <button class="action-btn ssh" title="SSH" data-action="ssh" data-id="${item.id}">🔑</button>
          <button class="action-btn rdp" title="Copy RDP command" data-action="rdp" data-id="${item.id}">🖥️</button>
          ${this.settings.enableHealthProbe ? `<div class="probe-dot ${item.healthStatus || 'unknown'}" data-id="${item.id}" title="${this.getHealthTooltip(item)}"></div>` : ''}
          <button class="action-btn edit" title="Edit" data-action="edit" data-id="${item.id}">✏️</button>
          <button class="action-btn delete" title="Delete" data-action="delete" data-id="${item.id}">🗑️</button>
        </div>
      </div>
    `;
  }

  attachHostItemListeners(item) {
    const itemElement = document.querySelector(`[data-id="${item.id}"]`);
    if (!itemElement) return;

    // Action buttons
    itemElement.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleHostAction(action, item);
      });
    });

    // Click on host item to open default action (web)
    itemElement.addEventListener('click', () => {
      this.handleHostAction('web', item);
    });
  }

  handleHostAction(action, item) {
    switch (action) {
      case 'copy':
        let copyText = item.port ? `${item.ip}:${item.port}` : item.ip;
        if (item.rdpUser) {
          copyText += ` (RDP: ${item.rdpUser})`;
        }
        this.copyToClipboard(copyText);
        break;
      case 'web':
        this.openWeb(item);
        break;
      case 'ssh':
        this.openSSH(item);
        break;
      case 'rdp':
        this.openRDP(item);
        break;
      case 'edit':
        this.editHost(item);
        break;
      case 'delete':
        this.deleteHost(item);
        break;
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      // Show brief feedback
      const originalText = document.getElementById('searchInput').placeholder;
      document.getElementById('searchInput').placeholder = 'Copied!';
      setTimeout(() => {
        document.getElementById('searchInput').placeholder = originalText;
      }, 1000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  openWeb(item) {
    const port = item.port ? `:${item.port}` : '';
    const url = `http://${item.ip}${port}`;
    chrome.tabs.create({ url });
  }

  openSSH(item) {
    const user = this.settings.defaultSSHUser || 'admin';
    const port = item.port || this.settings.defaultSSHPort || 22;
    
    // Copy SSH command to clipboard
    const command = `ssh ${user}@${item.ip} -p ${port}`;
    this.copyToClipboard(command);
    
    // Show feedback
    this.showFeedback(`SSH command copied! Paste in terminal: ${command}`);
  }

  openRDP(item) {
    // Use host-specific RDP username or fall back to default
    const user = item.rdpUser || this.settings.defaultRDPUser || 'Administrator';
    const port = item.port || this.settings.defaultRDPPort || 3389;
    
    // Simply copy the RDP command to clipboard
    const command = `mstsc /v:${item.ip}:${port}`;
    this.copyToClipboard(command);
    
    // Show feedback with username info
    const userInfo = item.rdpUser ? ` (username: ${item.rdpUser})` : '';
    this.showFeedback(`RDP command copied! Paste in Command Prompt: ${command}${userInfo}`);
  }


  showFeedback(message) {
    const originalText = document.getElementById('searchInput').placeholder;
    document.getElementById('searchInput').placeholder = message;
    setTimeout(() => {
      document.getElementById('searchInput').placeholder = originalText;
    }, 4000);
  }

  getHealthTooltip(item) {
    if (!item.healthStatus) {
      return 'Health status: Not checked yet';
    }
    
    const status = item.healthStatus.charAt(0).toUpperCase() + item.healthStatus.slice(1);
    let tooltip = `Health status: ${status}`;
    
    if (item.lastHealthCheck) {
      const timeAgo = Math.round((Date.now() - item.lastHealthCheck) / 1000);
      tooltip += `\nLast checked: ${timeAgo}s ago`;
    }
    
    if (item.responseTime) {
      tooltip += `\nResponse time: ${item.responseTime}ms`;
    }
    
    if (item.healthMethod) {
      const method = item.healthMethod.replace('-', ' ').toUpperCase();
      tooltip += `\nMethod: ${method}`;
    }
    
    return tooltip;
  }

  async performHealthChecks() {
    if (!this.settings.enableHealthProbe) return;
    
    const allHosts = [];
    this.data.envs.forEach(env => {
      if (env.items) {
        env.items.forEach(item => {
          allHosts.push(item);
        });
      }
    });
    
    // Check health for each host
    for (const host of allHosts) {
      try {
        // Set status to checking
        host.healthStatus = 'checking';
        this.renderHostList();
        
        // Send message to background script for health check
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: 'healthProbe',
            ip: host.ip
          }, resolve);
        });
        
        if (response && response.success) {
          host.healthStatus = 'online';
          host.lastHealthCheck = Date.now();
          host.responseTime = response.responseTime;
        } else {
          host.healthStatus = 'offline';
          host.lastHealthCheck = Date.now();
        }
      } catch (error) {
        host.healthStatus = 'offline';
        host.lastHealthCheck = Date.now();
      }
    }
    
    // Save updated data and re-render
    await this.saveData();
    this.renderHostList();
  }


  showAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Host';
    document.getElementById('hostForm').reset();
    document.getElementById('hostForm').dataset.mode = 'add';
    this.showModal('hostModal');
    document.getElementById('hostName').focus();
  }

  editHost(item) {
    document.getElementById('modalTitle').textContent = 'Edit Host';
    document.getElementById('hostForm').dataset.mode = 'edit';
    document.getElementById('hostForm').dataset.itemId = item.id;
    
    // Populate form
    document.getElementById('hostName').value = item.name;
    document.getElementById('hostIP').value = item.ip;
    document.getElementById('hostPort').value = item.port || '';
    document.getElementById('hostRDPUser').value = item.rdpUser || '';
    document.getElementById('hostEnvironment').value = item.environment || 'default';
    document.getElementById('hostTags').value = item.tags ? item.tags.join(', ') : '';
    document.getElementById('hostNotes').value = item.notes || '';
    document.getElementById('hostPinned').checked = item.pinned || false;
    
    this.showModal('hostModal');
    document.getElementById('hostName').focus();
  }

  deleteHost(item) {
    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete "${item.name}" (${item.ip})?\n\nThis action cannot be undone.`);
    
    if (confirmed) {
      // Find and remove the item from any environment
      for (const env of this.data.envs) {
        const itemIndex = env.items.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          env.items.splice(itemIndex, 1);
          this.saveData();
          this.filterItems();
          this.renderHostList();
          this.showFeedback(`Deleted "${item.name}"`);
          break;
        }
      }
    }
  }

  saveHost() {
    const form = document.getElementById('hostForm');
    const mode = form.dataset.mode;
    
    const hostData = {
      name: document.getElementById('hostName').value.trim(),
      ip: document.getElementById('hostIP').value.trim(),
      port: document.getElementById('hostPort').value ? parseInt(document.getElementById('hostPort').value) : null,
      rdpUser: document.getElementById('hostRDPUser').value.trim() || null,
      environment: document.getElementById('hostEnvironment').value,
      tags: document.getElementById('hostTags').value.split(',').map(t => t.trim()).filter(t => t),
      notes: document.getElementById('hostNotes').value.trim(),
      pinned: document.getElementById('hostPinned').checked
    };

    if (!hostData.name || !hostData.ip) {
      alert('Name and IP address are required');
      return;
    }

    const targetEnv = this.data.envs.find(e => e.id === hostData.environment) || this.data.envs[0];
    
    if (mode === 'add') {
      hostData.id = this.generateId();
      targetEnv.items.push(hostData);
    } else {
      const itemId = form.dataset.itemId;
      
      // Find the item in any environment first
      let sourceEnv = null;
      let itemIndex = -1;
      for (const env of this.data.envs) {
        itemIndex = env.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
          sourceEnv = env;
          break;
        }
      }
      
      if (sourceEnv && itemIndex !== -1) {
        hostData.id = itemId;
        
        // If moving to a different environment, remove from source and add to target
        if (sourceEnv.id !== targetEnv.id) {
          sourceEnv.items.splice(itemIndex, 1);
          targetEnv.items.push(hostData);
        } else {
          // Same environment, just update
          sourceEnv.items[itemIndex] = hostData;
        }
      }
    }

    this.saveData();
    this.hideModal('hostModal');
    this.filterItems();
    this.renderHostList();
  }

  showSettingsModal() {
    // Populate settings form
    document.getElementById('enableHealthProbe').checked = this.settings.enableHealthProbe;
    document.getElementById('enableDarkMode').checked = this.settings.enableDarkMode;
    document.getElementById('defaultSSHUser').value = this.settings.defaultSSHUser;
    document.getElementById('defaultRDPUser').value = this.settings.defaultRDPUser;
    
    this.showModal('settingsModal');
  }

  saveSettingsForm() {
    this.settings.enableHealthProbe = document.getElementById('enableHealthProbe').checked;
    this.settings.enableDarkMode = document.getElementById('enableDarkMode').checked;
    this.settings.defaultSSHUser = document.getElementById('defaultSSHUser').value.trim() || 'admin';
    this.settings.defaultRDPUser = document.getElementById('defaultRDPUser').value.trim() || 'Administrator';
    
    this.saveSettings();
    this.applyDarkMode();
    this.hideModal('settingsModal');
    this.render(); // Re-render to update health probe display
  }

  exportData() {
    const dataStr = JSON.stringify(this.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-ip-manager-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importData() {
    document.getElementById('fileInput').click();
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.version && importedData.envs) {
          this.data = importedData;
          this.saveData();
          this.render();
          alert('Data imported successfully!');
        } else {
          alert('Invalid file format');
        }
      } catch (error) {
        alert('Error parsing file: ' + error.message);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addNewEnvironment() {
    const envName = prompt('Enter environment name (e.g., Lab-A, Lab-B, Client-X):');
    if (envName && envName.trim()) {
      const newEnv = {
        id: this.generateId(),
        name: envName.trim(),
        items: []
      };
      this.data.envs.push(newEnv);
      this.saveData();
      this.renderEnvironmentFilter();
      this.filterItems();
      this.renderHostList();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  applyDarkMode() {
    if (this.settings.enableDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new IPManager();
});
