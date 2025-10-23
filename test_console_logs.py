#!/usr/bin/env python3
"""
Get detailed console logs from the viewer
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

viewer_url = 'http://localhost:5173/experiments/XNAT_E00041/scans/2/cornerstone'

chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
    # Login
    driver.get('http://localhost:5173')
    time.sleep(2)

    inputs = driver.find_elements(By.TAG_NAME, 'input')
    inputs[1].send_keys('admin')
    inputs[2].send_keys('admin')

    buttons = driver.find_elements(By.TAG_NAME, 'button')
    for button in buttons:
        if 'Sign in' in button.text:
            button.click()
            break

    time.sleep(5)

    # Navigate to viewer
    print(f"Loading viewer: {viewer_url}\n")
    driver.get(viewer_url)
    time.sleep(25)

    # Get ALL console logs
    logs = driver.get_log('browser')

    print("=" * 70)
    print("ALL CONSOLE LOGS")
    print("=" * 70)

    for log in logs:
        level = log['level']
        msg = log['message']

        # Clean up the message
        if '"' in msg:
            parts = msg.split('"')
            if len(parts) >= 2:
                clean_msg = parts[-2] if parts[-2].strip() else msg
            else:
                clean_msg = msg
        else:
            clean_msg = msg

        icon = "❌" if level == "SEVERE" else "⚠️" if level == "WARNING" else "ℹ️"
        print(f"{icon} [{level}] {clean_msg}")

finally:
    driver.quit()
