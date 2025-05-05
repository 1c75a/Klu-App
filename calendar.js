// Calendar State Management for Klu Health Period Tracking
let calendarState = {
    currentDate: new Date(),
    periodDates: [], // Array of period start dates
    cycleLength: 28, // Default cycle length
    periodLength: 5, // Default period length
    lastPeriodStart: null, // Last period start date
    nextPeriodStart: null, // Next period start date
    fertileWindow: [], // Array of fertile window dates
    ovulationDate: null, // Ovulation date
    tempPeriodDates: [], // Temporary storage for period dates during editing
    tracking: false // Flag to indicate if user is currently tracking period
};

// Global variables to track cycle data
const userData = {
    cycleLength: 28, // Default cycle length (can be customized)
    periodLength: 5, // Default period length in days
    lastPeriodStartDate: null, // Will be set when tracking begins
    periodHistory: [], // Array to store period dates
    tracking: false, // Flag to indicate if user is currently tracking period
    fertileWindowLength: 6, // Default fertile window length
    ovulationDay: 14, // Default ovulation day (typically cycle length - 14)
};

// Initialize calendar functionality
function initCalendar() {
    // First, fix any issues with the period tracking button
    fixPeriodTrackingButton();
    
    // Load saved data from localStorage if available
    const savedState = localStorage.getItem('calendarState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            calendarState = parsed;
            
            // Convert date strings back to Date objects
            calendarState.currentDate = new Date(calendarState.currentDate);
            calendarState.lastPeriodStart = calendarState.lastPeriodStart ? new Date(calendarState.lastPeriodStart) : null;
            calendarState.nextPeriodStart = calendarState.nextPeriodStart ? new Date(calendarState.nextPeriodStart) : null;
            calendarState.periodDates = calendarState.periodDates.map(date => new Date(date));
            calendarState.fertileWindow = calendarState.fertileWindow.map(date => new Date(date));
            calendarState.ovulationDate = calendarState.ovulationDate ? new Date(calendarState.ovulationDate) : null;
            
            // Initialize temp period dates
            calendarState.tempPeriodDates = [...calendarState.periodDates];
        } catch (e) {
            console.error('Error parsing calendar state:', e);
            // If parsing fails, use default state
        }
    }

    // Set up calendar navigation
    setupCalendarNavigation();
    
    // Add action buttons
    addActionButtons();
    
    // Render initial calendar
    renderCalendar();
    
    // Update cycle overview
    updateCycleOverview();
    
    // Update prediction cards
    updatePredictionCards();
    
    // Ensure cards are in sync with calendar
    syncPredictionCardsWithCalendar();
    
    // Set up other event listeners
    setupEventListeners();
    
    // Schedule a delayed synchronization after everything else is loaded
    console.log("Scheduling delayed synchronization...");
    setTimeout(function() {
        console.log("Running delayed synchronization from initCalendar");
        if (window.fixSync) {
            window.fixSync();
        }
    }, 1500);
}

// Force initial synchronization to ensure everything is properly aligned from the start
function forceInitialSynchronization() {
    console.log("===== PERFORMING INITIAL FORCED SYNCHRONIZATION =====");
    
    // Force a complete calendar redraw
    renderCalendar();
    
    // Force prediction recalculation
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // Update cards directly
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Period card
    const periodCard = document.querySelector('.period-card .prediction-date');
    if (periodCard && predictedPeriodDates.length > 0) {
        const nextDate = predictedPeriodDates.sort((a, b) => a - b)[0];
        periodCard.textContent = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
    }
    
    // Fertile card
    const fertileCard = document.querySelector('.fertile-card .prediction-date');
    if (fertileCard && predictedFertileDates.length > 0) {
        const nextDate = predictedFertileDates.sort((a, b) => a - b)[0];
        fertileCard.textContent = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
    }
    
    // Ovulation card
    const ovulationCard = document.querySelector('.ovulation-card .prediction-date');
    if (ovulationCard && predictedOvulationDates.length > 0) {
        const nextDate = predictedOvulationDates.sort((a, b) => a - b)[0];
        ovulationCard.textContent = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
    }
    
    console.log("Initial synchronization complete - cards aligned with prediction dots");
}

// Fix period tracking button issues
function fixPeriodTrackingButton() {
    const periodTrackBtn = document.getElementById('periodTrackBtn');
    if (!periodTrackBtn) return;
    
    // Clear any existing click handlers by cloning and replacing the button
    const newBtn = periodTrackBtn.cloneNode(true);
    periodTrackBtn.parentNode.replaceChild(newBtn, periodTrackBtn);
    
    // Add our click event handler
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        togglePeriodTracking();
        return false;
    });
    
    // Make sure button styling is correct
    newBtn.classList.remove('disabled');
    newBtn.style.opacity = '1';
    newBtn.style.cursor = 'pointer';
    newBtn.style.pointerEvents = 'auto';
}

// Add action buttons to the calendar wrapper
function addActionButtons() {
    const calendarWrapper = document.querySelector('.calendar-wrapper');
    if (!calendarWrapper) return;
    
    // Check if action buttons already exist
    if (calendarWrapper.querySelector('.calendar-actions')) return;
    
    // Create action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.className = 'calendar-actions';
    
    // Add Save button
    const saveButton = document.createElement('button');
    saveButton.className = 'update-metric-btn';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', savePeriodChanges);
    
    // Add button to container
    actionButtons.appendChild(saveButton);
    
    // Add container after calendar dates
    calendarWrapper.appendChild(actionButtons);
}

// Save period changes
function savePeriodChanges() {
    console.log("========== SAVING PERIOD CHANGES ==========");
    
    // Update period dates with temporary changes
    // Create new Date objects to avoid reference issues
    calendarState.periodDates = calendarState.tempPeriodDates.map(date => new Date(date));
    
    // Update last period start
    if (calendarState.periodDates.length > 0) {
        // Sort all period dates chronologically
        calendarState.periodDates.sort((a, b) => a - b);
        
        // Get the current date
        const today = new Date();
        
        // Group period dates into consecutive sequences
        const consecutiveGroups = [];
        let currentGroup = [calendarState.periodDates[0]];
        
        for (let i = 1; i < calendarState.periodDates.length; i++) {
            const currentDate = calendarState.periodDates[i];
            const prevDate = calendarState.periodDates[i-1];
            
            // Check if current date is the day after previous date
            const dayDiff = Math.round((currentDate - prevDate) / (24 * 60 * 60 * 1000));
            
            if (dayDiff === 1) {
                // Consecutive day, add to current group
                currentGroup.push(currentDate);
            } else {
                // Not consecutive, start a new group
                if (currentGroup.length > 0) {
                    consecutiveGroups.push([...currentGroup]);
                }
                currentGroup = [currentDate];
            }
        }
        
        // Add the last group
        if (currentGroup.length > 0) {
            consecutiveGroups.push(currentGroup);
        }
        
        // Find the most recent group
        let mostRecentPeriodStart = null;
        let mostRecentGroup = null;
        
        // First, check for any group that starts this month
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        for (const group of consecutiveGroups) {
            const groupStart = group[0];
            // If this group starts in the current month or later, it's a candidate
            if ((groupStart.getMonth() === currentMonth && groupStart.getFullYear() === currentYear) || 
                (groupStart > today)) {
                mostRecentGroup = group;
                mostRecentPeriodStart = groupStart;
                break;
            }
        }
        
        // If we didn't find a group from this month, take the latest group
        if (!mostRecentPeriodStart && consecutiveGroups.length > 0) {
            mostRecentGroup = consecutiveGroups[consecutiveGroups.length - 1];
            mostRecentPeriodStart = mostRecentGroup[0];
        }
        
        // Update the last period start
        if (mostRecentPeriodStart) {
            calendarState.lastPeriodStart = new Date(mostRecentPeriodStart);
            console.log("Set last period start to:", calendarState.lastPeriodStart);
        } else {
            // If no consecutive days, just use the most recent date
            calendarState.lastPeriodStart = new Date(calendarState.periodDates[calendarState.periodDates.length - 1]);
            console.log("Fallback: Set last period start to most recent date:", calendarState.lastPeriodStart);
        }
    } else {
        calendarState.lastPeriodStart = null;
    }
    
    // Calculate next period start
    if (calendarState.lastPeriodStart) {
        calendarState.nextPeriodStart = new Date(calendarState.lastPeriodStart);
        calendarState.nextPeriodStart.setDate(calendarState.nextPeriodStart.getDate() + calendarState.cycleLength);
        console.log("Set next period start to:", calendarState.nextPeriodStart);
    } else {
        calendarState.nextPeriodStart = null;
    }
    
    // Calculate fertile window and ovulation
    calculateFertileWindow();
    
    // Save state
    saveCalendarState();
    
    // Force complete recalculation and synchronization
    console.log("Applying comprehensive synchronization after period changes saved");
    
    // 1. First update UI
    renderCalendar();
    updateCycleOverview();
    
    // 2. Force complete recalculation of prediction dots
    console.log("Forcing recalculation of all predictions after saving period changes");
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // 3. Use the fixSync function if available (preferred method)
    if (window.fixSync) {
        console.log("Using fixSync for comprehensive synchronization");
        window.fixSync();
    } else {
        // Fallback to update prediction cards and sync
        console.log("Using fallback synchronization");
        updatePredictionCards();
        syncPredictionCardsWithCalendar();
    }
    
    // Update the Done Tracking button state since changes are now saved
    updateDoneTrackingButtonState();

    // Ensure prediction cards are synced with calendar predictions
    updatePredictionCards();
    syncPredictionCardsWithCalendar();

    console.log("========== PERIOD CHANGES SAVED SUCCESSFULLY ==========");
    showToast('Period dates saved successfully');
}

// Save calendar state to localStorage
function saveCalendarState() {
    localStorage.setItem('calendarState', JSON.stringify(calendarState));
}

// Setup calendar navigation
function setupCalendarNavigation() {
    const prevBtn = document.querySelector('.calendar-nav.prev');
    const nextBtn = document.querySelector('.calendar-nav.next');
    
    if (prevBtn) {
        // Remove existing event listeners
        prevBtn.replaceWith(prevBtn.cloneNode(true));
        const newPrevBtn = document.querySelector('.calendar-nav.prev');
        
        newPrevBtn.addEventListener('click', () => {
            const currentMonth = calendarState.currentDate.getMonth();
            const currentYear = calendarState.currentDate.getFullYear();
            
            let newMonth = currentMonth - 1;
            let newYear = currentYear;
            
            if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            }
            
            calendarState.currentDate = new Date(newYear, newMonth, 1);
            renderCalendar();
            syncPredictionCardsWithCalendar();
        });
    }
    
    if (nextBtn) {
        // Remove existing event listeners
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        const newNextBtn = document.querySelector('.calendar-nav.next');
        
        newNextBtn.addEventListener('click', () => {
            const currentMonth = calendarState.currentDate.getMonth();
            const currentYear = calendarState.currentDate.getFullYear();
            
            let newMonth = currentMonth + 1;
            let newYear = currentYear;
            
            if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            }
            
            calendarState.currentDate = new Date(newYear, newMonth, 1);
            renderCalendar();
            syncPredictionCardsWithCalendar();
        });
    }
}

