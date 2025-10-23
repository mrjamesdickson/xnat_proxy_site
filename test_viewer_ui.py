#!/usr/bin/env python3
"""
Test Cornerstone viewer by logging in through the UI
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
print("Testing Cornerstone Viewer with UI Login")
print("=" * 70)

# Launch browser with visible window (not headless) to see what happens
chrome_options = Options()
# chrome_options.add_argument('--headless')  # Commented out to see the browser
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
    print("\n[1/4] Loading app...")
    driver.get('http://localhost:5173')
    time.sleep(2)

    print("[2/4] Logging in through UI...")
    # Wait for login form
    wait = WebDriverWait(driver, 10)

    # Find input fields
    inputs = driver.find_elements(By.TAG_NAME, 'input')

    if len(inputs) >= 3:
        # Fill in credentials
        inputs[1].clear()
        inputs[1].send_keys('admin')
        inputs[2].clear()
        inputs[2].send_keys('admin')

        # Click sign in
        buttons = driver.find_elements(By.TAG_NAME, 'button')
        for button in buttons:
            if 'Sign in' in button.text:
                print("   Clicking Sign in...")
                button.click()
                break

        # Wait for login to complete
        time.sleep(5)

        # Check if logged in
        current_url = driver.current_url
        print(f"   Current URL: {current_url}")

        if current_url != 'http://localhost:5173/':
            print("   ✅ Logged in successfully!")
        else:
            page_text = driver.find_element(By.TAG_NAME, 'body').text
            if 'Sign in' not in page_text:
                print("   ✅ Logged in successfully!")
            else:
                print("   ⚠️  Still on login page")

    print(f"\n[3/4] Navigating to Cornerstone viewer...")
    print(f"   URL: {viewer_url}")
    driver.get(viewer_url)

    # Wait longer for DICOM data to load
    print("   Waiting 15 seconds for viewer to load DICOM data...")
    time.sleep(15)

    # Take screenshot
    driver.save_screenshot('/tmp/cornerstone_ui_test.png')
    print("   ✅ Screenshot: /tmp/cornerstone_ui_test.png")

    print("\n[4/4] Checking results...")

    # Get console logs
    logs = driver.get_log('browser')
    errors = [log for log in logs if log['level'] == 'SEVERE']

    # Look for Cornerstone-specific logs
    cornerstone_logs = [log for log in logs if 'Cornerstone' in log['message'] or 'Loading volume' in log['message'] or 'DICOM' in log['message']]

    if cornerstone_logs:
        print("\n📋 Cornerstone Activity:")
        for log in cornerstone_logs[:15]:
            msg = log['message'].split(' ')[-1].replace('"', '').strip()
            if msg:
                print(f"   • {msg[:100]}")

    if errors:
        print(f"\n❌ Found {len(errors)} errors:")
        for error in errors[:5]:
            short_msg = error['message'][:200]
            print(f"   • {short_msg}")
    else:
        print("\n✅ No JavaScript errors!")

    # Check page content
    page_text = driver.find_element(By.TAG_NAME, 'body').text

    print("\n📄 Page Analysis:")
    checks = {
        'MPR Viewer': '✅ MPR Viewer header found',
        'Axial': '✅ Axial viewport',
        'Sagittal': '✅ Sagittal viewport',
        'Coronal': '✅ Coronal viewport',
        'Loading volume': '⏳ Loading DICOM data...',
        'slices': '✅ Slice count displayed',
        'W/L': '✅ Window/Level controls present',
    }

    for keyword, msg in checks.items():
        if keyword in page_text:
            print(f"   {msg}")

    if 'Sign in' in page_text:
        print("   ❌ Still on login page")

    # Final summary
    print("\n" + "=" * 70)
    if 'MPR Viewer' in page_text and not errors:
        print("✅ SUCCESS: Cornerstone viewer is working!")
        print("Check the screenshot to see the rendered DICOM images")
    elif 'MPR Viewer' in page_text and errors:
        print("⚠️  Viewer loaded but with some errors")
    else:
        print("❌ Viewer did not load properly")
    print("=" * 70)

    # Keep browser open for manual inspection
    print("\n⏸  Browser will stay open for 30 seconds for inspection...")
    time.sleep(30)

finally:
    driver.quit()
    print("\nBrowser closed.")
