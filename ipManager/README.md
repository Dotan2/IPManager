# Lab IP Manager

A professional Chrome extension for managing IP addresses, servers, and network infrastructure. Perfect for IT professionals, developers, sysadmins, and network engineers.

**Developer:** Dotan Israeli

## Features

- **Quick Access**: Manage servers, devices, and services with one-click SSH, RDP, and web access
- **Environment Management**: Organize hosts by environments (labs, production, development)
- **Health Monitoring**: Real-time connectivity status with visual indicators
- **Tag System**: Categorize hosts with custom tags (FW, DC, ESXi, etc.)
- **Dark Mode**: Professional dark theme for better visibility
- **Import/Export**: Backup and restore your data
- **Search & Filter**: Find hosts quickly by name, IP, or tags

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Adding Hosts
1. Click the extension icon to open the popup
2. Click the "+" button to add a new host
3. Fill in the host details:
   - **Name**: Descriptive name for the host
   - **IP Address**: IPv4 or IPv6 address
   - **Port**: Optional port number (important for RDP)
   - **RDP Username**: Optional username for RDP connections
   - **Environment**: Select or create an environment
   - **Tags**: Comma-separated tags for categorization
   - **Notes**: Additional information
   - **Pin**: Pin important hosts to the top

### Quick Actions
- **Copy IP**: Copy the IP address to clipboard
- **Open Web**: Open HTTP/HTTPS in browser
- **SSH**: Copy SSH command to clipboard
- **RDP**: Copy RDP command to clipboard
- **Edit**: Modify host details
- **Delete**: Remove host (with confirmation)

### Settings
Click the ⚙️ button to access settings:
- **Health Probe**: Enable/disable connectivity checking
- **Dark Mode**: Toggle dark theme
- **Default Users**: Set default SSH/RDP usernames
- **Default Ports**: Set default SSH/RDP ports

## Data Format

The extension stores data in the following JSON format:

```json
{
  "version": 1,
  "envs": [
    {
      "id": "default",
      "name": "Default",
      "items": [
        {
          "id": "unique-id",
          "name": "Host Name",
          "ip": "192.168.1.1",
          "port": 22,
          "rdpUser": "Administrator",
          "environment": "default",
          "tags": ["FW", "DMZ"],
          "notes": "Additional notes",
          "pinned": true,
          "healthStatus": "online",
          "lastHealthCheck": 1640995200000
        }
      ]
    }
  ]
}
```

## Permissions

- `storage`: Store host data locally
- `activeTab`: Access current tab for context menu
- `contextMenus`: Add right-click menu items
- `alarms`: Schedule health checks
- `notifications`: Show health status notifications
- `host_permissions`: Access web pages for health checks

## Privacy

- All data is stored locally in Chrome's storage
- No data is sent to external servers
- No tracking or analytics
- Health checks are performed locally

## Development

### Project Structure
```
├── manifest.json          # Extension manifest
├── popup.html             # Main popup interface
├── popup.css              # Popup styling
├── popup.js               # Main functionality
├── background.js          # Background script
├── content.js             # Content script
├── options.html           # Settings page
├── options.js             # Settings functionality
└── icons/                 # Extension icons
```

### Building
No build process required - this is a vanilla JavaScript extension.

## License

This project is open source and available under the MIT License.

## Support

For issues, feature requests, or questions, please open an issue in the repository.