// Render calendar
function renderCalendar() {
    const calendarDates = document.querySelector('.calendar-dates');
    const calendarTitle = document.querySelector('.calendar-header h3');
    
    if (!calendarDates || !calendarTitle) return;
    
    // Update calendar title
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    calendarTitle.textContent = `${months[calendarState.currentDate.getMonth()]} ${calendarState.currentDate.getFullYear()}`;
    
    // Clear existing dates
    calendarDates.innerHTML = '';
    
    // Get first day of month and last day of month
    const firstDay = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth(), 1);
    const lastDay = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth() + 1, 0);
    
    // Get first day of week (0-6, where 0 is Sunday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Generate predicted period dates for future months if we have a last period start
    const predictedPeriodDates = getPredictedPeriodDates();
    
    // Generate predicted fertile window dates
    const predictedFertileDates = getPredictedFertileDates();
    
    // Generate predicted ovulation dates
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // Add days from previous month
    const prevMonthLastDay = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth(), 0).getDate();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const date = document.createElement('div');
        date.className = 'date inactive';
        date.textContent = prevMonthLastDay - firstDayOfWeek + i + 1;
        calendarDates.appendChild(date);
    }
    
    // Add days for current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = document.createElement('div');
        date.className = 'date';
        date.textContent = i;
        
        // Create date object for current day
        const currentDate = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth(), i);
        
        // Store date in dataset for easier access in event handlers
        date.dataset.date = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
        
        // Check if date is in period (using temp period dates)
        if (isDateInPeriod(currentDate, calendarState.tempPeriodDates)) {
            date.classList.add('period');
        }
        
        // Check if date is today
        const today = new Date();
        if (isSameDay(today, currentDate)) {
            date.classList.add('today');
            // Highlight today's date with a border
            date.style.border = '2px solid #ee6aa7';
        }
        
        // Always prioritize showing actual fertility data over predicted data
        
        // Check if date is in fertile window (actual data)
        const isActualFertileDay = isDateInFertileWindow(currentDate);
        if (isActualFertileDay) {
            date.classList.add('fertile');
        }
        
        // Check if date is ovulation day (actual data)
        const isActualOvulationDay = isOvulationDay(currentDate);
        if (isActualOvulationDay) {
            date.classList.add('ovulation');
        }
        
        // Only show predictions for future dates where we don't already have actual data
        const isCurrentOrFutureMonth = 
            (currentDate.getFullYear() > today.getFullYear()) || 
            (currentDate.getFullYear() === today.getFullYear() && 
             currentDate.getMonth() >= today.getMonth());
        
        if (isCurrentOrFutureMonth) {
            // Check if date is a predicted period start date
            if (
                isPredictedPeriodStartDate(currentDate, predictedPeriodDates) &&
                !date.classList.contains('period') &&
                !date.classList.contains('fertile') &&
                !date.classList.contains('ovulation')
            ) {
                date.classList.add('predicted-period');
                // Add a small circle indicator for predicted period start
                const indicator = document.createElement('div');
                indicator.className = 'predicted-dot';
                date.appendChild(indicator);
            }
            // Only add predicted fertile class if it's not already an actual fertile day
            if (!isActualFertileDay && isPredictedFertileDate(currentDate, predictedFertileDates)) {
                date.classList.add('predicted-fertile');
                // Add a small dot only if not already colored for ovulation or period
                if (!date.classList.contains('period') && !date.classList.contains('ovulation')) {
                    const indicator = document.createElement('div');
                    indicator.className = 'predicted-dot';
                    date.appendChild(indicator);
                }
            }
            // Only add predicted ovulation class if it's not already an actual ovulation day
            if (!isActualOvulationDay && isPredictedOvulationDate(currentDate, predictedOvulationDates)) {
                date.classList.add('predicted-ovulation');
                // Add a small dot only if not already colored for period or fertile
                if (!date.classList.contains('period') && !date.classList.contains('fertile')) {
                    const indicator = document.createElement('div');
                    indicator.className = 'predicted-dot';
                    date.appendChild(indicator);
                }
            }
        }
        
        // Add tracking mode class if needed
        if (calendarState.tracking) {
            date.classList.add('tracking-mode');
        }
        
        // Add click event for period tracking
        date.addEventListener('click', () => {
            if (calendarState.tracking) {
                togglePeriodDate(currentDate, date);
                // Ensure button state is immediately updated after a date is clicked
                updateDoneTrackingButtonState();
            } else {
                showDateInfo(currentDate);
            }
        });
        
        calendarDates.appendChild(date);
    }
    
    // Add days from next month
    const totalCells = 42; // 6 rows of 7 days
    const daysRendered = firstDayOfWeek + lastDay.getDate();
    if (daysRendered < totalCells) {
        for (let i = 1; i <= totalCells - daysRendered; i++) {
            const date = document.createElement('div');
            date.className = 'date inactive';
            date.textContent = i;
            calendarDates.appendChild(date);
        }
    }
}

// Check if a date is in period
function isDateInPeriod(date, periodDates = calendarState.periodDates) {
    return periodDates.some(periodDate => isSameDay(periodDate, date));
}

// Check if a date is in fertile window
function isDateInFertileWindow(date) {
    return calendarState.fertileWindow.some(fertileDate => 
        isSameDay(date, fertileDate)
    );
}

// Check if a date is ovulation day
function isOvulationDay(date) {
    return calendarState.ovulationDate && 
           isSameDay(date, calendarState.ovulationDate);
}

// Compare if two dates are the same day (ignoring time)
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
}

// Toggle period date
function togglePeriodDate(date, dateElement) {
    // Instead of working with period start dates and automatically extending,
    // we'll work with individual period days
    const existingIndex = calendarState.tempPeriodDates.findIndex(d => 
        isSameDay(d, date)
    );
    
    if (existingIndex !== -1) {
        // Remove period date
        calendarState.tempPeriodDates.splice(existingIndex, 1);
        if (dateElement) {
            dateElement.classList.remove('period');
        }
    } else {
        // Add period date
        calendarState.tempPeriodDates.push(new Date(date));
        // Sort period dates
        calendarState.tempPeriodDates.sort((a, b) => a - b);
        if (dateElement) {
            dateElement.classList.add('period');
        }
    }
    
    // Temporarily update last period start based on temp period dates
    if (calendarState.tempPeriodDates.length > 0) {
        // Sort to ensure we get the most recent period start
        const sortedDates = [...calendarState.tempPeriodDates].sort((a, b) => a - b);
        // The first date of the most recent consecutive period days is the period start
        // Find the most recent group of consecutive days
        const consecutiveDays = findConsecutivePeriodDays(sortedDates);
        
        // Store the original calendar state values
        const originalState = {
            lastPeriodStart: calendarState.lastPeriodStart ? new Date(calendarState.lastPeriodStart) : null,
            nextPeriodStart: calendarState.nextPeriodStart ? new Date(calendarState.nextPeriodStart) : null,
            fertileWindow: [...calendarState.fertileWindow],
            ovulationDate: calendarState.ovulationDate ? new Date(calendarState.ovulationDate) : null
        };
        
        if (consecutiveDays.length > 0) {
            // Temporarily update for visualization
            calendarState.lastPeriodStart = new Date(consecutiveDays[0]);
            
            // Calculate next period start
            calendarState.nextPeriodStart = new Date(calendarState.lastPeriodStart);
            calendarState.nextPeriodStart.setDate(calendarState.nextPeriodStart.getDate() + calendarState.cycleLength);
            
            // Update fertile window and ovulation temporarily
            calculateFertileWindow();
            
            // Re-render the calendar to show the updated visual indicators
            renderCalendar();
            
            // Force synchronization of prediction cards with calendar
            if (window.fixSync) {
                console.log("Period dates changed - forcing synchronization");
                window.fixSync();
            } else {
                // Fallback to update cards directly
                updatePredictionCards();
                syncPredictionCardsWithCalendar();
            }
            
            // Restore original values (they will be properly updated on save)
            calendarState.lastPeriodStart = originalState.lastPeriodStart;
            calendarState.nextPeriodStart = originalState.nextPeriodStart;
            calendarState.fertileWindow = originalState.fertileWindow;
            calendarState.ovulationDate = originalState.ovulationDate;
        } else {
            // No consecutive days found, just render the calendar with updated period dates
            renderCalendar();
            
            // Force synchronization of prediction cards
            if (window.fixSync) {
                console.log("Period dates changed - forcing synchronization");
                window.fixSync();
            } else {
                updatePredictionCards();
                syncPredictionCardsWithCalendar();
            }
        }
    } else {
        // No period dates selected, just render the calendar
        renderCalendar();
        
        // Force synchronization of prediction cards
        if (window.fixSync) {
            console.log("Period dates changed - forcing synchronization");
            window.fixSync();
        } else {
            updatePredictionCards();
            syncPredictionCardsWithCalendar();
        }
    }
    
    // Check if there are unsaved changes and update Done Tracking button state
    updateDoneTrackingButtonState();
}

// Update Done Tracking button state based on unsaved changes
function updateDoneTrackingButtonState() {
    const periodTrackBtn = document.getElementById('periodTrackBtn');
    
    if (!periodTrackBtn) return;
    
    if (periodTrackBtn.classList.contains('active')) {
        // Only disable the button if it's in "Done Tracking" mode and there are unsaved changes
        if (hasUnsavedPeriodChanges()) {
            periodTrackBtn.classList.add('disabled');
            // The following styles are redundant with our CSS class but kept for browsers that might not fully apply the class
            periodTrackBtn.style.opacity = '0.5';
            periodTrackBtn.style.cursor = 'not-allowed';
            periodTrackBtn.style.pointerEvents = 'none';
        } else {
            periodTrackBtn.classList.remove('disabled');
            periodTrackBtn.style.opacity = '1';
            periodTrackBtn.style.cursor = 'pointer';
            periodTrackBtn.style.pointerEvents = 'auto';
        }
    } else {
        // Always ensure the Track Period button is clickable when not in tracking mode
        periodTrackBtn.classList.remove('disabled');
        periodTrackBtn.style.opacity = '1';
        periodTrackBtn.style.cursor = 'pointer';
        periodTrackBtn.style.pointerEvents = 'auto';
    }
}

