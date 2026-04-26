let currentReferenceDate = new Date();
let currentYear = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['timesheetData', 'sheetUrl', 'sheetTab', 'sheetYear', 'lastSynced'], (data) => {
    if (data.timesheetData && data.sheetUrl && data.sheetTab) {
      currentYear = parseInt(data.sheetYear);
      document.getElementById('display-year').innerText = currentYear;
      
      showSummaryView();
      populateWeekDropdown(currentYear);
      renderWeeklySummary(data.timesheetData, currentYear, currentReferenceDate);
      renderMonthlySummary(data.timesheetData);
      
      document.getElementById('last-synced-text').innerText = `Synced: ${data.lastSynced}`;
      
      document.getElementById('sheetUrl').value = data.sheetUrl;
      document.getElementById('sheetTab').value = data.sheetTab;
      document.getElementById('sheetYear').value = data.sheetYear;
    } else {
      showSettingsView();
    }
  });

  // UI Flow Listeners
  document.getElementById('saveAndSyncBtn').addEventListener('click', triggerSync);
  document.getElementById('syncBtn').addEventListener('click', triggerSync);
  document.getElementById('editSettingsBtn').addEventListener('click', showSettingsView);

  // Tab Switching
  document.getElementById('tab-weekly').addEventListener('click', () => switchTab('weekly'));
  document.getElementById('tab-monthly').addEventListener('click', () => switchTab('monthly'));

  // Nav Listeners
  document.getElementById('prevWeek').addEventListener('click', () => {
    currentReferenceDate.setDate(currentReferenceDate.getDate() - 7);
    reloadSummaryFromCache();
  });

  document.getElementById('nextWeek').addEventListener('click', () => {
    currentReferenceDate.setDate(currentReferenceDate.getDate() + 7);
    reloadSummaryFromCache();
  });

  document.getElementById('week-dropdown').addEventListener('change', (e) => {
    const parts = e.target.value.split('-');
    currentReferenceDate = new Date(parts[0], parts[1] - 1, parts[2]);
    reloadSummaryFromCache();
  });
});

// --- View & Tab Controllers ---
function showSettingsView() {
  document.getElementById('settings-view').style.display = 'block';
  document.getElementById('summary-view').style.display = 'none';
}

function showSummaryView() {
  document.getElementById('settings-view').style.display = 'none';
  document.getElementById('summary-view').style.display = 'block';
}

function switchTab(tab) {
  document.getElementById('tab-weekly').classList.toggle('active', tab === 'weekly');
  document.getElementById('tab-monthly').classList.toggle('active', tab === 'monthly');
  
  document.getElementById('weekly-section').style.display = tab === 'weekly' ? 'block' : 'none';
  document.getElementById('monthly-section').style.display = tab === 'monthly' ? 'block' : 'none';
}

function updateStatus(msg) {
  const statusEl = document.getElementById('status-msg');
  if(statusEl) statusEl.innerText = msg;
}

// --- Sync Logic ---
async function triggerSync() {
  const url = document.getElementById('sheetUrl').value;
  const tab = document.getElementById('sheetTab').value;
  const year = document.getElementById('sheetYear').value;

  if (!url || !tab || !year) {
    updateStatus("All fields are required.");
    return;
  }

  updateStatus("Syncing with Google Sheets...");
  
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("Invalid URL format.");
    const sheetId = match[1];

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    
    const response = await fetch(exportUrl);
    if (!response.ok) throw new Error("Ensure you are logged in to Google.");
    
    const text = await response.text();
    
    const rawData = text.split('\n').map(row => {
      return row.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1'));
    });

    const now = new Date();
    const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    chrome.storage.local.set({ 
      sheetUrl: url, 
      sheetTab: tab, 
      sheetYear: year,
      timesheetData: rawData,
      lastSynced: timeString
    }, () => {
      currentReferenceDate = new Date(); 
      currentYear = parseInt(year);
      
      document.getElementById('last-synced-text').innerText = `Synced: ${timeString}`;
      document.getElementById('display-year').innerText = currentYear;
      
      showSummaryView();
      switchTab('weekly'); // Default to weekly on fresh sync
      populateWeekDropdown(currentYear);
      renderWeeklySummary(rawData, currentYear, currentReferenceDate);
      renderMonthlySummary(rawData);
    });

  } catch (err) {
    updateStatus(`Error: ${err.message}`);
  }
}

