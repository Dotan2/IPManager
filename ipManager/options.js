// Options page script for Lab IP Manager
class OptionsManager {
  constructor() {
    this.settings = {
      enableHealthProbe: false,
      enableDarkMode: false,
      defaultSSHUser: 'admin',
      defaultRDPUser: 'Administrator',
      defaultSSHPort: 22,
      defaultRDPPort: 3389
    };
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadDataStats();
    this.setupEventListeners();
    this.populateForm();
    this.applyDarkMode();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['ipManagerSettings']);
      if (result.ipManagerSettings) {
        this.settings = { ...this.settings, ...result.ipManagerSettings };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ ipManagerSettings: this.settings });
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  async loadDataStats() {
    try {
      const result = await chrome.storage.local.get(['ipManagerData']);
      if (result.ipManagerData && result.ipManagerData.envs) {
        let totalHosts = 0;
        let totalTags = new Set();
        
        result.ipManagerData.envs.forEach(env => {
          totalHosts += env.items.length;
          env.items.forEach(item => {
            if (item.tags) {
              item.tags.forEach(tag => totalTags.add(tag));
            }
          });
        });
        
        document.getElementById('totalHosts').textContent = totalHosts;
        document.getElementById('totalEnvs').textContent = result.ipManagerData.envs.length;
        document.getElementById('totalTags').textContent = totalTags.size;
      }
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  }

  setupEventListeners() {
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.collectFormData();
      this.saveSettings();
    });

    // Reset settings
    document.getElementById('resetSettings').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings to defaults?')) {
        this.resetSettings();
      }
    });

    // Export data
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });

    // Import data
    document.getElementById('importData').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    // File input for import
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileImport(e);
    });

    // Clear data
    document.getElementById('clearData').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
        this.clearAllData();
      }
    });

    // Dark mode toggle
    document.getElementById('enableDarkMode').addEventListener('change', () => {
      this.collectFormData();
      this.applyDarkMode();
    });
  }

  populateForm() {
    document.getElementById('enableHealthProbe').checked = this.settings.enableHealthProbe;
    document.getElementById('enableDarkMode').checked = this.settings.enableDarkMode;
    document.getElementById('defaultSSHUser').value = this.settings.defaultSSHUser;
    document.getElementById('defaultRDPUser').value = this.settings.defaultRDPUser;
    document.getElementById('defaultSSHPort').value = this.settings.defaultSSHPort;
    document.getElementById('defaultRDPPort').value = this.settings.defaultRDPPort;
  }

  collectFormData() {
    this.settings.enableHealthProbe = document.getElementById('enableHealthProbe').checked;
    this.settings.enableDarkMode = document.getElementById('enableDarkMode').checked;
    this.settings.defaultSSHUser = document.getElementById('defaultSSHUser').value.trim() || 'admin';
    this.settings.defaultRDPUser = document.getElementById('defaultRDPUser').value.trim() || 'Administrator';
    this.settings.defaultSSHPort = parseInt(document.getElementById('defaultSSHPort').value) || 22;
    this.settings.defaultRDPPort = parseInt(document.getElementById('defaultRDPPort').value) || 3389;
  }

  resetSettings() {
    this.settings = {
      enableHealthProbe: false,
      enableDarkMode: false,
      defaultSSHUser: 'admin',
      defaultRDPUser: 'Administrator',
      defaultSSHPort: 22,
      defaultRDPPort: 3389
    };
    
    this.populateForm();
    this.saveSettings();
  }

  async exportData() {
    try {
      const result = await chrome.storage.local.get(['ipManagerData']);
      if (result.ipManagerData) {
        const dataStr = JSON.stringify(result.ipManagerData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-ip-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('Data exported successfully!', 'success');
      } else {
        this.showStatus('No data to export', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showStatus('Error exporting data: ' + error.message, 'error');
    }
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.version && importedData.envs) {
          await chrome.storage.local.set({ ipManagerData: importedData });
          this.showStatus('Data imported successfully!', 'success');
          await this.loadDataStats();
        } else {
          this.showStatus('Invalid file format', 'error');
        }
      } catch (error) {
        this.showStatus('Error parsing file: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  async clearAllData() {
    try {
      await chrome.storage.local.remove(['ipManagerData']);
      this.showStatus('All data cleared successfully!', 'success');
      await this.loadDataStats();
    } catch (error) {
      console.error('Clear data error:', error);
      this.showStatus('Error clearing data: ' + error.message, 'error');
    }
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  applyDarkMode() {
    if (this.settings.enableDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});