// Show information for a selected date
function showDateInfo(date) {
    // Get predicted fertile and ovulation dates
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // Check if this date is part of a period
    if (isDateInPeriod(date)) {
        // Find if this is part of a consecutive period group
        const consecutiveDays = findConsecutivePeriodDays(calendarState.periodDates);
        if (consecutiveDays.length > 0 && consecutiveDays.some(d => isSameDay(d, date))) {
            // Find which day of period this is
            const periodStart = consecutiveDays[0];
            const dayOfPeriod = Math.floor((date - periodStart) / (1000 * 60 * 60 * 24)) + 1;
            showToast(`Period day ${dayOfPeriod}`);
            return;
        } else {
            showToast('Period day');
            return;
        }
    }
    
    // Check if this date is ovulation day
    if (isOvulationDay(date)) {
        showToast('Ovulation day');
        return;
    }
    
    // Check if this date is in the fertile window
    if (isDateInFertileWindow(date)) {
        showToast('Fertile window');
        return;
    }
    
    // Check if this date is a predicted ovulation day
    if (isPredictedOvulationDate(date, predictedOvulationDates)) {
        showToast('Predicted ovulation day');
        return;
    }
    
    // Check if this date is in the predicted fertile window
    if (isPredictedFertileDate(date, predictedFertileDates)) {
        showToast('Predicted fertile day');
        return;
    }
    
    // Check if this date is a predicted period start
    const predictedPeriodDates = getPredictedPeriodDates();
    if (isPredictedPeriodStartDate(date, predictedPeriodDates)) {
        showToast('Predicted period start');
        return;
    }
    
    // Calculate cycle day
    if (calendarState.lastPeriodStart) {
        const daysSinceLastPeriod = Math.floor((date - calendarState.lastPeriodStart) / (1000 * 60 * 60 * 24));
        if (daysSinceLastPeriod >= 0) {
            const cycleDay = (daysSinceLastPeriod % calendarState.cycleLength) + 1;
            showToast(`Cycle day ${cycleDay}`);
            return;
        }
    }
    
    showToast('No cycle data available for this date');
}

// Calculate fertile window and ovulation date
function calculateFertileWindow() {
    if (!calendarState.lastPeriodStart) return;
    
    console.log("===== CALCULATING FERTILE WINDOW AND OVULATION =====");
    
    if (calendarState.nextPeriodStart) {
        console.log("Using next period start date:", calendarState.nextPeriodStart.toDateString());
        
        // Ovulation typically occurs 14 days before next period
        calendarState.ovulationDate = new Date(calendarState.nextPeriodStart);
        calendarState.ovulationDate.setDate(calendarState.ovulationDate.getDate() - 14);
        
        // Fertile window is typically 6 days (5 days before ovulation and the day of ovulation)
        calendarState.fertileWindow = [];
        for (let i = 5; i >= 0; i--) {
            const fertileDate = new Date(calendarState.ovulationDate);
            fertileDate.setDate(fertileDate.getDate() - i);
            calendarState.fertileWindow.push(fertileDate);
        }
    } else {
        // If nextPeriodStart is not available, calculate using our prediction functions
        console.log("No next period start date available. Using prediction functions.");
        
        // Use our dedicated prediction functions
        const predictedOvulation = getNextPredictedOvulation();
        if (predictedOvulation) {
            calendarState.ovulationDate = predictedOvulation;
            
            // Calculate fertile window based on predicted ovulation
            calendarState.fertileWindow = [];
            for (let i = 5; i >= 0; i--) {
                const fertileDate = new Date(predictedOvulation);
                fertileDate.setDate(fertileDate.getDate() - i);
                calendarState.fertileWindow.push(fertileDate);
            }
        }
    }
    
    console.log("Ovulation date set to:", calendarState.ovulationDate?.toDateString() || "Not set");
    console.log("Fertile window set to:", calendarState.fertileWindow.map(d => d.toDateString()));
    console.log("===== FERTILE WINDOW CALCULATION COMPLETE =====");
    
    // Update prediction cards
    updatePredictionCards();
}

// Update cycle overview
function updateCycleOverview() {
    if (!calendarState.lastPeriodStart) return;
    
    const today = new Date();
    
    // Calculate current cycle day (from 1st day of period)
    // Day 1 is the first day of period
    const daysSinceLastPeriod = Math.floor((today - calendarState.lastPeriodStart) / (1000 * 60 * 60 * 24));
    const currentCycleDay = (daysSinceLastPeriod % calendarState.cycleLength) + 1;
    
    // Calculate days until next period
    const daysUntilNextPeriod = calendarState.cycleLength - currentCycleDay + 1;
    
    // Update cycle day display
    const cycleDayElement = document.querySelector('.cycle-info h2');
    if (cycleDayElement) {
        cycleDayElement.textContent = `Cycle Day ${currentCycleDay}`;
    }
    
    // Update days left in cycle
    const daysLeftElement = document.querySelector('.progress-text .days-left');
    if (daysLeftElement) {
        daysLeftElement.textContent = daysUntilNextPeriod;
    }
    
    // Update cycle progress circle
    updateCycleProgressCircle(currentCycleDay);
    
    // Update cycle phase message
    updateCyclePhaseMessage(currentCycleDay);
    
    // Update fertility insights
    updateFertilityInsights(currentCycleDay);
}

// Update cycle progress circle
function updateCycleProgressCircle(currentDay) {
    const progressCircle = document.querySelector('.cycle-progress circle:nth-child(2)');
    if (!progressCircle) return;
    
    // Calculate percentage of cycle completed
    const percentage = (currentDay / calendarState.cycleLength) * 100;
    
    // Calculate stroke-dashoffset based on percentage
    // 339.292 is the circumference of the circle (2 * PI * r, where r=54)
    const circumference = 339.292;
    const offset = circumference - (percentage / 100) * circumference;
    
    // Update the stroke-dashoffset property
    progressCircle.style.strokeDashoffset = offset;
}

// Update cycle phase message
function updateCyclePhaseMessage(cycleDay) {
    const phaseElement = document.querySelector('.cycle-info p');
    if (!phaseElement) return;
    
    let phaseMessage = '';
    
    // Determine cycle phase based on cycle day
    if (cycleDay <= calendarState.periodLength) {
        phaseMessage = 'You are on your period';
    } else if (isOvulationDay(new Date())) {
        phaseMessage = 'Today is your ovulation day';
    } else if (calendarState.fertileWindow.some(date => isSameDay(date, new Date()))) {
        phaseMessage = 'You are in your fertile window';
    } else if (cycleDay > calendarState.cycleLength - 14) {
        phaseMessage = 'You are in your luteal phase';
    } else {
        phaseMessage = 'You are in your follicular phase';
    }
    
    phaseElement.textContent = phaseMessage;
}

// Update fertility insights card
function updateFertilityInsights(currentCycleDay) {
    // Get fertility insight card
    const fertilityCard = document.querySelector('.insight-card .fa-seedling')?.closest('.insight-card');
    if (!fertilityCard) return;
    
    // Get elements to update
    const titleElement = fertilityCard.querySelector('h3');
    const descriptionElement = fertilityCard.querySelector('p');
    const progressBar = fertilityCard.querySelector('div[style*="height:8px"]');
    const progressIndicator = progressBar?.querySelector('div');
    const statusElement = fertilityCard.querySelector('div[style*="font-size:0.85rem"]');
    
    // Check if the current day is in fertile window
    const isInFertileWindow = calendarState.fertileWindow.some(date => isSameDay(date, new Date()));
    
    // Check if the current day is ovulation day
    const isOvulationDay = calendarState.ovulationDate && isSameDay(calendarState.ovulationDate, new Date());
    
    // Get first day of fertile window
    const fertileWindowStart = calendarState.cycleLength - 14 - 5;
    const fertileWindowEnd = calendarState.cycleLength - 14;
    
    // Update content based on fertility status
    if (isOvulationDay) {
        if (titleElement) titleElement.textContent = 'Ovulation Day';
        if (descriptionElement) descriptionElement.textContent = 'Peak fertility today. This is when an egg is released and is viable for 24 hours.';
        if (progressIndicator) progressIndicator.style.width = '100%';
        if (statusElement) statusElement.textContent = 'Peak fertility day';
    } else if (isInFertileWindow) {
        // Find which day of the fertile window we're in
        const fertileDay = calendarState.fertileWindow.findIndex(date => isSameDay(date, new Date())) + 1;
        const totalFertileDays = calendarState.fertileWindow.length;
        
        if (titleElement) titleElement.textContent = 'Fertility Window';
        if (descriptionElement) descriptionElement.textContent = 'High chance of pregnancy today. Track your fertile days for better planning.';
        
        // Update progress bar - percentage through fertile window
        if (progressIndicator) {
            const percentage = (fertileDay / totalFertileDays) * 100;
            progressIndicator.style.width = `${percentage}%`;
        }
        
        if (statusElement) statusElement.textContent = `Day ${fertileDay} of ${totalFertileDays} in your fertile window`;
    } else if (currentCycleDay > fertileWindowEnd) {
        // After ovulation
        if (titleElement) titleElement.textContent = 'Post-Ovulation Phase';
        if (descriptionElement) descriptionElement.textContent = `You've passed your fertile window. Your next fertile window begins in about ${fertileWindowStart - currentCycleDay + calendarState.cycleLength} days.`;
        if (progressIndicator) progressIndicator.style.width = '0%';
        if (statusElement) statusElement.textContent = 'Low fertility period';
    } else if (currentCycleDay < fertileWindowStart) {
        // Before fertile window
        const daysUntilFertile = fertileWindowStart - currentCycleDay;
        if (titleElement) titleElement.textContent = 'Pre-Fertile Phase';
        if (descriptionElement) descriptionElement.textContent = `Your fertile window begins in ${daysUntilFertile} days. Prepare for your upcoming fertile period.`;
        if (progressIndicator) progressIndicator.style.width = '0%';
        if (statusElement) statusElement.textContent = `${daysUntilFertile} days until fertile window`;
    }
    
    // Update learn more button action if needed
    const learnMoreBtn = fertilityCard.querySelector('.update-metric-btn');
    if (learnMoreBtn) {
        learnMoreBtn.onclick = () => showArticle('fertility-window');
    }
}