// --- Dropdown Logic ---
function populateWeekDropdown(year) {
  const dropdown = document.getElementById('week-dropdown');
  dropdown.innerHTML = '';
  
  let current = new Date(year, 0, 1);
  let dayOfWeek = current.getDay();
  let offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  current.setDate(current.getDate() + offsetToMonday);

  const formatOptions = { month: 'short', day: 'numeric' };

  for(let i = 0; i < 53; i++) {
    let startOfWeek = new Date(current);
    let endOfWeek = new Date(current);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    if (startOfWeek.getFullYear() > year) break;

    let label = `${startOfWeek.toLocaleDateString(undefined, formatOptions)} - ${endOfWeek.toLocaleDateString(undefined, formatOptions)}`;
    
    let option = document.createElement('option');
    option.value = getLocalYMD(startOfWeek);
    option.text = label;
    dropdown.appendChild(option);

    current.setDate(current.getDate() + 7);
  }
}

function getLocalYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// --- Rendering Logic ---
function reloadSummaryFromCache() {
  chrome.storage.local.get(['timesheetData'], (data) => {
    if (data.timesheetData) {
      renderWeeklySummary(data.timesheetData, currentYear, currentReferenceDate);
      // Monthly summary doesn't change on week nav, so no need to re-render it here
    }
  });
}

function renderWeeklySummary(data, year, refDate) {
  const dayOfWeek = refDate.getDay(); 
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  let monday = new Date(refDate);
  monday.setDate(refDate.getDate() + offsetToMonday);

  const dropdown = document.getElementById('week-dropdown');
  const mondayYMD = getLocalYMD(monday);
  
  if(dropdown.querySelector(`option[value="${mondayYMD}"]`)) {
    dropdown.value = mondayYMD;
  }

  let container = document.getElementById('days-container');
  container.innerHTML = '';
  let totalSeconds = 0;

  let dataStartRow = data.findIndex(row => row[0] && row[0].trim() === '1');
  if (dataStartRow === -1) dataStartRow = 2; 

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (let i = 0; i < 7; i++) { 
    let d = new Date(monday);
    d.setDate(monday.getDate() + i);
    
    let timeValue = "0:00:00";

    if (d.getFullYear() === year) {
      let dayOfMonth = d.getDate(); 
      let monthIndex = d.getMonth() + 1; 

      let targetRow = dataStartRow + (dayOfMonth - 1);

      if (data[targetRow] && data[targetRow][monthIndex]) {
        timeValue = data[targetRow][monthIndex].trim();
      }
      if (!timeValue || timeValue === "") timeValue = "0:00:00";
    }

    totalSeconds += timeToSeconds(timeValue);

    container.innerHTML += `
      <div class="data-row">
        <span class="data-label">${d.getDate()} ${dayNames[i]}</span>
        <span class="data-val">${timeValue}</span>
      </div>
    `;
  }

  document.getElementById('weekly-total').innerText = secondsToTime(totalSeconds);
}

function renderMonthlySummary(data) {
  let container = document.getElementById('months-container');
  container.innerHTML = '';
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let yearlyTotalSeconds = 0;

  let dataStartRow = data.findIndex(row => row[0] && row[0].trim() === '1');
  if (dataStartRow === -1) dataStartRow = 2;

  // Loop through 12 months (Columns 1 through 12)
  for (let m = 1; m <= 12; m++) {
    let monthlySeconds = 0;

    // Loop through 31 possible days in that month's column
    for (let d = 0; d < 31; d++) {
      let targetRow = dataStartRow + d;
      
      if (data[targetRow] && data[targetRow][m]) {
        let timeValue = data[targetRow][m].trim();
        if (timeValue !== "") {
          monthlySeconds += timeToSeconds(timeValue);
        }
      }
    }

    yearlyTotalSeconds += monthlySeconds;

    container.innerHTML += `
      <div class="data-row">
        <span class="data-label">${monthNames[m - 1]}</span>
        <span class="data-val">${secondsToTime(monthlySeconds)}</span>
      </div>
    `;
  }

  document.getElementById('yearly-total').innerText = secondsToTime(yearlyTotalSeconds);
}

// --- Utilities ---
function timeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return 0;
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return (h * 3600) + (m * 60) + s;
}

function secondsToTime(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`; 
}