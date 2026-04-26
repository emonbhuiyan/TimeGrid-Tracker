# TimeGrid Tracker

A Chrome extension built to track, calculate, and summarize your working hours straight from a Google Sheets timesheet. 

Instead of dealing with heavy OAuth2 setups or API keys, TimeGrid Tracker piggybacks on your browser's active Google session. It pulls the sheet data natively, caches it locally, and loads your hours instantly whenever you open the popup.

## Features

* **Weekly Breakdown:** Tracks a full 7-day week (Monday – Sunday) with exact daily hours.
* **Monthly & Yearly Totals:** Switch to the Monthly tab to see hours grouped by month, plus your total hours for the year.
* **Instant Load:** Data is saved to `chrome.storage.local`. The extension only makes a network request when you explicitly click "Sync".
* **Week Navigator:** Jump between weeks instantly using the arrow keys or the dropdown menu.
* **Zero Config Setup:** No Google Cloud Console setup required. Just paste your sheet link and tab name.

## How It Works

The extension uses Google's undocumented Visualization API endpoint (`/gviz/tq?tqx=out:csv`). Because you are already logged into Google in your browser, this endpoint securely returns your specific tab's data as a clean CSV without needing a public sheet or complex authentication.

## Installation

Since this is a custom tool, you can install it locally in Developer Mode.

1. Clone this repository or download the ZIP file and extract it.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on (top right corner).
4. Click **Load unpacked** (top left).
5. Select the folder containing the extension files (`manifest.json`, `popup.html`, etc.).

## Setup & Usage

1. Pin the extension to your Chrome toolbar and open it.
2. The Settings view will appear. Fill in:
   * **Google Sheet Link:** The full URL of your timesheet.
   * **Tab Name:** The exact name of the tab containing your data (e.g., `Timesheet`).
   * **Year:** The year you want to track (e.g., `2024`).
3. Click **Save & Sync**. 

The extension will fetch your data, generate your current week, and save the settings. You only need to hit "Sync" again when you update your hours in the Google Sheet.

## Required Sheet Structure

To calculate the dates accurately, the extension expects the Google Sheet to be formatted as a specific 12-month grid:

* **Rows:** Represent the days of the month (1 through 31).
* **Columns:** Represent the months (January through December).
* **Time Format:** Hours must be logged in an `HH:MM:SS` format (e.g., `4:30:00`).

## Tech Stack

* Vanilla JavaScript
* HTML / CSS
* Chrome Extensions API (Manifest V3)

## License

[MIT License](LICENSE)