// Update all prediction cards based on calendar data
function updatePredictionCards() {
    console.log("=========== UPDATING PREDICTION CARDS ===========");
    
    // 1. First clear all prediction cards to prevent stale data
    document.querySelectorAll('.prediction-card .prediction-date').forEach(element => {
        console.log(`Clearing card: ${element.closest('.prediction-card').className}`);
        element.textContent = "Calculating...";
    });
    
    // 2. Generate fresh prediction data for all types
    console.log("Generating fresh prediction data:");
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    console.log(`- Found ${predictedPeriodDates.length} predicted period dates`);
    console.log(`- Found ${predictedFertileDates.length} predicted fertile dates`);
    console.log(`- Found ${predictedOvulationDates.length} predicted ovulation dates`);
    
    if (predictedPeriodDates.length > 0) {
        console.log("Next period should be:", predictedPeriodDates.sort((a, b) => a - b)[0].toDateString());
    }
    
    if (predictedFertileDates.length > 0) {
        console.log("Next fertile should be:", predictedFertileDates.sort((a, b) => a - b)[0].toDateString());
    }
    
    if (predictedOvulationDates.length > 0) {
        console.log("Next ovulation should be:", predictedOvulationDates.sort((a, b) => a - b)[0].toDateString());
    }
    
    // 3. Update all cards individually
    console.log("Updating individual cards:");
    
    // Update Period Prediction Card
    console.log("Updating period card...");
    updatePeriodPredictionCard();
    
    // Update Fertility Prediction Card
    console.log("Updating fertility card...");
    updateFertilityPredictionCard();
    
    // Update Ovulation Prediction Card
    console.log("Updating ovulation card...");
    updateOvulationPredictionCard();
    
    // 4. Final verification
    console.log("Verifying card contents:");
    document.querySelectorAll('.prediction-card .prediction-date').forEach(element => {
        const cardType = element.closest('.prediction-card').className;
        console.log(`${cardType}: ${element.textContent}`);
    });
    
    console.log("=========== PREDICTION CARDS UPDATED ===========");
}

// Update Period Prediction Card
function updatePeriodPredictionCard() {
    // Get period prediction card (card with period icon class)
    const periodCard = document.querySelector('.period-card');
    if (!periodCard) return;
    
    // Get prediction date element
    const predictionDateElement = periodCard.querySelector('.prediction-date');
    if (!predictionDateElement) return;
    
    // Get predicted period dates
    const predictedPeriodDates = getPredictedPeriodDates();
    
    if (predictedPeriodDates.length > 0) {
        // Sort predicted dates to get the earliest one
        const sortedPeriodDates = [...predictedPeriodDates].sort((a, b) => a - b);
        const nextPeriodDate = sortedPeriodDates[0];
        
        // Format date for display (e.g., "Jun 15")
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[nextPeriodDate.getMonth()]} ${nextPeriodDate.getDate()}`;
        
        // Update the prediction date
        predictionDateElement.textContent = formattedDate;
        
        console.log("Next period date (predicted): ", formattedDate);
    } else if (calendarState.nextPeriodStart) {
        // Fall back to calculated next period if no predictions are available
        const nextPeriodDate = calendarState.nextPeriodStart;
        
        // Format date for display (e.g., "Jun 15")
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[nextPeriodDate.getMonth()]} ${nextPeriodDate.getDate()}`;
        
        // Update the prediction date
        predictionDateElement.textContent = formattedDate;
        
        console.log("Next period date (calculated): ", formattedDate);
    } else {
        // No period data available
        predictionDateElement.textContent = "Not available";
        console.log("No period prediction available");
    }
}

