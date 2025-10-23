#!/usr/bin/env python3
"""
Get very detailed console logs including ALL levels
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

viewer_url = 'http://localhost:5173/experiments/XNAT_E02216/scans/100/cornerstone'

chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL', 'performance': 'ALL'})

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
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

    time.sleep(6)

    print("Loading viewer...")
    driver.get(viewer_url)
    time.sleep(15)

    logs = driver.get_log('browser')

    print("\n" + "=" * 70)
    print("ALL CONSOLE LOGS (including DEBUG)")
    print("=" * 70 + "\n")

    for log in logs:
        level = log['level']
        msg = log['message']

        # Only show Cornerstone-related or error messages
        if any(kw in msg for kw in ['Cornerstone', 'viewport', 'render', 'image', 'stack', 'VOI', 'window', 'pixel', 'canvas', 'GPU']) or level in ['SEVERE', 'WARNING']:
            icon = "❌" if level == "SEVERE" else "⚠️" if level == "WARNING" else "ℹ️"

            # Extract clean message
            if '"' in msg:
                parts = msg.split('"')
                clean_msg = parts[-2] if len(parts) > 1 and parts[-2].strip() else msg
            else:
                clean_msg = msg.split(' ')[-1] if ' ' in msg else msg

            print(f"{icon} [{level}] {clean_msg}")

finally:
    driver.quit()
