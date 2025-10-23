#!/usr/bin/env python3
"""
Test Cornerstone viewer with VISIBLE browser and small scan
"""
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Use small scan with only 1 DICOM file for faster testing
viewer_url = 'http://localhost:5173/experiments/XNAT_E02216/scans/100/cornerstone'

print("=" * 70)
print("Testing Cornerstone Viewer - VISIBLE BROWSER MODE")
print("Small scan: 1 DICOM file for faster loading")
print("=" * 70)

# VISIBLE browser configuration
chrome_options = Options()
# chrome_options.add_argument('--headless')  # COMMENTED OUT - browser will be visible!
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

try:
    print("\n[1/5] Loading app...")
    driver.get('http://localhost:5173')
    time.sleep(3)

    print("[2/5] Logging in...")
    inputs = driver.find_elements(By.TAG_NAME, 'input')
    inputs[1].clear()
    inputs[1].send_keys('admin')
    inputs[2].clear()
    inputs[2].send_keys('admin')

    buttons = driver.find_elements(By.TAG_NAME, 'button')
    for button in buttons:
        if 'Sign in' in button.text:
            button.click()
            print("   ✓ Clicked Sign in")
            break

    print("   Waiting for authentication (8s)...")
    time.sleep(8)

    page_text = driver.find_element(By.TAG_NAME, 'body').text
    if 'Sign in' in page_text:
        print("   ❌ Login failed")
        input("\nPress Enter to close browser...")
        exit(1)

    print("   ✓ Authenticated")

    print(f"\n[3/5] Loading Cornerstone viewer (small scan - 1 file)...")
    print(f"   URL: {viewer_url}")
    driver.get(viewer_url)

    # Wait and monitor status with longer timeout for potential slow loading
    print("   Monitoring loading status (will wait up to 90 seconds)...")

    for i in range(18):  # Check every 5 seconds for 90 seconds
        time.sleep(5)
        page_text = driver.find_element(By.TAG_NAME, 'body').text
        canvases = driver.find_elements(By.TAG_NAME, 'canvas')

        if 'Sign in' in page_text:
            print(f"   [{(i+1)*5}s] ❌ Redirected to login - session expired")
            break
        elif len(canvases) >= 3:
            print(f"   [{(i+1)*5}s] ✅ SUCCESS! Canvases created: {len(canvases)}")
            break
        elif 'Loading volume' in page_text:
            print(f"   [{(i+1)*5}s] Status: Loading volume... (Canvases: {len(canvases)})")
        elif 'MPR Viewer' in page_text:
            if 'Ready' in page_text or 'loaded' in page_text:
                print(f"   [{(i+1)*5}s] ✅ Volume loaded! (Canvases: {len(canvases)})")
                break
            else:
                print(f"   [{(i+1)*5}s] Status: Viewer ready (Canvases: {len(canvases)})")

    print("\n[4/5] Taking screenshot...")
    driver.save_screenshot('/tmp/cornerstone_visible.png')
    print("   ✓ Screenshot: /tmp/cornerstone_visible.png")

    print("\n[5/5] Analyzing results...")

    # Get console logs
    logs = driver.get_log('browser')
    errors = [log for log in logs if log['level'] == 'SEVERE']

    # Count canvases
    final_canvases = driver.find_elements(By.TAG_NAME, 'canvas')

    print(f"   Canvases found: {len(final_canvases)}")
    if final_canvases:
        for i, canvas in enumerate(final_canvases):
            width = canvas.get_attribute('width')
            height = canvas.get_attribute('height')
            print(f"   - Canvas {i+1}: {width}x{height}")

    if errors:
        print(f"\n   Console Errors: {len(errors)}")
        for error in errors[:3]:
            msg = error['message']
            if 'http' in msg:
                print(f"   - {msg.split('/')[-1][:80]}")
            else:
                print(f"   - {msg[:100]}")
    else:
        print("\n   ✓ No console errors")

    # Final verdict
    print("\n" + "=" * 70)
    if len(final_canvases) >= 3:
        print("✅ SUCCESS: Cornerstone viewer is working!")
        print("   3 canvases created and rendered")
        print("\n   You can see the viewer in the browser window.")
        print("   The browser will stay open for inspection.")
    else:
        print("⚠️  Viewer loaded but canvases not created")
        print(f"   Found {len(final_canvases)} canvases (expected 3)")
        print("\n   Browser will stay open for inspection.")
    print("=" * 70)

    # Keep browser open for manual inspection
    print("\nBrowser window will remain open for 2 minutes for inspection...")
    print("Check the viewer manually, then the browser will close automatically.")
    print("(Or press Ctrl+C to close now)")

    try:
        time.sleep(120)  # 2 minutes
    except KeyboardInterrupt:
        print("\n\nClosing browser...")

finally:
    driver.quit()
    print("Browser closed.")