// Get next predicted fertile window start date (standalone function)
function getNextPredictedFertileStart() {
    if (!calendarState.lastPeriodStart) return null;
    
    const today = new Date();
    const lastPeriodStart = new Date(calendarState.lastPeriodStart);
    
    console.log("Calculating next fertile window start from last period:", lastPeriodStart);
    
    // Calculate days since last period start
    const daysSinceLastPeriod = Math.floor((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
    
    // Calculate how many complete cycles have passed
    const cyclesPassed = Math.floor(daysSinceLastPeriod / calendarState.cycleLength);
    
    // Get the day within the current cycle
    const dayOfCycle = daysSinceLastPeriod % calendarState.cycleLength;
    
    // Determine if we need to use the current cycle or the next one
    let nextCycleNum = cyclesPassed;
    const fertileStartDayOfCycle = calendarState.cycleLength - 19; // 5 days before ovulation
    
    if (dayOfCycle > fertileStartDayOfCycle) {
        // We're past the fertile window in this cycle, use next cycle
        nextCycleNum = cyclesPassed + 1;
        console.log("Current day of cycle:", dayOfCycle, "Past fertile window start, using next cycle");
    } else {
        console.log("Current day of cycle:", dayOfCycle, "Fertile window hasn't started yet or is ongoing");
    }
    
    // Calculate the next cycle's period start
    const nextCycleStart = new Date(lastPeriodStart);
    nextCycleStart.setDate(nextCycleStart.getDate() + (calendarState.cycleLength * nextCycleNum));
    
    // Calculate ovulation (14 days before next period)
    const ovulationDate = new Date(nextCycleStart);
    ovulationDate.setDate(ovulationDate.getDate() + (calendarState.cycleLength - 14));
    
    // Fertile window starts 5 days before ovulation
    const nextFertileStart = new Date(ovulationDate);
    nextFertileStart.setDate(nextFertileStart.getDate() - 5);
    
    console.log("Next fertile window starts:", nextFertileStart.toDateString());
    
    return nextFertileStart;
}

// Get next predicted ovulation date (standalone function)
function getNextPredictedOvulation() {
    if (!calendarState.lastPeriodStart) return null;
    
    const today = new Date();
    const lastPeriodStart = new Date(calendarState.lastPeriodStart);
    
    console.log("Calculating next ovulation from last period:", lastPeriodStart);
    
    // Calculate days since last period start
    const daysSinceLastPeriod = Math.floor((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
    
    // Calculate how many complete cycles have passed
    const cyclesPassed = Math.floor(daysSinceLastPeriod / calendarState.cycleLength);
    
    // Get the day within the current cycle
    const dayOfCycle = daysSinceLastPeriod % calendarState.cycleLength;
    
    // Determine if we need to use the current cycle or the next one
    let nextCycleNum = cyclesPassed;
    const ovulationDayOfCycle = calendarState.cycleLength - 14;
    
    if (dayOfCycle > ovulationDayOfCycle) {
        // We're past ovulation in this cycle, use next cycle
        nextCycleNum = cyclesPassed + 1;
        console.log("Current day of cycle:", dayOfCycle, "Past ovulation, using next cycle");
    } else {
        console.log("Current day of cycle:", dayOfCycle, "Ovulation hasn't happened yet or is today");
    }
    
    // Calculate the next cycle's period start
    const nextCycleStart = new Date(lastPeriodStart);
    nextCycleStart.setDate(nextCycleStart.getDate() + (calendarState.cycleLength * nextCycleNum));
    
    // Calculate ovulation (14 days before next period)
    const nextOvulation = new Date(nextCycleStart);
    nextOvulation.setDate(nextOvulation.getDate() + (calendarState.cycleLength - 14));
    
    console.log("Next ovulation date:", nextOvulation.toDateString());
    
    return nextOvulation;
}

// Update Fertility Prediction Card
function updateFertilityPredictionCard() {
    // Get fertility prediction card
    const fertilityCard = document.querySelector('.fertile-card');
    if (!fertilityCard) return;

    // Get prediction date element
    const predictionDateElement = fertilityCard.querySelector('.prediction-date');
    if (!predictionDateElement) return;

    console.log("==== UPDATING FERTILE CARD ====");

    // Use the predicted fertile dates that are shown on the calendar with dots
    const predictedFertileDates = getPredictedFertileDates();

    // Find the first predicted fertile date in the currently viewed month
    const viewedMonth = calendarState.currentDate.getMonth();
    const viewedYear = calendarState.currentDate.getFullYear();
    const fertileThisMonth = predictedFertileDates.find(d => d.getMonth() === viewedMonth && d.getFullYear() === viewedYear);

    if (fertileThisMonth) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[fertileThisMonth.getMonth()]} ${fertileThisMonth.getDate()}`;
        predictionDateElement.textContent = formattedDate;
        console.log("Next fertile window date (viewed month):", fertileThisMonth.toDateString());
        console.log("Displayed text on card:", formattedDate);
    } else if (predictedFertileDates.length > 0) {
        // Fallback to the next available future date
        const nextFertileDate = predictedFertileDates[0];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[nextFertileDate.getMonth()]} ${nextFertileDate.getDate()}`;
        predictionDateElement.textContent = formattedDate;
        console.log("Next fertile window date:", nextFertileDate.toDateString());
        console.log("Displayed text on card:", formattedDate);
    } else {
        predictionDateElement.textContent = "Not available";
        console.log("No fertile window prediction available");
    }

    console.log("==== FERTILE CARD UPDATED ====");
}

// Update Ovulation Prediction Card
function updateOvulationPredictionCard() {
    // Get ovulation prediction card
    const ovulationCard = document.querySelector('.ovulation-card');
    if (!ovulationCard) return;

    // Get prediction date element
    const predictionDateElement = ovulationCard.querySelector('.prediction-date');
    if (!predictionDateElement) return;

    console.log("==== UPDATING OVULATION CARD ====");

    // Use the predicted ovulation dates that are shown on the calendar with dots
    const predictedOvulationDates = getPredictedOvulationDates();

    // Find the first predicted ovulation date in the currently viewed month
    const viewedMonth = calendarState.currentDate.getMonth();
    const viewedYear = calendarState.currentDate.getFullYear();
    const ovulationThisMonth = predictedOvulationDates.find(d => d.getMonth() === viewedMonth && d.getFullYear() === viewedYear);

    if (ovulationThisMonth) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[ovulationThisMonth.getMonth()]} ${ovulationThisMonth.getDate()}`;
        predictionDateElement.textContent = formattedDate;
        console.log("Next ovulation date (viewed month):", ovulationThisMonth.toDateString());
        console.log("Displayed text on card:", formattedDate);
    } else if (predictedOvulationDates.length > 0) {
        // Fallback to the next available future date
        const nextOvulationDate = predictedOvulationDates[0];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedDate = `${months[nextOvulationDate.getMonth()]} ${nextOvulationDate.getDate()}`;
        predictionDateElement.textContent = formattedDate;
        console.log("Next ovulation date:", nextOvulationDate.toDateString());
        console.log("Displayed text on card:", formattedDate);
    } else {
        predictionDateElement.textContent = "Not available";
        console.log("No ovulation prediction available");
    }

    console.log("==== OVULATION CARD UPDATED ====");
}

// Show toast message
function showToast(message) {
    // Reuse existing toast or create a new one
    let toast = document.getElementById('symptomToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'symptomToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Set up additional event listeners
function setupEventListeners() {
    // Period track button is now handled by fixPeriodTrackingButton
    
    // Add event listeners to log cards
    const periodLogCard = document.querySelector('.log-card .fa-tint')?.closest('.log-card');
    if (periodLogCard) {
        periodLogCard.addEventListener('click', () => {
            showToast('Click on dates in the calendar to mark your period');
            document.querySelector('.calendar-mini')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Add event listener to symptom tracking card
    const symptomLogCard = document.querySelector('.log-card .fa-heart')?.closest('.log-card');
    if (symptomLogCard) {
        symptomLogCard.addEventListener('click', () => {
            openModal('symptomTrackerModal');
        });
    }
}

// Toggle period tracking mode
function togglePeriodTracking() {
    const periodTrackBtn = document.getElementById('periodTrackBtn');
    
    if (!periodTrackBtn) {
        console.error("Period tracking button not found");
        return;
    }
    
    console.log("Toggle Period Button clicked");
    
    // Simple direct toggle of tracking mode
    const wasActive = periodTrackBtn.classList.contains('active');
    
    if (wasActive) {
        // Exiting tracking mode
        periodTrackBtn.classList.remove('active');
        periodTrackBtn.innerHTML = '<i class="fas fa-plus"></i> Track Period';
        
        // Update tracking flag
        calendarState.tracking = false;
        
        // Get all date elements
        const dates = document.querySelectorAll('.calendar-dates .date:not(.inactive)');
        
        // Remove tracking mode class from all dates
        dates.forEach(date => {
            date.classList.remove('tracking-mode');
        });
        
        // Check if there are unsaved changes
        if (hasUnsavedPeriodChanges()) {
            // Save the changes
            savePeriodChanges();
        } else {
            // Just render the calendar to update the display
            renderCalendar();
        }
    } else {
        // Entering tracking mode
        periodTrackBtn.classList.add('active');
        periodTrackBtn.innerHTML = '<i class="fas fa-check"></i> Done Tracking';
        
        // Update tracking flag
        calendarState.tracking = true;
        
        // Get all date elements
        const dates = document.querySelectorAll('.calendar-dates .date:not(.inactive)');
        
        // Add tracking mode class to all dates
        dates.forEach(date => {
            date.classList.add('tracking-mode');
        });
        
        // Create the temp period dates array for editing
        calendarState.tempPeriodDates = [...calendarState.periodDates];
        
        // Show toast with instructions
        showToast('Tap on days to mark your period');
    }
    
    // Make sure the button is not disabled
    periodTrackBtn.classList.remove('disabled');
    periodTrackBtn.style.opacity = '1';
    periodTrackBtn.style.cursor = 'pointer';
    periodTrackBtn.style.pointerEvents = 'auto';
}

// Function to open any modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        
        // If opening the symptom tracker, set the current date
        if (modalId === 'symptomTrackerModal') {
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const currentDateElement = document.getElementById('currentDate');
            if (currentDateElement) {
                currentDateElement.textContent = today.toLocaleDateString('en-US', options);
            }
        }
    }
}

// Function to set custom cycle length
function setCycleLength(length) {
    console.log(`========== SETTING CYCLE LENGTH TO ${length} ==========`);
    
    if (length >= 21 && length <= 35) {
        calendarState.cycleLength = length;
        console.log(`Cycle length set to ${length} days`);
        
        // Recalculate next period start date
        if (calendarState.lastPeriodStart) {
            calendarState.nextPeriodStart = new Date(calendarState.lastPeriodStart);
            calendarState.nextPeriodStart.setDate(calendarState.nextPeriodStart.getDate() + calendarState.cycleLength);
            console.log("Recalculated next period start:", calendarState.nextPeriodStart);
            
            // Recalculate fertile window and ovulation
            calculateFertileWindow();
        }
        
        // Save state
        saveCalendarState();
        
        // Force complete recalculation and synchronization
        console.log("Forcing comprehensive synchronization after cycle length change");
        
        // First update UI
        renderCalendar();
        updateCycleOverview();
        
        // Force complete recalculation of prediction dots
        console.log("Forcing recalculation of all predictions");
        const predictedPeriodDates = getPredictedPeriodDates();
        const predictedFertileDates = getPredictedFertileDates();
        const predictedOvulationDates = getPredictedOvulationDates();
        
        // Use the fixSync function if available (preferred method)
        if (window.fixSync) {
            console.log("Using fixSync for comprehensive synchronization");
            window.fixSync();
        } else {
            // Fallback to update prediction cards and sync
            console.log("Using fallback synchronization");
            updatePredictionCards();
            syncPredictionCardsWithCalendar();
        }
        
        console.log(`========== CYCLE LENGTH UPDATED SUCCESSFULLY ==========`);
        return true;
    }
    
    console.error(`Invalid cycle length: ${length} (must be between 21-35)`);
    return false;
}

// Function to set custom period length
function setPeriodLength(length) {
    console.log(`========== SETTING PERIOD LENGTH TO ${length} ==========`);
    
    if (length >= 2 && length <= 10) {
        calendarState.periodLength = length;
        console.log(`Period length set to ${length} days`);
        
        // Save state
        saveCalendarState();
        
        // Force complete recalculation and synchronization
        console.log("Forcing comprehensive synchronization after period length change");
        
        // First update UI
        renderCalendar(); // Re-render to update period highlighting
        
        // Force complete recalculation of prediction dots
        console.log("Forcing recalculation of all predictions");
        const predictedPeriodDates = getPredictedPeriodDates();
        const predictedFertileDates = getPredictedFertileDates();
        const predictedOvulationDates = getPredictedOvulationDates();
        
        // Use the fixSync function if available (preferred method)
        if (window.fixSync) {
            console.log("Using fixSync for comprehensive synchronization");
            window.fixSync();
        } else {
            // Fallback to update prediction cards and sync
            console.log("Using fallback synchronization");
            updatePredictionCards();
            syncPredictionCardsWithCalendar();
        }
        
        console.log(`========== PERIOD LENGTH UPDATED SUCCESSFULLY ==========`);
        return true;
    }
    
    console.error(`Invalid period length: ${length} (must be between 2-10)`);
    return false;
}

// Function to manually add a historical period start date
function addHistoricalPeriod(date) {
    console.log("========== ADDING HISTORICAL PERIOD ==========");
    console.log("Adding historical period starting on:", date);
    
    if (!(date instanceof Date)) {
        console.error("Invalid date provided for historical period");
        return false;
    }
    
    // Add to period dates
    calendarState.periodDates.push(new Date(date));
    
    // Sort period dates
    calendarState.periodDates.sort((a, b) => a - b);
    
    // Update last period start
    calendarState.lastPeriodStart = calendarState.periodDates[calendarState.periodDates.length - 1];
    console.log("Set last period start to:", calendarState.lastPeriodStart);
    
    // Calculate next period start
    calendarState.nextPeriodStart = new Date(calendarState.lastPeriodStart);
    calendarState.nextPeriodStart.setDate(calendarState.nextPeriodStart.getDate() + calendarState.cycleLength);
    console.log("Set next period start to:", calendarState.nextPeriodStart);
    
    // Calculate fertile window and ovulation
    calculateFertileWindow();
    
    // Update temp period dates
    calendarState.tempPeriodDates = [...calendarState.periodDates];
    
    // Save state
    saveCalendarState();
    
    // Force complete recalculation and synchronization
    console.log("Applying comprehensive synchronization after adding historical period");
    
    // First update UI
    renderCalendar();
    updateCycleOverview();
    
    // Force complete recalculation of prediction dots
    console.log("Forcing recalculation of all predictions");
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // Use the fixSync function if available (preferred method)
    if (window.fixSync) {
        console.log("Using fixSync for comprehensive synchronization");
        window.fixSync();
    } else {
        // Fallback to update prediction cards and sync
        console.log("Using fallback synchronization");
        updatePredictionCards();
        syncPredictionCardsWithCalendar();
    }
    
    console.log("========== HISTORICAL PERIOD ADDED SUCCESSFULLY ==========");
    
    return true;
}

// Helper function to find the most recent group of consecutive period days
function findConsecutivePeriodDays(periodDates) {
    if (periodDates.length === 0) return [];
    
    // Sort dates in ascending order
    const sortedDates = [...periodDates].sort((a, b) => a - b);
    
    // Find groups of consecutive days
    const groups = [];
    let currentGroup = [sortedDates[0]];
    
    for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const prevDate = sortedDates[i-1];
        
        // Check if current date is the day after previous date
        const dayDiff = Math.round((currentDate - prevDate) / (24 * 60 * 60 * 1000));
        
        if (dayDiff === 1) {
            // Consecutive day, add to current group
            currentGroup.push(currentDate);
        } else {
            // Not consecutive, start a new group
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
            }
            currentGroup = [currentDate];
        }
    }
    
    // Add the last group
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    // Return the most recent group (last in the sorted array)
    return groups.length > 0 ? groups[groups.length - 1] : [];
}

// Get predicted period start dates for next few cycles
function getPredictedPeriodDates() {
    const predictedDates = [];
    if (!calendarState.lastPeriodStart) {
        return predictedDates;
    }
    const today = new Date();
    const lastPeriodStart = new Date(calendarState.lastPeriodStart);
    // Calculate days since last period start
    const daysSinceLastPeriod = Math.floor((today - lastPeriodStart) / (1000 * 60 * 60 * 24));
    // Calculate how many cycles have passed (including partial cycles)
    const cyclesPassed = Math.floor(daysSinceLastPeriod / calendarState.cycleLength);
    // Determine the most recent completed cycle's end date
    const lastCompletedCycleEnd = new Date(lastPeriodStart);
    lastCompletedCycleEnd.setDate(lastCompletedCycleEnd.getDate() + (calendarState.cycleLength * cyclesPassed));
    // Start predictions from the next cycle
    let nextCycleStart = new Date(lastPeriodStart);
    nextCycleStart.setDate(nextCycleStart.getDate() + (calendarState.cycleLength * (cyclesPassed + 1)));
    // Generate predictions for the next few cycles
    for (let i = 0; i < 3; i++) {
        // Calculate predicted period start for this cycle
        const predictedDate = new Date(nextCycleStart);
        predictedDate.setDate(predictedDate.getDate() + (calendarState.cycleLength * i));
        // Only include future dates
        if (predictedDate >= today) {
            predictedDates.push(new Date(predictedDate));
        }
    }
    // Filter out actual period dates to prevent overlap
    return predictedDates.filter(predictedDate =>
        !calendarState.periodDates.some(actualDate => isSameDay(predictedDate, actualDate))
    );
}

// Get predicted fertile window dates for next few cycles
function getPredictedFertileDates() {
    const predictedFertileDates = [];
    
    if (!calendarState.lastPeriodStart) {
        console.log("No last period start date, cannot calculate fertile predictions");
        return predictedFertileDates;
    }
    
    const today = new Date();
    console.log("RECALCULATING PREDICTED FERTILE DATES (dots on calendar)");
    console.log("Today:", today.toDateString());
    console.log("Last period start:", calendarState.lastPeriodStart.toDateString());
    
    // Calculate days since last period start
    const daysSinceLastPeriod = Math.floor((today - calendarState.lastPeriodStart) / (1000 * 60 * 60 * 24));
    console.log("Days since last period:", daysSinceLastPeriod);
    
    // Calculate how many cycles have passed (including partial cycles)
    const cyclesPassed = Math.floor(daysSinceLastPeriod / calendarState.cycleLength);
    console.log("Complete cycles passed:", cyclesPassed);
    
    // Get current cycle day (1-based)
    const currentCycleDay = (daysSinceLastPeriod % calendarState.cycleLength) + 1;
    console.log("Current cycle day:", currentCycleDay);
    
    // Start with the most recent completed cycle start
    const latestCycleStart = new Date(calendarState.lastPeriodStart);
    latestCycleStart.setDate(latestCycleStart.getDate() + (calendarState.cycleLength * cyclesPassed));
    console.log("Most recent cycle start:", latestCycleStart.toDateString());
    
    // Calculate the fertile window for the next 3 cycles
    for (let i = 0; i < 3; i++) {
        // Calculate cycle start
        const cycleStart = new Date(latestCycleStart);
        cycleStart.setDate(cycleStart.getDate() + (calendarState.cycleLength * i));
        console.log(`Cycle ${i+1} start: ${cycleStart.toDateString()}`);
        
        // Calculate fertile window (typically 5 days before ovulation plus ovulation day)
        // Ovulation is typically 14 days before the NEXT period starts
        const nextPeriodStart = new Date(cycleStart);
        nextPeriodStart.setDate(nextPeriodStart.getDate() + calendarState.cycleLength);
        console.log(`Cycle ${i+1} next period: ${nextPeriodStart.toDateString()}`);
        
        const ovulationDate = new Date(nextPeriodStart);
        ovulationDate.setDate(ovulationDate.getDate() - 14);
        console.log(`Cycle ${i+1} ovulation: ${ovulationDate.toDateString()}`);
        
        // Calculate each day of the fertile window (5 days before ovulation plus ovulation day)
        for (let j = 5; j >= 0; j--) {
            const fertileDate = new Date(ovulationDate);
            fertileDate.setDate(fertileDate.getDate() - j);
            console.log(`Cycle ${i+1} fertile day -${j}: ${fertileDate.toDateString()}`);
            
            // Only include future dates
            if (fertileDate > today) {
                predictedFertileDates.push(new Date(fertileDate));
                console.log(`Added predicted fertile date: ${fertileDate.toDateString()}`);
            } else {
                console.log(`Skipped past date: ${fertileDate.toDateString()}`);
            }
        }
    }
    
    console.log(`Total predicted fertile dates: ${predictedFertileDates.length}`);
    
    // Sort the dates
    predictedFertileDates.sort((a, b) => a - b);
    
    if (predictedFertileDates.length > 0) {
        console.log("Next predicted fertile day:", predictedFertileDates[0].toDateString());
    }
    
    return predictedFertileDates;
}

// Get predicted ovulation dates for next few cycles
function getPredictedOvulationDates() {
    const predictedOvulationDates = [];
    
    if (!calendarState.lastPeriodStart) {
        console.log("No last period start date, cannot calculate ovulation predictions");
        return predictedOvulationDates;
    }
    
    const today = new Date();
    console.log("RECALCULATING PREDICTED OVULATION DATES (dots on calendar)");
    console.log("Today:", today.toDateString());
    console.log("Last period start:", calendarState.lastPeriodStart.toDateString());
    
    // Calculate days since last period start
    const daysSinceLastPeriod = Math.floor((today - calendarState.lastPeriodStart) / (1000 * 60 * 60 * 24));
    console.log("Days since last period:", daysSinceLastPeriod);
    
    // Calculate how many cycles have passed (including partial cycles)
    const cyclesPassed = Math.floor(daysSinceLastPeriod / calendarState.cycleLength);
    console.log("Complete cycles passed:", cyclesPassed);
    
    // Get current cycle day (1-based)
    const currentCycleDay = (daysSinceLastPeriod % calendarState.cycleLength) + 1;
    console.log("Current cycle day:", currentCycleDay);
    
    // Start with the most recent completed cycle start
    const latestCycleStart = new Date(calendarState.lastPeriodStart);
    latestCycleStart.setDate(latestCycleStart.getDate() + (calendarState.cycleLength * cyclesPassed));
    console.log("Most recent cycle start:", latestCycleStart.toDateString());
    
    // Calculate the ovulation date for the next 3 cycles
    for (let i = 0; i < 3; i++) {
        // Calculate cycle start
        const cycleStart = new Date(latestCycleStart);
        cycleStart.setDate(cycleStart.getDate() + (calendarState.cycleLength * i));
        console.log(`Cycle ${i+1} start: ${cycleStart.toDateString()}`);
        
        // Calculate ovulation date (14 days before next period)
        const nextPeriodStart = new Date(cycleStart);
        nextPeriodStart.setDate(nextPeriodStart.getDate() + calendarState.cycleLength);
        
        const ovulationDate = new Date(nextPeriodStart);
        ovulationDate.setDate(ovulationDate.getDate() - 14);
        
        console.log(`Cycle ${i+1} ovulation date: ${ovulationDate.toDateString()}`);
        
        // Only include future dates
        if (ovulationDate > today) {
            predictedOvulationDates.push(new Date(ovulationDate));
            console.log(`Added predicted ovulation date: ${ovulationDate.toDateString()}`);
        } else {
            console.log(`Skipped past ovulation date: ${ovulationDate.toDateString()}`);
        }
    }
    
    console.log(`Total predicted ovulation dates: ${predictedOvulationDates.length}`);
    
    // Sort the dates
    predictedOvulationDates.sort((a, b) => a - b);
    
    if (predictedOvulationDates.length > 0) {
        console.log("Next predicted ovulation day:", predictedOvulationDates[0].toDateString());
    }
    
    return predictedOvulationDates;
}

// Check if a date is a predicted period start date
function isPredictedPeriodStartDate(date, predictedDates) {
    const today = new Date();
    
    // Only show predictions for future dates
    if (date <= today) {
        return false;
    }
    
    return predictedDates.some(predictedDate => 
        isSameDay(date, predictedDate)
    );
}

// Check if a date is a predicted fertile date
function isPredictedFertileDate(date, predictedFertileDates) {
    const today = new Date();
    
    // Only show predictions for future dates
    if (date <= today) {
        return false;
    }
    
    // Don't show predicted fertile indicators if this date is already in the actual fertile window
    if (isDateInFertileWindow(date)) {
        return false;
    }
    
    // Check if this date is in the predicted fertile dates array
    return predictedFertileDates.some(predictedDate => 
        isSameDay(date, predictedDate)
    );
}

// Check if a date is a predicted ovulation date
function isPredictedOvulationDate(date, predictedOvulationDates) {
    const today = new Date();
    
    // Only show predictions for future dates
    if (date <= today) {
        return false;
    }
    
    // Don't show predicted ovulation indicators if this date is already an actual ovulation day
    if (isOvulationDay(date)) {
        return false;
    }
    
    // Check if this date is in the predicted ovulation dates array
    return predictedOvulationDates.some(predictedDate => 
        isSameDay(date, predictedDate)
    );
}

// Helper function to check if there are unsaved period changes
function hasUnsavedPeriodChanges() {
    if (!calendarState.tempPeriodDates || !calendarState.periodDates) {
        return false;
    }
    
    // If lengths are different, there are clearly changes
    if (calendarState.tempPeriodDates.length !== calendarState.periodDates.length) {
        return true;
    }
    
    // Even if lengths are the same, we need to check if the actual dates match
    // Convert dates to strings for easier comparison
    const tempDatesStr = calendarState.tempPeriodDates.map(date => 
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    ).sort();
    
    const periodDatesStr = calendarState.periodDates.map(date => 
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    ).sort();
    
    // Compare each date
    for (let i = 0; i < tempDatesStr.length; i++) {
        if (tempDatesStr[i] !== periodDatesStr[i]) {
            return true;
        }
    }
    
    return false;
}

// Initialize calendar when DOM is loaded (only once)
document.addEventListener('DOMContentLoaded', initCalendar, { once: true });

// Force calendar initialization - this can be called from the console if needed
function forceCalendarInit() {
    console.log("Forcing calendar initialization");
    // Clear any existing event handlers
    const periodTrackBtn = document.getElementById('periodTrackBtn');
    if (periodTrackBtn) {
        const newBtn = periodTrackBtn.cloneNode(true);
        periodTrackBtn.parentNode.replaceChild(newBtn, periodTrackBtn);
    }
    
    // Reinitialize the calendar
    initCalendar();
    
    // Make sure the button works
    fixPeriodTrackingButton();
    
    // Show confirmation
    showToast('Calendar reinitialized');
}

// Add a window load event to fix any issues that might occur after DOMContentLoaded
window.addEventListener('load', function() {
    setTimeout(fixPeriodTrackingButton, 500); // Fix period tracking button after a delay
}, { once: true });

// Save period history from modal
function savePeriodHistory() {
    const periodStartDate = document.getElementById('periodStartDate').value;
    const cycleLength = parseInt(document.getElementById('cycleLength').value);
    const periodLength = parseInt(document.getElementById('periodLength').value);
    
    if (!periodStartDate) {
        showToast('Please select a period start date');
        return;
    }
    
    // Convert to Date object
    const startDate = new Date(periodStartDate);
    
    // Set in calendar state
    if (typeof calendarState !== 'undefined') {
        calendarState.cycleLength = cycleLength;
        calendarState.periodLength = periodLength;
        
        // Add period start date
        if (typeof addHistoricalPeriod === 'function') {
            addHistoricalPeriod(startDate);
            showToast('Period history saved successfully');
            closeModal('periodHistoryModal');
        } else {
            showToast('Error: Period tracking functions not available');
        }
    } else {
        showToast('Error: Calendar state not initialized');
    }
}

// Debug function to force update the cards with direct calculation
function debugFixPredictionCards() {
    console.log("==== FIXING PREDICTION CARDS ====");
    
    // First recalculate the calendar
    renderCalendar();
    
    // Then update the prediction data
    updatePredictionCards();
    
    // Finally force synchronization based on predicted dots
    syncPredictionCardsWithCalendar();
    
    // Check prediction indicators
    debugCheckPredictionIndicators();
    
    // Additional logging to understand the predictions
    console.log("Debug info for current cycle calculations:");
    
    // Check cycle day calculations
    const today = new Date();
    if (calendarState.lastPeriodStart) {
        const daysSinceLastPeriod = Math.floor((today - calendarState.lastPeriodStart) / (1000 * 60 * 60 * 24));
        const cycleDay = (daysSinceLastPeriod % calendarState.cycleLength) + 1;
        const dayOfCycle = daysSinceLastPeriod % calendarState.cycleLength;
        
        console.log(`Today is day ${cycleDay} of the current cycle`);
        console.log(`Days since last period: ${daysSinceLastPeriod}`);
        console.log(`Current cycle length: ${calendarState.cycleLength}`);
        
        // Check if we're past ovulation
        const ovulationDayOfCycle = calendarState.cycleLength - 14;
        if (dayOfCycle > ovulationDayOfCycle) {
            console.log(`Currently past ovulation day (day ${ovulationDayOfCycle+1} of cycle)`);
        } else if (dayOfCycle === ovulationDayOfCycle) {
            console.log(`Today is ovulation day (day ${ovulationDayOfCycle+1} of cycle)`);
        } else {
            console.log(`Ovulation day (day ${ovulationDayOfCycle+1}) has not yet occurred this cycle`);
        }
        
        // Check if we're in the fertile window
        const fertileStartDayOfCycle = calendarState.cycleLength - 19; // 5 days before ovulation
        if (dayOfCycle >= fertileStartDayOfCycle && dayOfCycle <= ovulationDayOfCycle) {
            console.log(`Currently in fertile window (days ${fertileStartDayOfCycle+1}-${ovulationDayOfCycle+1})`);
        } else if (dayOfCycle < fertileStartDayOfCycle) {
            console.log(`Fertile window has not yet started this cycle (starts on day ${fertileStartDayOfCycle+1})`);
        } else {
            console.log(`Fertile window has passed this cycle`);
        }
    } else {
        console.log("No last period start date found - can't calculate cycle day");
    }
    
    console.log("==== PREDICTION CARDS FIXED ====");
    
    // Show toast to confirm
    showToast("Prediction cards updated");
}

// Debug function to check which dates have prediction indicators
function debugCheckPredictionIndicators() {
    console.log("===== CHECKING PREDICTION INDICATORS (DOTS) =====");
    
    // Get all dates with predicted indicators
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    console.log("Predicted period dates (dots):", 
        predictedPeriodDates.map(d => d.toDateString()));
        
    console.log("Predicted fertile dates (dots):", 
        predictedFertileDates.map(d => d.toDateString()));
        
    console.log("Predicted ovulation dates (dots):", 
        predictedOvulationDates.map(d => d.toDateString()));
    
    // Check current month for prediction dots
    const currentMonth = calendarState.currentDate.getMonth();
    const currentYear = calendarState.currentDate.getFullYear();
    
    console.log(`Checking for prediction dots in current month (${currentMonth + 1}/${currentYear}):`);
    
    // Period dots in current month
    const periodDotsThisMonth = predictedPeriodDates.filter(d => 
        d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    console.log("- Period dots this month:", 
        periodDotsThisMonth.map(d => d.getDate()));
    
    // Fertile dots in current month  
    const fertileDotsThisMonth = predictedFertileDates.filter(d => 
        d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    console.log("- Fertile dots this month:", 
        fertileDotsThisMonth.map(d => d.getDate()));
    
    // Ovulation dots in current month
    const ovulationDotsThisMonth = predictedOvulationDates.filter(d => 
        d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    console.log("- Ovulation dots this month:", 
        ovulationDotsThisMonth.map(d => d.getDate()));
    
    // Check if card values match first predicted dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const periodCard = document.querySelector('.period-card .prediction-date');
    const fertileCard = document.querySelector('.fertile-card .prediction-date');
    const ovulationCard = document.querySelector('.ovulation-card .prediction-date');
    
    if (periodCard && predictedPeriodDates.length > 0) {
        const nextDate = predictedPeriodDates.sort((a, b) => a - b)[0];
        const cardText = periodCard.textContent;
        const expectedText = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        console.log(`Period card shows: ${cardText}, should show: ${expectedText}`);
    }
    
    if (fertileCard && predictedFertileDates.length > 0) {
        const nextDate = predictedFertileDates.sort((a, b) => a - b)[0];
        const cardText = fertileCard.textContent;
        const expectedText = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        console.log(`Fertile card shows: ${cardText}, should show: ${expectedText}`);
    }
    
    if (ovulationCard && predictedOvulationDates.length > 0) {
        const nextDate = predictedOvulationDates.sort((a, b) => a - b)[0];
        const cardText = ovulationCard.textContent;
        const expectedText = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        console.log(`Ovulation card shows: ${cardText}, should show: ${expectedText}`);
    }
    
    console.log("===== PREDICTION INDICATORS CHECK COMPLETE =====");
}

// Comprehensive synchronization fix for all prediction issues
function fixSynchronization() {
    console.log("===== STARTING COMPREHENSIVE SYNCHRONIZATION FIX =====");
    
    // 1. Force calendar rerender to ensure dots are correct
    console.log("Step 1: Rerendering calendar...");
    renderCalendar();
    
    // 2. Clear all cards to prevent stale data
    console.log("Step 2: Clearing all prediction cards...");
    document.querySelectorAll('.prediction-card .prediction-date').forEach(element => {
        element.textContent = "Recalculating...";
    });
    
    // 3. Force recalculation of all prediction dates (dots)
    console.log("Step 3: Recalculating all prediction dots...");
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    // 4. Update each card directly with the predicted dots data
    console.log("Step 4: Directly updating cards with prediction dot data...");
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                   
    // Period card
    const periodCard = document.querySelector('.period-card .prediction-date');
    if (periodCard && predictedPeriodDates.length > 0) {
        const sortedDates = [...predictedPeriodDates].sort((a, b) => a - b);
        const nextDate = sortedDates[0];
        const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        periodCard.textContent = formattedDate;
        console.log(`   Period card: Set to ${nextDate.toDateString()} (${formattedDate})`);
    } else if (periodCard) {
        periodCard.textContent = "Not available";
        console.log("   Period card: No prediction data available");
    }
    
    // Fertile card
    const fertileCard = document.querySelector('.fertile-card .prediction-date');
    if (fertileCard && predictedFertileDates.length > 0) {
        const sortedDates = [...predictedFertileDates].sort((a, b) => a - b);
        const nextDate = sortedDates[0];
        const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        fertileCard.textContent = formattedDate;
        console.log(`   Fertile card: Set to ${nextDate.toDateString()} (${formattedDate})`);
    } else if (fertileCard) {
        fertileCard.textContent = "Not available";
        console.log("   Fertile card: No prediction data available");
    }
    
    // Ovulation card
    const ovulationCard = document.querySelector('.ovulation-card .prediction-date');
    if (ovulationCard && predictedOvulationDates.length > 0) {
        const sortedDates = [...predictedOvulationDates].sort((a, b) => a - b);
        const nextDate = sortedDates[0];
        const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
        ovulationCard.textContent = formattedDate;
        console.log(`   Ovulation card: Set to ${nextDate.toDateString()} (${formattedDate})`);
    } else if (ovulationCard) {
        ovulationCard.textContent = "Not available";
        console.log("   Ovulation card: No prediction data available");
    }
    
    // 5. Verify all cards have been updated
    console.log("Step 5: Verifying all cards have been updated...");
    let allCardsUpdated = true;
    
    if (periodCard && predictedPeriodDates.length > 0) {
        const expectedText = `${months[predictedPeriodDates.sort((a, b) => a - b)[0].getMonth()]} ${predictedPeriodDates.sort((a, b) => a - b)[0].getDate()}`;
        if (periodCard.textContent !== expectedText) {
            console.log(`   ERROR: Period card text "${periodCard.textContent}" doesn't match expected "${expectedText}"`);
            allCardsUpdated = false;
        }
    }
    
    if (fertileCard && predictedFertileDates.length > 0) {
        const expectedText = `${months[predictedFertileDates.sort((a, b) => a - b)[0].getMonth()]} ${predictedFertileDates.sort((a, b) => a - b)[0].getDate()}`;
        if (fertileCard.textContent !== expectedText) {
            console.log(`   ERROR: Fertile card text "${fertileCard.textContent}" doesn't match expected "${expectedText}"`);
            allCardsUpdated = false;
        }
    }
    
    if (ovulationCard && predictedOvulationDates.length > 0) {
        const expectedText = `${months[predictedOvulationDates.sort((a, b) => a - b)[0].getMonth()]} ${predictedOvulationDates.sort((a, b) => a - b)[0].getDate()}`;
        if (ovulationCard.textContent !== expectedText) {
            console.log(`   ERROR: Ovulation card text "${ovulationCard.textContent}" doesn't match expected "${expectedText}"`);
            allCardsUpdated = false;
        }
    }
    
    // 6. Final result
    if (allCardsUpdated) {
        console.log("All cards successfully synchronized with prediction dots!");
        // showToast("All cards synchronized successfully");
    } else {
        console.log("Some cards failed to synchronize. Check console for details.");
        showToast("Synchronization issues detected");
    }
    
    console.log("===== SYNCHRONIZATION FIX COMPLETE =====");
}

