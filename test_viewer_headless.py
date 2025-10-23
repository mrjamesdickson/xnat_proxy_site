#!/usr/bin/env python3
"""
Headless Selenium test for Cornerstone viewer
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
print("Testing Cornerstone Viewer (Headless)")
print("=" * 70)

# Headless browser configuration
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.add_argument('--disable-gpu')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
    print("\n[1/5] Loading app and waiting for login form...")
    driver.get('http://localhost:5173')

    # Wait for login form to appear
    wait = WebDriverWait(driver, 10)
    time.sleep(2)

    print("[2/5] Filling in login credentials...")
    inputs = driver.find_elements(By.TAG_NAME, 'input')

    if len(inputs) < 3:
        print(f"❌ Expected 3 inputs, found {len(inputs)}")
        driver.save_screenshot('/tmp/error_screenshot.png')
        exit(1)

    # Fill credentials
    inputs[1].clear()
    inputs[1].send_keys('admin')
    print("   ✓ Username: admin")

    inputs[2].clear()
    inputs[2].send_keys('admin')
    print("   ✓ Password: ****")

    # Click sign in button
    print("[3/5] Submitting login...")
    buttons = driver.find_elements(By.TAG_NAME, 'button')
    for button in buttons:
        if 'Sign in' in button.text:
            button.click()
            print("   ✓ Clicked Sign in")
            break

    # Wait for login to complete
    time.sleep(6)

    # Check if login succeeded
    page_text = driver.find_element(By.TAG_NAME, 'body').text

    if 'Sign in to XNAT' in page_text:
        print("   ❌ Login failed - still on login page")
        driver.save_screenshot('/tmp/login_failed.png')
        print("   Screenshot saved: /tmp/login_failed.png")

        # Check console for errors
        logs = driver.get_log('browser')
        errors = [log for log in logs if log['level'] == 'SEVERE']
        if errors:
            print("\n   Console errors:")
            for error in errors[:3]:
                print(f"   - {error['message'][:150]}")
        exit(1)
    else:
        print("   ✓ Login successful!")

    print(f"\n[4/5] Navigating to Cornerstone viewer...")
    print(f"   URL: {viewer_url}")
    driver.get(viewer_url)

    # Wait for viewer to load DICOM data
    print("   Waiting 20 seconds for DICOM data to load and render...")
    time.sleep(20)

    # Take screenshot
    driver.save_screenshot('/tmp/cornerstone_final.png')
    print("   ✓ Screenshot: /tmp/cornerstone_final.png")

    print("\n[5/5] Analyzing viewer state...")

    # Get final page text
    final_page_text = driver.find_element(By.TAG_NAME, 'body').text

    # Check for viewer elements
    viewer_found = False
    checks = {
        'MPR Viewer': False,
        'Axial': False,
        'Sagittal': False,
        'Coronal': False,
        'slices': False,
    }

    for key in checks:
        if key in final_page_text:
            checks[key] = True
            viewer_found = True

    print("\n   Viewer Elements:")
    for key, found in checks.items():
        icon = "✓" if found else "✗"
        print(f"   {icon} {key}")

    # Check console logs
    logs = driver.get_log('browser')

    # Look for Cornerstone-specific logs
    cornerstone_logs = []
    for log in logs:
        msg = log['message']
        if any(keyword in msg for keyword in ['Cornerstone', 'DICOM', 'Loading volume', 'loaded', 'Initializing']):
            # Extract just the message part
            if '"' in msg:
                parts = msg.split('"')
                if len(parts) > 1:
                    cornerstone_logs.append(parts[-2])
            else:
                cornerstone_logs.append(msg.split(' ')[-1][:80])

    if cornerstone_logs:
        print("\n   Cornerstone Activity Logs:")
        for log in cornerstone_logs[:10]:
            if log.strip():
                print(f"   • {log}")

    # Check for errors
    errors = [log for log in logs if log['level'] == 'SEVERE']
    warnings = [log for log in logs if log['level'] == 'WARNING']

    if errors:
        print(f"\n   ⚠️  Console Errors ({len(errors)}):")
        for error in errors[:5]:
            # Shorten error messages
            msg = error['message']
            if 'http' in msg:
                url_part = msg.split(' ')[-1]
                print(f"   - Failed: {url_part[:60]}...")
            else:
                print(f"   - {msg[:150]}")
    else:
        print("\n   ✓ No console errors")

    if warnings:
        print(f"\n   ⚠️  Console Warnings ({len(warnings)}):")
        for warning in warnings[:3]:
            msg = warning['message']
            print(f"   - {msg[:150]}")

    # Look for canvas elements (where DICOM images are rendered)
    canvases = driver.find_elements(By.TAG_NAME, 'canvas')
    print(f"\n   Canvas Elements: {len(canvases)}")
    if canvases:
        for i, canvas in enumerate(canvases[:3]):
            width = canvas.get_attribute('width')
            height = canvas.get_attribute('height')
            print(f"   - Canvas {i+1}: {width}x{height}")

    # Final verdict
    print("\n" + "=" * 70)
    if viewer_found and len(canvases) >= 3:
        print("✅ SUCCESS: Cornerstone viewer loaded with canvases!")
        print("   The viewer UI is present with rendering canvases.")
        print("   Check /tmp/cornerstone_final.png to verify images are displayed.")
    elif viewer_found:
        print("⚠️  PARTIAL: Viewer UI loaded but canvases not found")
        print("   Check /tmp/cornerstone_final.png for details")
    else:
        print("❌ FAILED: Viewer did not load")
        print("   Check /tmp/cornerstone_final.png for details")
    print("=" * 70)

finally:
    driver.quit()
    print("\nTest complete.")
