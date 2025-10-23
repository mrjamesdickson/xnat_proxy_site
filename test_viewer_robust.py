#!/usr/bin/env python3
"""
Robust test with proper waits and error checking
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

viewer_url = 'http://localhost:5173/experiments/XNAT_E00041/scans/2/cornerstone'

print("=" * 70)
print("Robust Cornerstone Viewer Test")
print("=" * 70)

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
    print("\n[1] Loading app...")
    driver.get('http://localhost:5173')
    time.sleep(3)

    print("[2] Logging in...")
    inputs = driver.find_elements(By.TAG_NAME, 'input')
    inputs[1].clear()
    inputs[1].send_keys('admin')
    inputs[2].clear()
    inputs[2].send_keys('admin')

    buttons = driver.find_elements(By.TAG_NAME, 'button')
    for button in buttons:
        if 'Sign in' in button.text:
            button.click()
            print("   Clicked Sign in")
            break

    # Wait longer for authentication to settle
    print("   Waiting for authentication...")
    time.sleep(8)

    # Check authentication status
    page_text = driver.find_element(By.TAG_NAME, 'body').text
    if 'Sign in' in page_text:
        print("   ❌ Authentication failed")
        driver.save_screenshot('/tmp/auth_failed.png')
        exit(1)

    print("   ✓ Authenticated")

    # Now navigate to viewer
    print(f"\n[3] Loading viewer: {viewer_url}")
    driver.get(viewer_url)

    # Wait and monitor status
    for i in range(6):  # Check every 5 seconds for 30 seconds
        time.sleep(5)
        page_text = driver.find_element(By.TAG_NAME, 'body').text

        if 'Sign in' in page_text:
            print(f"   [{(i+1)*5}s] Redirected to login - session expired")
            break
        elif 'Loading volume' in page_text:
            print(f"   [{(i+1)*5}s] Status: Loading volume...")
        elif 'MPR Viewer' in page_text:
            if 'Volume loaded' in page_text or 'Ready' in page_text:
                print(f"   [{(i+1)*5}s] Status: Volume loaded!")
                break
            else:
                # Check for canvas elements
                canvases = driver.find_elements(By.TAG_NAME, 'canvas')
                print(f"   [{(i+1)*5}s] Status: Waiting... (Canvases: {len(canvases)})")

    # Final screenshot and analysis
    print("\n[4] Taking screenshot...")
    driver.save_screenshot('/tmp/cornerstone_robust.png')
    print("   Saved: /tmp/cornerstone_robust.png")

    # Get all console logs
    print("\n[5] Console Analysis...")
    logs = driver.get_log('browser')

    # Categorize logs
    errors = []
    warnings = []
    info_logs = []

    for log in logs:
        msg = log['message']
        if log['level'] == 'SEVERE':
            errors.append(msg)
        elif log['level'] == 'WARNING':
            warnings.append(msg)
        elif any(kw in msg for kw in ['Cornerstone', 'DICOM', 'Loading', 'volume', 'viewport']):
            info_logs.append(msg)

    print(f"   Errors: {len(errors)}")
    if errors:
        for error in errors[:5]:
            if 'http' in error:
                parts = error.split('/')
                print(f"   - .../{'/'.join(parts[-3:])}")
            else:
                print(f"   - {error[:100]}")

    print(f"\n   Cornerstone Activity:")
    for info in info_logs[:15]:
        # Extract the meaningful part
        if '"' in info:
            parts = info.split('"')
            if len(parts) > 1:
                msg = parts[-2]
                if msg.strip():
                    print(f"   • {msg}")

    # Check final state
    print("\n[6] Final State:")
    canvases = driver.find_elements(By.TAG_NAME, 'canvas')
    print(f"   Canvases: {len(canvases)}")

    final_text = driver.find_element(By.TAG_NAME, 'body').text
    if 'MPR Viewer' in final_text:
        print("   ✓ MPR Viewer present")
    if 'Axial' in final_text:
        print("   ✓ Axial viewport")
    if 'Loading' in final_text:
        print("   ⏳ Still loading")

    print("\n" + "=" * 70)
    if len(canvases) >= 3:
        print("✅ SUCCESS: Cornerstone viewer with canvases rendered!")
    elif 'MPR Viewer' in final_text:
        print("⚠️  PARTIAL: Viewer UI present but canvases not created")
        print("    This suggests the viewport initialization failed.")
    else:
        print("❌ FAILED: Viewer did not load")
    print("=" * 70)

finally:
    driver.quit()