// Add debug function to window object so it can be called from console
document.addEventListener('DOMContentLoaded', function() {
    // Add debug function to window object
    window.debugFixPredictionCards = debugFixPredictionCards;
    
    // Add force calendar init to window object
    window.forceCalendarInit = forceCalendarInit;
    
    // Add sync prediction cards function to window object
    window.syncPredictionCards = syncPredictionCardsWithCalendar;
    
    // Add check prediction indicators function to window object
    window.checkPredictions = debugCheckPredictionIndicators;
    
    // Add fix synchronization function to window object
    window.fixSync = function() {
        console.log("===== STARTING COMPREHENSIVE SYNCHRONIZATION FIX =====");
        // Make sure we're working with the current month
        const today = new Date();
        // calendarState.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        console.log("Setting calendar to current month:", today.toDateString());
        
        // 1. Force calendar rerender to ensure dots are correct for the current month
        console.log("Step 1: Rerendering calendar for current month...");
        renderCalendar();
        
        // 2. Clear all cards to prevent stale data
        console.log("Step 2: Clearing all prediction cards...");
        document.querySelectorAll('.prediction-card .prediction-date').forEach(element => {
            element.textContent = "Recalculating...";
        });
        
        // 3. Force recalculation of all prediction dates (dots)
        console.log("Step 3: Recalculating all prediction dots for current data...");
        const predictedPeriodDates = getPredictedPeriodDates();
        const predictedFertileDates = getPredictedFertileDates();
        const predictedOvulationDates = getPredictedOvulationDates();
        
        console.log("Current month predictions available:");
        console.log(`- Period predictions: ${predictedPeriodDates.length}`);
        console.log(`- Fertile predictions: ${predictedFertileDates.length}`);
        console.log(`- Ovulation predictions: ${predictedOvulationDates.length}`);
        
        if (predictedPeriodDates.length === 0) {
            console.warn("WARNING: No predicted period dates available!");
        }
        
        if (predictedFertileDates.length === 0) {
            console.warn("WARNING: No predicted fertile dates available!");
        }
        
        if (predictedOvulationDates.length === 0) {
            console.warn("WARNING: No predicted ovulation dates available!");
        }
        
        // 4. Update each card directly with the predicted dots data
        console.log("Step 4: Directly updating cards with prediction dot data...");
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                       
        // Period card
        const periodCard = document.querySelector('.period-card .prediction-date');
        if (periodCard && predictedPeriodDates.length > 0) {
            const sortedDates = [...predictedPeriodDates].sort((a, b) => a - b);
            const nextDate = sortedDates[0];
            const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
            periodCard.textContent = formattedDate;
            console.log(`   Period card: Set to ${nextDate.toDateString()} (${formattedDate})`);
        } else if (periodCard) {
            periodCard.textContent = "Not available";
            console.log("   Period card: No prediction data available");
        }
        
        // Fertile card
        const fertileCard = document.querySelector('.fertile-card .prediction-date');
        if (fertileCard && predictedFertileDates.length > 0) {
            const sortedDates = [...predictedFertileDates].sort((a, b) => a - b);
            const nextDate = sortedDates[0];
            const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
            fertileCard.textContent = formattedDate;
            console.log(`   Fertile card: Set to ${nextDate.toDateString()} (${formattedDate})`);
        } else if (fertileCard) {
            fertileCard.textContent = "Not available";
            console.log("   Fertile card: No prediction data available");
        }
        
        // Ovulation card
        const ovulationCard = document.querySelector('.ovulation-card .prediction-date');
        if (ovulationCard && predictedOvulationDates.length > 0) {
            const sortedDates = [...predictedOvulationDates].sort((a, b) => a - b);
            const nextDate = sortedDates[0];
            const formattedDate = `${months[nextDate.getMonth()]} ${nextDate.getDate()}`;
            ovulationCard.textContent = formattedDate;
            console.log(`   Ovulation card: Set to ${nextDate.toDateString()} (${formattedDate})`);
        } else if (ovulationCard) {
            ovulationCard.textContent = "Not available";
            console.log("   Ovulation card: No prediction data available");
        }
        
        // 5. Double check calculations and synchronization
        console.log("Step 5: Double checking predictions and cards...");
        
        // Force a second recalculation to ensure everything is synchronized
        const recheckedPeriodDates = getPredictedPeriodDates();
        const recheckedFertileDates = getPredictedFertileDates();
        const recheckedOvulationDates = getPredictedOvulationDates();
        
        // 6. Final verification
        console.log("Step 6: Verifying all cards have been updated...");
        let allCardsUpdated = true;
        
        if (periodCard && recheckedPeriodDates.length > 0) {
            const expectedText = `${months[recheckedPeriodDates.sort((a, b) => a - b)[0].getMonth()]} ${recheckedPeriodDates.sort((a, b) => a - b)[0].getDate()}`;
            if (periodCard.textContent !== expectedText) {
                console.log(`   ERROR: Period card text "${periodCard.textContent}" doesn't match expected "${expectedText}"`);
                allCardsUpdated = false;
            }
        }
        
        if (fertileCard && recheckedFertileDates.length > 0) {
            const expectedText = `${months[recheckedFertileDates.sort((a, b) => a - b)[0].getMonth()]} ${recheckedFertileDates.sort((a, b) => a - b)[0].getDate()}`;
            if (fertileCard.textContent !== expectedText) {
                console.log(`   ERROR: Fertile card text "${fertileCard.textContent}" doesn't match expected "${expectedText}"`);
                allCardsUpdated = false;
            }
        }
        
        if (ovulationCard && recheckedOvulationDates.length > 0) {
            const expectedText = `${months[recheckedOvulationDates.sort((a, b) => a - b)[0].getMonth()]} ${recheckedOvulationDates.sort((a, b) => a - b)[0].getDate()}`;
            if (ovulationCard.textContent !== expectedText) {
                console.log(`   ERROR: Ovulation card text "${ovulationCard.textContent}" doesn't match expected "${expectedText}"`);
                allCardsUpdated = false;
            }
        }
        
        // 7. Final result
        if (allCardsUpdated) {
            console.log("All cards successfully synchronized with prediction dots!");
            // showToast("All cards synchronized successfully");
        } else {
            console.log("Some cards failed to synchronize. Check console for details.");
            showToast("Synchronization issues detected");
        }
        
        console.log("===== SYNCHRONIZATION FIX COMPLETE =====");
    };
    
    console.log("Debug functions registered to window object.");
    console.log("Use window.debugFixPredictionCards() to force update prediction cards");
    console.log("Use window.forceCalendarInit() to reinitialize calendar");
    console.log("Use window.syncPredictionCards() to synchronize prediction cards with calendar");
    console.log("Use window.checkPredictions() to verify prediction indicators (dots)");
    console.log("Use window.fixSync() to perform comprehensive synchronization fix");
}, { once: true });

