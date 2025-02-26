// ==UserScript==
// @name         KPI Calculator
// @author       Michał Jeromin
// @namespace    http://tampermonkey.net/
// @version      1.4.1
// @description  Tracks KPI values and history in a web page overlay. Created by Michał Jeromin
// @match        *://*/*
// @downloadURL  https://github.com/Dzemorex/KPICalc/raw/refs/heads/main/KPICalculator.user.js
// @updateURL    https://github.com/Dzemorex/KPICalc/raw/refs/heads/main/KPICalculator.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const defaultValues = {
        salvTM: 0,
        salvSCR: 0,
        seon: 0,
        fraudRepo: 0,
        zendeskOpened: 0,
        zendeskClosed: 0,
        jiraClosed: 0,
        sarRepo: 0,
        rfiRepo: 0,
        amlOnboarding: 0,
        downtime: 0
    };

    const kpiFactors = {
        salvTM: 14,
        salvSCR: 7,
        seon: 7,
        fraudRepo: 21,
        zendeskOpened: 10,
        zendeskClosed: 10,
        jiraClosed: 21,
        sarRepo: 105,
        rfiRepo: 21,
        amlOnboarding: 5,
        downtime: 1
    };

    const kpiNeededInitial = 420;

    const topDoc = window.top.document;

    let counters = GM_getValue('counters', defaultValues);
    let history = GM_getValue('history', []);
    let isNightMode = GM_getValue('nightMode', false);
    let kpiNeeded = GM_getValue('kpiNeeded', kpiNeededInitial);
    let kpiValue = GM_getValue('kpiValue', 0);
    let isCalculatorVisible = GM_getValue('isCalculatorVisible', true);

    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Corbel:wght@400;600&display=swap');
        :root {
            --bg-color: #FFFFFF;
            --text-color: #242424;
            --border-color: #ECE9E4;
            --hover-color: #00C4B4;
            --box-bg: #ECE9E4;
            --button-bg: #00C4B4;
            --button-text: #FFFFFF;
        }
        .night-mode {
            --bg-color: #1A1A1A;
            --text-color: #FFFFFF;
            --border-color: #333333;
            --hover-color: #6B5B95;
            --box-bg: #333333;
            --button-bg: #6B5B95;
            --button-text: #FFFFFF;
        }
        #kpiCalculator {
            position: fixed;
            top: 100px;
            right: 10px;
            width: 320px;
            background: var(--bg-color);
            border-radius: 12px;
            padding: 15px;
            padding-top: 45px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            font-family: Corbel, sans-serif;
            color: var(--text-color);
            font-size: 14px;
        }
        #kpiCalculator .kpi-row,
        #kpiCalculator .button-row,
        #kpiCalculator .counter-container {
            background: var(--box-bg);
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
        }
        #kpiCalculator .kpi-row {
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #kpiCalculator .button-row {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        #kpiCalculator .kpi-display {
            font-size: 16px;
            color: var(--text-color);
            font-weight: 600;
            text-align: center;
            margin: 0;
            padding: 0;
            width: 100%;
        }
        #kpiCalculator .progress-bar {
            width: 100%;
            height: 20px;
            border-radius: 8px;
            background: var(--bg-color);
            overflow: hidden;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-top: 5px;
        }
        #kpiCalculator .progress {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
            border-radius: 8px;
            background: var(--hover-color);
        }
        #kpiCalculator .counter-item {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: space-between;
            margin-bottom: 1px;
        }
        #kpiCalculator .label-box,
        #kpiCalculator .value-box {
            padding: 8px;
            text-align: center;
            background: var(--bg-color);
            border-radius: 8px;
            color: var(--text-color);
            height: 30px;
            box-sizing: border-box;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            flex-grow: 1;
        }
        #kpiCalculator .label-box {
            min-width: 140px;
            flex-shrink: 0;
            line-height: 14px;
        }
        #kpiCalculator .value-box {
            min-width: 50px;
            flex-grow: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #kpiCalculator .value-input {
            width: 50px;
            height: 30px;
            padding: 0;
            margin: 0;
            border: none;
            background: var(--bg-color);
            text-align: center;
            color: var(--text-color);
            font-family: Corbel, sans-serif;
            font-size: 14px;
            box-sizing: border-box;
            border-radius: 8px;
        }
        #kpiCalculator .value-input:focus {
            outline: 2px solid var(--hover-color);
        }
        #kpiCalculator .arrows {
            display: flex;
            flex-direction: row;
            gap: 8px;
            justify-content: flex-end;
            align-items: center;
        }
        #kpiCalculator .arrow-btn {
            width: 30px;
            height: 30px;
            background: var(--button-bg);
            border: none;
            border-radius: 8px;
            font-size: 18px;
            text-align: center;
            line-height: 30px;
            padding: 0;
            color: var(--button-text);
            cursor: pointer;
            font-family: Corbel, sans-serif;
            box-sizing: border-box;
            transition: background 0.25s ease;
        }
        #kpiCalculator .arrow-btn:hover {
            background: var(--hover-color);
        }
        #kpiCalculator button {
            padding: 8px 16px;
            font-family: Corbel, sans-serif;
            background: var(--button-bg);
            border: none;
            color: var(--button-text);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.25s ease;
        }
        #kpiCalculator button:hover {
            background: var(--hover-color);
        }
        #kpiCalculator .night-mode-toggle {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 5px;
            margin-top: -5px;
            position: relative;
        }
        #kpiCalculator .switch {
            position: relative;
            width: 30px;
            height: 17px;
        }
        #kpiCalculator .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        #kpiCalculator .slider {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ECE9E4;
            transition: .4s;
            border-radius: 17px;
        }
        #kpiCalculator .night-mode .slider {
            background-color: #333333;
        }
        #kpiCalculator .slider:before {
            position: absolute;
            content: "${isNightMode ? '🌙' : '☀'}";
            height: 13px;
            width: 13px;
            left: 2px;
            bottom: 2px;
            background-color: var(--bg-color);
            transition: .4s;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        #kpiCalculator input:checked + .slider {
            background-color: var(--button-bg);
        }
        #kpiCalculator input:focus + .slider {
            box-shadow: 0 0 1px var(--hover-color);
        }
        #kpiCalculator input:checked + .slider:before {
            transform: translateX(13px);
            content: "${isNightMode ? '☀' : '🌙'}";
        }
        #kpiCalculator .creator {
            font-size: 12px;
            color: #D3D3D3;
            text-align: center;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            pointer-events: none;
        }
        #kpiCalculator .night-mode .creator {
            color: #D3D3D3;
        }
        #historyPopup {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1200px;
            max-height: 80vh;
            background: var(--bg-color);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 20000;
            overflow-y: auto;
            color: var(--text-color);
            font-family: Corbel, sans-serif;
            font-size: 14px;
        }
        #historyPopup h2 {
            margin-top: 0;
            font-weight: 600;
        }
        #historyPopup .button-row {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
            background: var(--box-bg);
            border-radius: 8px;
            padding: 10px;
        }
        #historyPopup button {
            padding: 8px 16px;
            font-family: Corbel, sans-serif;
            background: var(--button-bg);
            border: none;
            color: var(--button-text);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.25s ease;
        }
        #historyPopup button:hover {
            background: var(--hover-color);
        }
        #historyPopup table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        #historyPopup th {
            background: var(--box-bg);
            font-weight: 600;
            cursor: pointer;
            user-select: none;
        }
        #historyPopup th:hover {
            background: var(--hover-color);
        }
        #historyPopup th, #historyPopup td {
            padding: 8px;
            text-align: center;
            border-radius: 5px;
            color: var(--text-color);
        }
        #historyPopup tr:nth-child(even) {
            background: var(--box-bg);
        }
        #historyPopup .remove-btn {
            padding: 8px 16px;
            font-family: Corbel, sans-serif;
            background: var(--button-bg);
            border: none;
            color: var(--button-text);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 5px;
            cursor: pointer;
            transition: background 0.25s ease;
        }
        #historyPopup .remove-btn:hover {
            background: var(--hover-color);
        }
        #historyOverlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 15000;
        }
        #showCalculatorButton, #hideCalculatorButton {
            position: fixed;
            top: 100px;
            right: 10px;
            width: 60px;
            text-align: center;
            font-family: Corbel, sans-serif;
            background: var(--button-bg);
            border: none;
            color: var(--button-text);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            padding: 8px 12px;
            cursor: pointer;
            transition: background 0.25s ease;
            z-index: 11000;
        }
        #showCalculatorButton:hover, #hideCalculatorButton:hover {
            background: var(--hover-color);
        }
        #customPopupOverlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 30000;
            pointer-events: auto;
        }
        #customPopup {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            background: var(--bg-color);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            color: var(--text-color);
            font-family: Corbel, sans-serif;
            font-size: 14px;
            text-align: center;
            pointer-events: auto;
        }
        #customPopup .popup-message {
            margin-bottom: 20px;
            font-size: 16px;
            white-space: pre-wrap;
        }
        #customPopup .popup-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
        }
        #customPopup button {
            padding: 8px 16px;
            font-family: Corbel, sans-serif;
            background: var(--button-bg);
            border: none;
            color: var(--button-text);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.25s ease;
            pointer-events: auto;
        }
        #customPopup button:hover {
            background: var(--hover-color);
        }
        #uploadHistoryInput {
            display: none;
        }
        #dateResultPopup {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 1200px;
            max-height: 80vh;
            background: var(--bg-color);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 25000;
            overflow-y: auto;
            color: var(--text-color);
            font-family: Corbel, sans-serif;
            font-size: 14px;
        }
        #dateResultPopup h2 {
            margin-top: 0;
            font-weight: 600;
        }
        #dateResultPopup .button-row {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
            background: var(--box-bg);
            border-radius: 8px;
            padding: 10px;
        }
        #dateResultPopup table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        #dateResultPopup th, #dateResultPopup td {
            padding: 8px;
            text-align: center;
            border-radius: 5px;
            color: var(--text-color);
        }
        #dateResultPopup th {
            background: var(--box-bg);
            font-weight: 600;
        }
        #dateResultPopup tr:nth-child(even) {
            background: var(--box-bg);
        }
        #dateResultOverlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 20000;
        }
    `);

    const existingCalculator = topDoc.getElementById('kpiCalculator');
    if (existingCalculator) existingCalculator.remove();
    const existingShowButton = topDoc.getElementById('showCalculatorButton');
    if (existingShowButton) existingShowButton.remove();
    const existingHideButton = topDoc.getElementById('hideCalculatorButton');
    if (existingHideButton) existingHideButton.remove();
    const existingHistoryPopup = topDoc.getElementById('historyPopup');
    if (existingHistoryPopup) existingHistoryPopup.remove();
    const existingOverlay = topDoc.getElementById('historyOverlay');
    if (existingOverlay) existingOverlay.remove();
    const existingCustomPopupOverlay = topDoc.getElementById('customPopupOverlay');
    if (existingCustomPopupOverlay) existingCustomPopupOverlay.remove();
    const existingDateResultPopup = topDoc.getElementById('dateResultPopup');
    if (existingDateResultPopup) existingDateResultPopup.remove();
    const existingDateResultOverlay = topDoc.getElementById('dateResultOverlay');
    if (existingDateResultOverlay) existingDateResultOverlay.remove();

    const calculator = topDoc.createElement('div');
    calculator.id = 'kpiCalculator';
    if (isNightMode) calculator.classList.add('night-mode');
    calculator.style.display = isCalculatorVisible ? 'block' : 'none';

    calculator.innerHTML = `
        <div class="kpi-row">
            <div class="kpi-display" id="kpiNeeded">KPI needed: ${kpiNeeded}</div>
            <div class="progress-bar">
                <div class="progress" id="progressBar"></div>
            </div>
        </div>
        <div class="button-row">
            <button id="reset">Reset</button>
            <button id="save">Save</button>
            <button id="viewHistory">View History</button>
        </div>
        <div class="counter-container">
            <div class="counter-item">
                <div class="label-box">Salv(TM)</div>
                <input type="text" class="value-input" id="value-salvTM" value="${counters.salvTM}" data-var="salvTM">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="salvTM">▲</button>
                    <button class="arrow-btn decrease" data-var="salvTM">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Salv(SCR)</div>
                <input type="text" class="value-input" id="value-salvSCR" value="${counters.salvSCR}" data-var="salvSCR">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="salvSCR">▲</button>
                    <button class="arrow-btn decrease" data-var="salvSCR">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">SEON</div>
                <input type="text" class="value-input" id="value-seon" value="${counters.seon}" data-var="seon">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="seon">▲</button>
                    <button class="arrow-btn decrease" data-var="seon">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Fraud Repo</div>
                <input type="text" class="value-input" id="value-fraudRepo" value="${counters.fraudRepo}" data-var="fraudRepo">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="fraudRepo">▲</button>
                    <button class="arrow-btn decrease" data-var="fraudRepo">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Zendesk opened</div>
                <input type="text" class="value-input" id="value-zendeskOpened" value="${counters.zendeskOpened}" data-var="zendeskOpened">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="zendeskOpened">▲</button>
                    <button class="arrow-btn decrease" data-var="zendeskOpened">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Zendesk closed</div>
                <input type="text" class="value-input" id="value-zendeskClosed" value="${counters.zendeskClosed}" data-var="zendeskClosed">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="zendeskClosed">▲</button>
                    <button class="arrow-btn decrease" data-var="zendeskClosed">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Jira closed</div>
                <input type="text" class="value-input" id="value-jiraClosed" value="${counters.jiraClosed}" data-var="jiraClosed">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="jiraClosed">▲</button>
                    <button class="arrow-btn decrease" data-var="jiraClosed">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">SAR repo</div>
                <input type="text" class="value-input" id="value-sarRepo" value="${counters.sarRepo}" data-var="sarRepo">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="sarRepo">▲</button>
                    <button class="arrow-btn decrease" data-var="sarRepo">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">RFI repo</div>
                <input type="text" class="value-input" id="value-rfiRepo" value="${counters.rfiRepo}" data-var="rfiRepo">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="rfiRepo">▲</button>
                    <button class="arrow-btn decrease" data-var="rfiRepo">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">AML Onboarding</div>
                <input type="text" class="value-input" id="value-amlOnboarding" value="${counters.amlOnboarding}" data-var="amlOnboarding">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="amlOnboarding">▲</button>
                    <button class="arrow-btn decrease" data-var="amlOnboarding">▼</button>
                </div>
            </div>
            <div class="counter-item">
                <div class="label-box">Downtime</div>
                <input type="text" class="value-input" id="value-downtime" value="${counters.downtime}" data-var="downtime">
                <div class="arrows">
                    <button class="arrow-btn increase" data-var="downtime">▲</button>
                    <button class="arrow-btn decrease" data-var="downtime">▼</button>
                </div>
            </div>
        </div>
        <div class="night-mode-toggle">
            <div class="creator">Created by Michał Jeromin</div>
            <label class="switch"><input type="checkbox" id="nightModeToggle" ${isNightMode ? 'checked' : ''}><span class="slider"></span></label>
        </div>
    `;

    const showCalculatorButton = topDoc.createElement('button');
    showCalculatorButton.id = 'showCalculatorButton';
    showCalculatorButton.textContent = 'Show';
    if (isNightMode) showCalculatorButton.classList.add('night-mode');
    showCalculatorButton.style.display = isCalculatorVisible ? 'none' : 'block';

    const hideCalculatorButton = topDoc.createElement('button');
    hideCalculatorButton.id = 'hideCalculatorButton';
    hideCalculatorButton.textContent = 'Hide';
    if (isNightMode) hideCalculatorButton.classList.add('night-mode');
    hideCalculatorButton.style.display = isCalculatorVisible ? 'block' : 'none';

    const historyPopup = topDoc.createElement('div');
    historyPopup.id = 'historyPopup';
    if (isNightMode) historyPopup.classList.add('night-mode');

    historyPopup.innerHTML = `
        <h2>KPI History</h2>
        <div class="button-row">
            <button id="downloadHistoryPopup">Download History</button>
            <button id="uploadHistoryPopup">Upload History</button>
            <input type="file" id="uploadHistoryInput" accept=".csv" style="display: none;">
            <button id="clearHistoryPopup">Clear History</button>
            <button id="closeHistory">Close</button>
        </div>
        <table id="historyTablePopup">
            <thead>
                <tr>
                    <th data-sort="date">Date</th>
                    <th data-sort="salvTM">Salv(TM)</th>
                    <th data-sort="salvSCR">Salv(SCR)</th>
                    <th data-sort="seon">SEON</th>
                    <th data-sort="fraudRepo">Fraud Repo</th>
                    <th data-sort="zendeskOpened">Zendesk opened</th>
                    <th data-sort="zendeskClosed">Zendesk closed</th>
                    <th data-sort="jiraClosed">Jira closed</th>
                    <th data-sort="sarRepo">SAR repo</th>
                    <th data-sort="rfiRepo">RFI repo</th>
                    <th data-sort="amlOnboarding">AML Onboarding</th>
                    <th data-sort="downtime">Downtime</th>
                    <th data-sort="totalKPI">Total KPI</th>
                    <th data-sort="percentKPIDone">% of Total KPI Done</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const historyOverlay = topDoc.createElement('div');
    historyOverlay.id = 'historyOverlay';

    const dateResultPopup = topDoc.createElement('div');
    dateResultPopup.id = 'dateResultPopup';
    if (isNightMode) dateResultPopup.classList.add('night-mode');

    const dateResultOverlay = topDoc.createElement('div');
    dateResultOverlay.id = 'dateResultOverlay';

    topDoc.body.appendChild(calculator);
    topDoc.body.appendChild(showCalculatorButton);
    topDoc.body.appendChild(hideCalculatorButton);
    topDoc.body.appendChild(historyPopup);
    topDoc.body.appendChild(historyOverlay);
    topDoc.body.appendChild(dateResultPopup);
    topDoc.body.appendChild(dateResultOverlay);

    let sortDirection = {};
    let currentSortColumn = null;

    updateKPI();
    displayHistory(history);
    updateNightMode();

    topDoc.querySelectorAll('#kpiCalculator .arrow-btn.increase').forEach(button => {
        button.addEventListener('click', function() {
            modifyValue(this.dataset.var, 1);
        });
    });

    topDoc.querySelectorAll('#kpiCalculator .arrow-btn.decrease').forEach(button => {
        button.addEventListener('click', function() {
            modifyValue(this.dataset.var, -1);
        });
    });

    topDoc.querySelectorAll('#kpiCalculator .value-input').forEach(input => {
        input.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const variable = this.dataset.var;
                const newValue = parseInt(this.value) || 0;
                const oldValue = counters[variable] || 0;
                counters[variable] = newValue;
                const valueChange = newValue - oldValue;
                const kpiChange = valueChange * kpiFactors[variable];
                
                if (valueChange > 0) {
                    kpiNeeded = Math.max(0, kpiNeeded - kpiChange);
                    kpiValue += kpiChange;
                } else if (valueChange < 0) {
                    kpiValue = Math.max(0, kpiValue + kpiChange);
                    kpiNeeded = Math.min(kpiNeededInitial, Math.max(0, kpiNeededInitial - kpiValue));
                }

                GM_setValue('counters', counters);
                GM_setValue('kpiNeeded', kpiNeeded);
                GM_setValue('kpiValue', kpiValue);
                updateKPI();
                this.blur();
            }
        });
    });

    topDoc.getElementById('reset').addEventListener('click', newDay);
    topDoc.getElementById('save').addEventListener('click', saveData);
    topDoc.getElementById('viewHistory').addEventListener('click', toggleHistoryPopup);
    topDoc.getElementById('nightModeToggle').addEventListener('change', toggleNightMode);
    topDoc.getElementById('showCalculatorButton').addEventListener('click', showCalculator);
    topDoc.getElementById('hideCalculatorButton').addEventListener('click', hideCalculator);
    topDoc.getElementById('downloadHistoryPopup').addEventListener('click', downloadHistory);
    topDoc.getElementById('uploadHistoryPopup').addEventListener('click', () => topDoc.getElementById('uploadHistoryInput').click());
    topDoc.getElementById('uploadHistoryInput').addEventListener('change', uploadHistory);
    topDoc.getElementById('clearHistoryPopup').addEventListener('click', clearHistory);
    topDoc.getElementById('closeHistory').addEventListener('click', closeHistoryPopup);

    // Add sorting to history table headers
    topDoc.querySelectorAll('#historyTablePopup th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const column = this.dataset.sort;
            sortHistory(column);
        });
    });

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            counters = GM_getValue('counters', defaultValues);
            history = GM_getValue('history', []);
            isNightMode = GM_getValue('nightMode', false);
            kpiNeeded = GM_getValue('kpiNeeded', kpiNeededInitial);
            kpiValue = GM_getValue('kpiValue', 0);
            isCalculatorVisible = GM_getValue('isCalculatorVisible', true);

            updateDisplay();
            updateKPI();
            updateNightMode();
            displayHistory(history);
        }
    });

    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function addRemoveListeners() {
        topDoc.querySelectorAll('#historyPopup .remove-btn').forEach(button => {
            button.addEventListener('click', removeRow);
        });
        topDoc.querySelectorAll('#historyPopup .view-date-btn').forEach(button => {
            button.addEventListener('click', function() {
                const date = this.dataset.date;
                showDateResult(date);
            });
        });
    }

    function showCustomPopup(message, buttons = [{ text: 'OK', callback: () => {} }]) {
        const overlay = topDoc.getElementById('customPopupOverlay');
        const popup = topDoc.getElementById('customPopup');
        if (!overlay || !popup) {
            console.error('Custom popup elements not found');
            return;
        }

        popup.innerHTML = `
            <div class="popup-message">${message}</div>
            <div class="popup-buttons"></div>
        `;

        const buttonContainer = popup.querySelector('.popup-buttons');
        if (!buttonContainer) {
            console.error('Popup buttons container not found');
            return;
        }

        buttons.forEach((btn, index) => {
            const button = topDoc.createElement('button');
            button.textContent = btn.text;
            button.addEventListener('click', () => {
                btn.callback();
                hideCustomPopup();
            });
            if (index === 0) setTimeout(() => button.focus(), 0);
            buttonContainer.appendChild(button);
        });

        overlay.style.display = 'block';
    }

    function hideCustomPopup() {
        const overlay = topDoc.getElementById('customPopupOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        } else {
            console.error('Custom popup overlay not found during hide');
        }
    }

    function uploadHistory(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const csvContent = e.target.result;
            try {
                const lines = csvContent.split('\n').filter(line => line.trim() !== '');
                if (lines.length <= 1) {
                    showCustomPopup('The CSV file is empty or invalid.');
                    return;
                }

                const header = lines[0].split(';');
                const expectedHeader = ['Date', 'Salv(TM)', 'Salv(SCR)', 'SEON', 'Fraud Repo', 'Zendesk opened', 'Zendesk closed', 'Jira closed', 'SAR repo', 'RFI repo', 'AML Onboarding', 'Downtime', 'Total KPI', '% of Total KPI Done'];
                if (!header.every((val, idx) => val === expectedHeader[idx])) {
                    showCustomPopup('Invalid CSV format. Please upload a history.csv generated by this script.');
                    return;
                }

                const newHistory = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(';');
                    if (cols.length < expectedHeader.length) continue;

                    const entry = {
                        date: cols[0],
                        salvTM: parseInt(cols[1]) || 0,
                        salvSCR: parseInt(cols[2]) || 0,
                        seon: parseInt(cols[3]) || 0,
                        fraudRepo: parseInt(cols[4]) || 0,
                        zendeskOpened: parseInt(cols[5]) || 0,
                        zendeskClosed: parseInt(cols[6]) || 0,
                        jiraClosed: parseInt(cols[7]) || 0,
                        sarRepo: parseInt(cols[8]) || 0,
                        rfiRepo: parseInt(cols[9]) || 0,
                        amlOnboarding: parseInt(cols[10]) || 0,
                        downtime: parseInt(cols[11]) || 0
                    };
                    newHistory.push(entry);
                }

                const existingDates = new Set(history.map(entry => entry.date));
                const mergedHistory = [...history, ...newHistory.filter(entry => !existingDates.has(entry.date))];
                history = mergedHistory;
                GM_setValue('history', history);
                displayHistory(history);
                showCustomPopup('History uploaded successfully!');
            } catch (error) {
                showCustomPopup('Error parsing CSV file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function modifyValue(variable, change) {
        const input = topDoc.getElementById(`value-${variable}`);
        const currentValue = parseInt(input.value) || 0;
        let newValue = Math.max(0, currentValue + change);
        const valueChange = newValue - currentValue;
        const kpiChange = valueChange * kpiFactors[variable];

        if (change > 0) {
            kpiNeeded = Math.max(0, kpiNeeded - kpiChange);
            kpiValue += kpiChange;
        } else if (change < 0) {
            kpiValue = Math.max(0, kpiValue + kpiChange);
            kpiNeeded = Math.min(kpiNeededInitial, Math.max(0, kpiNeededInitial - kpiValue));
        }

        counters[variable] = newValue;
        input.value = newValue;
        GM_setValue('counters', counters);
        GM_setValue('kpiNeeded', kpiNeeded);
        GM_setValue('kpiValue', kpiValue);
        updateKPI();
    }

    function updateDisplay() {
        for (let key in counters) {
            const element = topDoc.getElementById(`value-${key}`);
            if (element) element.value = counters[key] || 0;
        }
    }

    function updateKPI() {
        const kpiNeededDisplay = topDoc.getElementById('kpiNeeded');
        const progressBar = topDoc.getElementById('progressBar');
        if (!kpiNeededDisplay || !progressBar) return;

        if (kpiValue >= kpiNeededInitial) {
            const exceededBy = kpiValue - kpiNeededInitial;
            kpiNeededDisplay.textContent = `Exceeded by: ${exceededBy}`;
        } else {
            kpiNeededDisplay.textContent = `KPI needed: ${kpiNeeded}`;
        }

        const maxKpi = kpiNeededInitial;
        const progress = Math.min((kpiValue / maxKpi) * 100, 100);
        progressBar.style.width = `${progress}%`;
        if (progress <= 50) {
            progressBar.style.backgroundColor = `rgb(255, ${Math.floor(progress * 5.1)}, 0)`;
        } else {
            progressBar.style.backgroundColor = `rgb(${255 - Math.floor((progress - 50) * 5.1)}, 255, 0)`;
        }
    }

    function newDay() {
        const salvTMHistory = GM_getValue('salvTMHistory', []) || [];
        salvTMHistory.push({
            date: formatDate(new Date()),
            value: counters.salvTM
        });

        counters = { ...defaultValues };
        kpiNeeded = kpiNeededInitial;
        kpiValue = 0;
        GM_setValue('counters', counters);
        GM_setValue('salvTMHistory', salvTMHistory);
        GM_setValue('kpiNeeded', kpiNeeded);
        GM_setValue('kpiValue', kpiValue);
        updateDisplay();
        updateKPI();
    }

    function saveData() {
        const currentDate = formatDate(new Date());
        let history = GM_getValue('history', []);

        const existingEntry = history.find(entry => entry.date === currentDate);
        if (existingEntry) {
            showCustomPopup(
                `Data for ${currentDate} already exists.\nDo you want to override the existing record or create a new one?`,
                [
                    { text: 'Override', callback: () => {
                        history = history.filter(entry => entry.date !== currentDate);
                        saveEntry(history, currentDate);
                    }},
                    { text: 'Create New', callback: () => saveEntry(history, currentDate) }
                ]
            );
        } else {
            saveEntry(history, currentDate);
        }
    }

    function saveEntry(history, currentDate) {
        const kpiEntry = {};
        for (let key in counters) {
            kpiEntry[key] = (counters[key] || 0) * kpiFactors[key];
        }

        const entry = {
            date: currentDate,
            ...kpiEntry
        };
        history.push(entry);
        GM_setValue('history', history);
        showCustomPopup('Values saved to history!');
        displayHistory(history);
    }

    function toggleHistoryPopup() {
        const historyPopup = topDoc.getElementById('historyPopup');
        const historyOverlay = topDoc.getElementById('historyOverlay');
        if (historyPopup && historyOverlay) {
            if (historyPopup.style.display === 'none') {
                historyPopup.style.display = 'block';
                historyOverlay.style.display = 'block';
                history = GM_getValue('history', []);
                displayHistory(history);
            } else {
                historyPopup.style.display = 'none';
                historyOverlay.style.display = 'none';
            }
        }
    }

    function closeHistoryPopup() {
        const historyPopup = topDoc.getElementById('historyPopup');
        const historyOverlay = topDoc.getElementById('historyOverlay');
        if (historyPopup && historyOverlay) {
            historyPopup.style.display = 'none';
            historyOverlay.style.display = 'none';
        }
    }

    function sortHistory(column) {
        if (currentSortColumn === column) {
            sortDirection[column] = !sortDirection[column];
        } else {
            currentSortColumn = column;
            sortDirection[column] = true;
        }

        history.sort((a, b) => {
            let valA, valB;
            if (column === 'date') {
                valA = a.date;
                valB = b.date;
            } else if (column === 'totalKPI') {
                valA = Object.keys(kpiFactors).reduce((sum, key) => sum + (a[key] || 0), 0);
                valB = Object.keys(kpiFactors).reduce((sum, key) => sum + (b[key] || 0), 0);
            } else if (column === 'percentKPIDone') {
                valA = (Object.keys(kpiFactors).reduce((sum, key) => sum + (a[key] || 0), 0) / kpiNeededInitial) * 100;
                valB = (Object.keys(kpiFactors).reduce((sum, key) => sum + (b[key] || 0), 0) / kpiNeededInitial) * 100;
            } else {
                valA = a[column] || 0;
                valB = b[column] || 0;
            }

            if (sortDirection[column]) {
                return valA < valB ? -1 : valA > valB ? 1 : 0;
            } else {
                return valA > valB ? -1 : valA < valB ? 1 : 0;
            }
        });

        displayHistory(history);
    }

    function showDateResult(date) {
        const entry = history.find(e => e.date === date);
        if (!entry) {
            showCustomPopup('No data found for the selected date.');
            return;
        }

        const dateResultPopup = topDoc.getElementById('dateResultPopup');
        const dateResultOverlay = topDoc.getElementById('dateResultOverlay');
        if (!dateResultPopup || !dateResultOverlay) return;

        let totalKPI = 0;
        for (let key in kpiFactors) {
            totalKPI += entry[key] || 0;
        }
        const percentKPI = (totalKPI / kpiNeededInitial) * 100;

        dateResultPopup.innerHTML = `
            <h2>Results for ${date}</h2>
            <div class="button-row">
                <button id="generateReportBtn">Generate Report</button>
                <button id="closeDateResultBtn">Close</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Salv(TM)</th>
                        <th>Salv(SCR)</th>
                        <th>SEON</th>
                        <th>Fraud Repo</th>
                        <th>Zendesk opened</th>
                        <th>Zendesk closed</th>
                        <th>Jira closed</th>
                        <th>SAR repo</th>
                        <th>RFI repo</th>
                        <th>AML Onboarding</th>
                        <th>Downtime</th>
                        <th>Total KPI</th>
                        <th>% of Total KPI Done</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${entry.date}</td>
                        <td>${entry.salvTM || 0}</td>
                        <td>${entry.salvSCR || 0}</td>
                        <td>${entry.seon || 0}</td>
                        <td>${entry.fraudRepo || 0}</td>
                        <td>${entry.zendeskOpened || 0}</td>
                        <td>${entry.zendeskClosed || 0}</td>
                        <td>${entry.jiraClosed || 0}</td>
                        <td>${entry.sarRepo || 0}</td>
                        <td>${entry.rfiRepo || 0}</td>
                        <td>${entry.amlOnboarding || 0}</td>
                        <td>${entry.downtime || 0}</td>
                        <td>${totalKPI}</td>
                        <td>${percentKPI.toFixed(2)}%</td>
                    </tr>
                </tbody>
            </table>
        `;

        dateResultPopup.style.display = 'block';
        dateResultOverlay.style.display = 'block';

        topDoc.getElementById('generateReportBtn').addEventListener('click', () => generateReportForDate(date));
        topDoc.getElementById('closeDateResultBtn').addEventListener('click', closeDateResultPopup);
    }

    function generateReportForDate(date) {
        const entry = history.find(e => e.date === date);
        if (!entry) return;

        let totalKPI = 0;
        for (let key in kpiFactors) {
            totalKPI += entry[key] || 0;
        }
        const percentKPI = (totalKPI / kpiNeededInitial) * 100;

        const csvContent = `Date;Salv(TM);Salv(SCR);SEON;Fraud Repo;Zendesk opened;Zendesk closed;Jira closed;SAR repo;RFI repo;AML Onboarding;Downtime;Total KPI;% of Total KPI Done\n` +
            `${entry.date};${entry.salvTM || 0};${entry.salvSCR || 0};${entry.seon || 0};${entry.fraudRepo || 0};${entry.zendeskOpened || 0};${entry.zendeskClosed || 0};${entry.jiraClosed || 0};${entry.sarRepo || 0};${entry.rfiRepo || 0};${entry.amlOnboarding || 0};${entry.downtime || 0};${totalKPI};${percentKPI.toFixed(2)}%\n`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = topDoc.createElement('a');
        a.href = url;
        a.download = `history_${date}.csv`;
        topDoc.body.appendChild(a);
        a.click();
        topDoc.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    function closeDateResultPopup() {
        const dateResultPopup = topDoc.getElementById('dateResultPopup');
        const dateResultOverlay = topDoc.getElementById('dateResultOverlay');
        if (dateResultPopup && dateResultOverlay) {
            dateResultPopup.style.display = 'none';
            dateResultOverlay.style.display = 'none';
        }
    }

    function toggleNightMode() {
        isNightMode = !isNightMode;
        const calculator = topDoc.getElementById('kpiCalculator');
        const historyPopup = topDoc.getElementById('historyPopup');
        const customPopup = topDoc.getElementById('customPopup');
        const dateResultPopup = topDoc.getElementById('dateResultPopup');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (calculator) calculator.classList.toggle('night-mode');
        if (historyPopup) historyPopup.classList.toggle('night-mode');
        if (customPopup) customPopup.classList.toggle('night-mode');
        if (dateResultPopup) dateResultPopup.classList.toggle('night-mode');
        if (showButton) showButton.classList.toggle('night-mode');
        if (hideButton) hideButton.classList.toggle('night-mode');
        GM_setValue('nightMode', isNightMode);
        updateNightModeIcons();
    }

    function updateNightModeIcons() {
        const slider = topDoc.querySelector('#kpiCalculator .slider');
        if (slider) {
            const before = slider.querySelector(':before');
            if (before) {
                before.content = isNightMode ? '"🌙"' : '"☀"';
            }
        }
    }

    function updateNightMode() {
        const calculator = topDoc.getElementById('kpiCalculator');
        const historyPopup = topDoc.getElementById('historyPopup');
        const customPopup = topDoc.getElementById('customPopup');
        const dateResultPopup = topDoc.getElementById('dateResultPopup');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (isNightMode) {
            calculator?.classList.add('night-mode');
            historyPopup?.classList.add('night-mode');
            customPopup?.classList.add('night-mode');
            dateResultPopup?.classList.add('night-mode');
            showButton?.classList.add('night-mode');
            hideButton?.classList.add('night-mode');
        } else {
            calculator?.classList.remove('night-mode');
            historyPopup?.classList.remove('night-mode');
            customPopup?.classList.remove('night-mode');
            dateResultPopup?.classList.remove('night-mode');
            showButton?.classList.remove('night-mode');
            hideButton?.classList.remove('night-mode');
        }
        updateNightModeIcons();
    }

    function toggleCalculator() {
        isCalculatorVisible = !isCalculatorVisible;
        const calculator = topDoc.getElementById('kpiCalculator');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (calculator && showButton && hideButton) {
            calculator.style.display = isCalculatorVisible ? 'block' : 'none';
            showButton.style.display = isCalculatorVisible ? 'none' : 'block';
            hideButton.style.display = isCalculatorVisible ? 'block' : 'none';
            GM_setValue('isCalculatorVisible', isCalculatorVisible);
            if (isCalculatorVisible) updateKPI();
        }
    }

    function updateVisibility() {
        const calculator = topDoc.getElementById('kpiCalculator');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (calculator && showButton && hideButton) {
            calculator.style.display = isCalculatorVisible ? 'block' : 'none';
            showButton.style.display = isCalculatorVisible ? 'none' : 'block';
            hideButton.style.display = isCalculatorVisible ? 'block' : 'none';
        }
    }

    function showCalculator() {
        isCalculatorVisible = true;
        const calculator = topDoc.getElementById('kpiCalculator');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (calculator && showButton && hideButton) {
            calculator.style.display = 'block';
            showButton.style.display = 'none';
            hideButton.style.display = 'block';
            GM_setValue('isCalculatorVisible', isCalculatorVisible);
            updateKPI();
        }
    }

    function hideCalculator() {
        isCalculatorVisible = false;
        const calculator = topDoc.getElementById('kpiCalculator');
        const showButton = topDoc.getElementById('showCalculatorButton');
        const hideButton = topDoc.getElementById('hideCalculatorButton');
        if (calculator && showButton && hideButton) {
            calculator.style.display = 'none';
            showButton.style.display = 'block';
            hideButton.style.display = 'none';
            GM_setValue('isCalculatorVisible', isCalculatorVisible);
        }
    }

    function displayHistory(historyData) {
        const tbody = topDoc.querySelector('#historyTablePopup tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        historyData.forEach((entry, index) => {
            const row = topDoc.createElement('tr');
            let totalKPI = 0;

            for (let key in kpiFactors) {
                totalKPI += entry[key] || 0;
            }

            const percentKPI = (totalKPI / kpiNeededInitial) * 100;

            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.salvTM || 0}</td>
                <td>${entry.salvSCR || 0}</td>
                <td>${entry.seon || 0}</td>
                <td>${entry.fraudRepo || 0}</td>
                <td>${entry.zendeskOpened || 0}</td>
                <td>${entry.zendeskClosed || 0}</td>
                <td>${entry.jiraClosed || 0}</td>
                <td>${entry.sarRepo || 0}</td>
                <td>${entry.rfiRepo || 0}</td>
                <td>${entry.amlOnboarding || 0}</td>
                <td>${entry.downtime || 0}</td>
                <td>${totalKPI}</td>
                <td>${percentKPI.toFixed(2)}%</td>
                <td>
                    <button class="remove-btn" data-index="${index}">Remove</button>
                    <button class="view-date-btn" data-date="${entry.date}">View</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (historyData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="15" style="text-align: center; color: var(--text-color);">No data stored for this date</td></tr>';
        }

        addRemoveListeners();
    }

    function downloadHistory() {
        let csvContent = 'Date;Salv(TM);Salv(SCR);SEON;Fraud Repo;Zendesk opened;Zendesk closed;Jira closed;SAR repo;RFI repo;AML Onboarding;Downtime;Total KPI;% of Total KPI Done\n';

        history.forEach(entry => {
            let totalKPI = 0;
            for (let key in kpiFactors) {
                totalKPI += entry[key] || 0;
            }
            const percentKPI = (totalKPI / kpiNeededInitial) * 100;

            csvContent += `${entry.date};${entry.salvTM || 0};${entry.salvSCR || 0};${entry.seon || 0};${entry.fraudRepo || 0};${entry.zendeskOpened || 0};${entry.zendeskClosed || 0};${entry.jiraClosed || 0};${entry.sarRepo || 0};${entry.rfiRepo || 0};${entry.amlOnboarding || 0};${entry.downtime || 0};${totalKPI};${percentKPI.toFixed(2)}%\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = topDoc.createElement('a');
        a.href = url;
        a.download = 'history.csv';
        topDoc.body.appendChild(a);
        a.click();
        topDoc.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    function clearHistory() {
        showCustomPopup(
            'Are you sure you want to clear all history?\nThis action cannot be undone.',
            [
                { text: 'Yes', callback: () => {
                    history = [];
                    GM_setValue('history', history);
                    displayHistory(history);
                    showCustomPopup('History cleared successfully!');
                }},
                { text: 'No', callback: () => {} }
            ]
        );
    }

    function removeRow(event) {
        const index = parseInt(event.target.getAttribute('data-index'));
        if (index >= 0 && index < history.length) {
            showCustomPopup(
                `Are you sure you want to remove the entry from ${history[index].date}?\nThis action cannot be undone.`,
                [
                    { text: 'Yes', callback: () => {
                        history.splice(index, 1);
                        GM_setValue('history', history);
                        displayHistory(history);
                        showCustomPopup('Entry removed successfully!');
                    }},
                    { text: 'No', callback: () => {} }
                ]
            );
        }
    }
})();