// Add window.load event to run fixSync automatically on page load
window.addEventListener('load', function() {
    setTimeout(function() {
        console.log("Auto-running fixSync after page load...");
        window.fixSync();
    }, 2000);
}, { once: true });

// Synchronize prediction cards with calendar data
function syncPredictionCardsWithCalendar() {
    console.log("=========== SYNCHRONIZING PREDICTION CARDS WITH CALENDAR ===========");
    
    // Force fresh calculation of prediction dots
    console.log("Forcing fresh calculation of predicted dots...");
    const predictedPeriodDates = getPredictedPeriodDates();
    const predictedFertileDates = getPredictedFertileDates();
    const predictedOvulationDates = getPredictedOvulationDates();
    
    console.log("Using predicted dots for cards:");
    if (predictedPeriodDates.length > 0) {
        console.log("- Next predicted period:", predictedPeriodDates.sort((a, b) => a - b)[0].toDateString());
    } else {
        console.log("- No predicted period dates available");
    }
    
    if (predictedFertileDates.length > 0) {
        console.log("- Next predicted fertile date:", predictedFertileDates.sort((a, b) => a - b)[0].toDateString());
    } else {
        console.log("- No predicted fertile dates available");
    }
    
    if (predictedOvulationDates.length > 0) {
        console.log("- Next predicted ovulation date:", predictedOvulationDates.sort((a, b) => a - b)[0].toDateString());
    } else {
        console.log("- No predicted ovulation dates available");
    }
    
    // Format dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Update Period Card with FORCED calculation
    console.log("Updating period card...");
    const periodCard = document.querySelector('.period-card .prediction-date');
    if (periodCard && predictedPeriodDates.length > 0) {
        const sortedPeriodDates = [...predictedPeriodDates].sort((a, b) => a - b);
        const nextPeriodDate = sortedPeriodDates[0];
        const formattedDate = `${months[nextPeriodDate.getMonth()]} ${nextPeriodDate.getDate()}`;
        periodCard.textContent = formattedDate;
        console.log(`Set period card text to "${formattedDate}" based on ${nextPeriodDate.toDateString()}`);
    } else if (periodCard) {
        periodCard.textContent = "Not available";
        console.log("No predicted period dates available, set card to 'Not available'");
    }
    
    // Update Fertile Card with FORCED calculation
    console.log("Updating fertile card...");
    const fertileCard = document.querySelector('.fertile-card .prediction-date');
    if (fertileCard && predictedFertileDates.length > 0) {
        const sortedFertileDates = [...predictedFertileDates].sort((a, b) => a - b);
        const nextFertileDate = sortedFertileDates[0];
        const formattedDate = `${months[nextFertileDate.getMonth()]} ${nextFertileDate.getDate()}`;
        fertileCard.textContent = formattedDate;
        console.log(`Set fertile card text to "${formattedDate}" based on ${nextFertileDate.toDateString()}`);
    } else if (fertileCard) {
        fertileCard.textContent = "Not available";
        console.log("No predicted fertile dates available, set card to 'Not available'");
    }
    
    // Update Ovulation Card with FORCED calculation
    console.log("Updating ovulation card...");
    const ovulationCard = document.querySelector('.ovulation-card .prediction-date');
    if (ovulationCard && predictedOvulationDates.length > 0) {
        const sortedOvulationDates = [...predictedOvulationDates].sort((a, b) => a - b);
        const nextOvulationDate = sortedOvulationDates[0];
        const formattedDate = `${months[nextOvulationDate.getMonth()]} ${nextOvulationDate.getDate()}`;
        ovulationCard.textContent = formattedDate;
        console.log(`Set ovulation card text to "${formattedDate}" based on ${nextOvulationDate.toDateString()}`);
    } else if (ovulationCard) {
        ovulationCard.textContent = "Not available";
        console.log("No predicted ovulation dates available, set card to 'Not available'");
    }
    
    // Verify all cards are properly set
    console.log("Verification of card content:");
    document.querySelectorAll('.prediction-card .prediction-date').forEach(element => {
        const cardName = element.closest('.prediction-card').className.split(' ')[0];
        console.log(`- ${cardName}: "${element.textContent}"`);
    });
    
    console.log("=========== PREDICTION CARDS SYNCHRONIZED ===========");
}

// Add additional window load event for final synchronization
window.addEventListener('load', function() {
    // Force synchronization after everything is loaded
    setTimeout(fixSynchronization, 1500);
}, { once: true });